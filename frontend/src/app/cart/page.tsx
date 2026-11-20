"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateItem, removeItem, itemCount } = useCart();
  const { sendMessage, setFloatingOpen } = useChat();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const handleCheckoutViaAgent = () => {
    if (!cart || cart.items.length === 0) return;
    setFloatingOpen(true);
    sendMessage("I would like to checkout my cart. Please review my items and create an order proposal.");
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your items, check inventory availability, and proceed to checkout.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
          {itemCount} {itemCount === 1 ? "Item" : "Items"}
        </span>
      </div>

      {!cart || cart.items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center shadow-xs">
          <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
            Looks like you haven't added anything to your cart yet. Explore our laptops, headphones, and accessories.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all"
          >
            <span>Explore Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.product_id}
                className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {item.brand}
                    </span>
                    <span className="text-[10px] text-gray-400">SKU: {item.sku}</span>
                  </div>
                  <Link
                    href={`/products/${item.product_id}`}
                    className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors block"
                  >
                    {item.name}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1">
                    Unit Price: ₹{item.unit_price_inr.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {/* Quantity controls */}
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <button
                      onClick={() => updateItem(item.product_id, item.quantity - 1)}
                      className="p-1.5 hover:bg-gray-200 text-gray-600 transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.product_id, item.quantity + 1)}
                      disabled={item.quantity >= item.available_qty}
                      className="p-1.5 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[90px]">
                    <div className="text-sm font-extrabold text-gray-900">
                      ₹{item.line_total_inr.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary & Checkout Box */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">
                Order Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="font-semibold text-gray-900">
                    ₹{cart.cart_total_inr.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Standard Shipping</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taxes (GST Included)</span>
                  <span className="font-semibold text-gray-900">₹0.00</span>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900">Estimated Total</span>
                  <span className="text-xl font-black text-gray-900">
                    ₹{cart.cart_total_inr.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Delivery Address Snapshot */}
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 border border-gray-100">
                <div className="flex items-center justify-between text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>Shipping Destination</span>
                </div>
                <div className="font-semibold text-gray-800">{user?.full_name}</div>
                <div className="text-gray-500 text-[11px]">
                  45 MG Road, Indiranagar, Bengaluru, KA 560038
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                onClick={handleCheckoutViaAgent}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Checkout via AI Price Snapshot</span>
              </button>

              <div className="text-center">
                <Link
                  href="/"
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                >
                  &larr; Continue Shopping
                </Link>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>15-Minute Guaranteed Price Snapshot on Proposal</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Direct Restocking on Placed Order Cancellations</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
