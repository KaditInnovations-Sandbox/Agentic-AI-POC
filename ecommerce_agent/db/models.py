"""SQLAlchemy 2.x declarative models for the ecommerce_poc database schema."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

SCHEMA = "ecommerce_poc"


class Base(DeclarativeBase):
    """Base declarative class for all models."""
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('customer', 'admin')", name="check_user_role"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, default="customer", nullable=False)
    preferences: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    carts: Mapped[list["Cart"]] = relationship("Cart", back_populates="user")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="user")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="user")
    support_tickets: Mapped[list["SupportTicket"]] = relationship("SupportTicket", back_populates="user")
    order_proposals: Mapped[list["OrderProposal"]] = relationship("OrderProposal", back_populates="user")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.categories.id"), nullable=True)

    parent: Mapped["Category | None"] = relationship("Category", remote_side=[id], backref="children")
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price_inr >= 0", name="check_product_price_positive"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.categories.id"), nullable=False)
    sku: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    brand: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    features: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    specs: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    category: Mapped["Category"] = relationship("Category", back_populates="products")
    inventory: Mapped["Inventory | None"] = relationship("Inventory", back_populates="product", uselist=False)
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="product")


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        CheckConstraint("stock_qty >= 0", name="check_stock_qty_positive"),
        CheckConstraint("reserved_qty >= 0", name="check_reserved_qty_positive"),
        CheckConstraint("reorder_threshold >= 0", name="check_reorder_threshold_positive"),
        CheckConstraint("reserved_qty <= stock_qty", name="check_reserved_lte_stock"),
        {"schema": SCHEMA},
    )

    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.products.id"), primary_key=True)
    stock_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reorder_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="inventory")

    @property
    def available_qty(self) -> int:
        return max(0, self.stock_qty - self.reserved_qty)


class Cart(Base):
    __tablename__ = "carts"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.users.id"), unique=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="carts")
    items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_cart_item_quantity_positive"),
        {"schema": SCHEMA},
    )

    cart_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.carts.id", ondelete="CASCADE"), primary_key=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.products.id"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    cart: Mapped["Cart"] = relationship("Cart", back_populates="items")
    product: Mapped["Product"] = relationship("Product")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('placed', 'packed', 'shipped', 'delivered', 'cancelled')",
            name="check_order_status_valid",
        ),
        CheckConstraint("total_inr >= 0", name="check_order_total_positive"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.users.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    total_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    shipping_address: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    placed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    support_tickets: Mapped[list["SupportTicket"]] = relationship("SupportTicket", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_order_item_quantity_positive"),
        CheckConstraint("unit_price_inr >= 0", name="check_order_item_price_positive"),
        UniqueConstraint("order_id", "product_id", name="uq_order_item_product"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="check_review_rating_range"),
        UniqueConstraint("product_id", "user_id", name="uq_review_product_user"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.products.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.users.id"), nullable=False)
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="reviews")
    user: Mapped["User"] = relationship("User", back_populates="reviews")


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'in_progress', 'resolved', 'closed')",
            name="check_ticket_status_valid",
        ),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ticket_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.users.id"), nullable=False)
    order_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.orders.id"), nullable=True)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="open", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="support_tickets")
    order: Mapped["Order | None"] = relationship("Order", back_populates="support_tickets")


class OrderProposal(Base):
    __tablename__ = "order_proposals"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_proposal_qty_positive"),
        CheckConstraint("quoted_unit_price_inr >= 0", name="check_proposal_price_positive"),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'expired', 'executed', 'failed')",
            name="check_proposal_status_valid",
        ),
        CheckConstraint("expires_at > created_at", name="check_proposal_expires_after_created"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.users.id"), nullable=False)
    adk_session_id: Mapped[str] = mapped_column(Text, nullable=False)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey(f"{SCHEMA}.products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    quoted_unit_price_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(Text, default="pending", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="order_proposals")
    product: Mapped["Product"] = relationship("Product")
