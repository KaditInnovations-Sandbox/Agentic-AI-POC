"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Star,
  ShoppingCart,
  Sparkles,
  ChevronLeft,
  Check,
  Package,
  ShieldCheck,
  Truck,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { fetchProductDetail } from "@/lib/api";
import { ProductDetail } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { sendMessage, setFloatingOpen } = useChat();

  const productId = Number(params.id);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetchProductDetail(productId, user?.id)
      .then((data) => setProduct(data))
      .catch((err) => console.warn("Failed to load product:", err))
      .finally(() => setLoading(false));
  }, [productId, user]);

  const handleAddToCart = async () => {
    if (!product || !product.in_stock || adding) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  };

  const handleAskAI = () => {
    if (!product) return;
    setFloatingOpen(true);
    sendMessage(
      `Please provide an expert breakdown of the pros and cons of the ${product.name} (SKU: ${product.sku}) and check if there are better alternatives for my budget.`
    );
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">Loading product specifications...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-xs text-gray-500 mb-4">The requested product could not be located in our catalog.</p>
        <Link href="/" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          &larr; Back to Catalog
        </Link>
      </div>
    );
  }

  const rawRating = product.average_rating ?? product.avg_rating;
  const ratingDisplay = typeof rawRating === "number" && !isNaN(rawRating) ? rawRating.toFixed(1) : "5.0";
  const isInStock = typeof product.in_stock === "boolean" ? product.in_stock : product.available_qty > 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Catalog</span>
        </Link>
        <span>/</span>
        <span className="text-gray-400 capitalize">{product.category_name || "Hardware"}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Overview */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Visual Presentation */}
        <div className="flex flex-col justify-between">
          <div className="w-full aspect-4/3 rounded-2xl bg-gradient-to-tr from-gray-50 to-blue-50/50 border border-gray-100 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            <div className="w-24 h-24 rounded-3xl bg-white shadow-md flex items-center justify-center text-blue-600 mb-4">
              <Package className="w-12 h-12" />
            </div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              SKU: {product.sku}
            </div>
            <div className="text-sm font-bold text-gray-700">{product.brand} Official Hardware</div>

            <div className="absolute top-4 left-4">
              <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-3 py-1 rounded-full uppercase tracking-wider">
                {product.brand}
              </span>
            </div>

            <div className="absolute top-4 right-4">
              {product.in_stock ? (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  In Stock ({product.available_qty})
                </span>
              ) : (
                <span className="text-xs font-semibold text-rose-700 bg-rose-100/80 px-3 py-1 rounded-full">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <Truck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-[11px] font-semibold text-gray-900">Fast Shipping</div>
              <div className="text-[10px] text-gray-400">2-4 Business Days</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-[11px] font-semibold text-gray-900">1 Yr Warranty</div>
              <div className="text-[10px] text-gray-400">Manufacturer Assured</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <Sparkles className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <div className="text-[11px] font-semibold text-gray-900">AI Price Guard</div>
              <div className="text-[10px] text-gray-400">15m Quoted Snapshot</div>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Purchasing */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
              <div className="flex items-center text-amber-500 font-semibold">
                <Star className="w-4 h-4 fill-amber-400 stroke-amber-400 mr-1" />
                <span>
                  {typeof (product.average_rating ?? product.avg_rating) === "number"
                    ? (product.average_rating ?? product.avg_rating)!.toFixed(1)
                    : "5.0"}
                </span>
              </div>
              <span className="text-gray-300">•</span>
              <span>{product.review_count || 0} Customer {(product.review_count || 0) === 1 ? "Review" : "Reviews"}</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400">SKU: {product.sku}</span>
            </div>

            <div className="text-3xl font-black text-gray-900 mb-4">
              ₹{product.price_inr.toLocaleString("en-IN")}
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
              {product.description}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {product.tags.map((t) => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-100">
            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-gray-700">Quantity:</span>
              <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-xs font-bold text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.available_qty, q + 1))}
                  disabled={quantity >= product.available_qty}
                  className="p-2 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-gray-400">
                ({product.available_qty} available in stock)
              </span>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!product.in_stock || adding}
                className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold shadow-md transition-all ${justAdded
                    ? "bg-emerald-600 text-white"
                    : product.in_stock
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : justAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add {quantity} to Cart</span>
                  </>
                )}
              </button>

              <button
                onClick={handleAskAI}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold border border-purple-200 hover:border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Ask AI About This</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Features Tabbed Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Technical Specifications */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Technical Specifications
          </h3>
          {Object.keys(product.specs || {}).length === 0 ? (
            <p className="text-xs text-gray-400">No specifications declared.</p>
          ) : (
            <dl className="divide-y divide-gray-100">
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="py-2.5 flex justify-between text-xs">
                  <dt className="text-gray-500 font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="text-gray-900 font-semibold text-right">
                    {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Features & Attributes */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Key Features & Capabilities
          </h3>
          {Object.keys(product.features || {}).length === 0 ? (
            <p className="text-xs text-gray-400">No features listed.</p>
          ) : (
            <dl className="divide-y divide-gray-100">
              {Object.entries(product.features).map(([key, val]) => (
                <div key={key} className="py-2.5 flex justify-between text-xs">
                  <dt className="text-gray-500 font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="text-gray-900 font-semibold text-right">
                    {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Customer Reviews</h3>
            <p className="text-xs text-gray-500">Verified buyer ratings and performance reviews</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl">
            <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
            <span>{ratingDisplay} / 5.0</span>
          </div>
        </div>

        {product.reviews.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No reviews yet for this product.</p>
        ) : (
          <div className="space-y-4">
            {product.reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-gray-900">{rev.user_name}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      Verified Purchase
                    </span>
                  </div>
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < rev.rating
                            ? "fill-amber-400 stroke-amber-400"
                            : "fill-gray-200 stroke-gray-200"
                          }`}
                      />
                    ))}
                  </div>
                </div>
                <h4 className="text-xs font-bold text-gray-800 mb-1">{rev.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{rev.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
