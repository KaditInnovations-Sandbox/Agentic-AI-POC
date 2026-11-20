"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, ShoppingCart, Sparkles, Check, Loader2 } from "lucide-react";
import { ProductSummary } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useChat } from "@/context/ChatContext";

export const ProductCard: React.FC<{ product: ProductSummary }> = ({ product }) => {
  const { addItem } = useCart();
  const { sendMessage, setFloatingOpen } = useChat();
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.in_stock || adding) return;
    setAdding(true);
    try {
      await addItem(product.id, 1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  };

  const handleAskAgent = (e: React.MouseEvent) => {
    e.preventDefault();
    setFloatingOpen(true);
    sendMessage(`Tell me about the specs and user reviews for ${product.name}`);
  };

  // Safe rating & review count resolution
  const rawRating = product.average_rating ?? product.avg_rating;
  const ratingStr = typeof rawRating === "number" && !isNaN(rawRating) ? rawRating.toFixed(1) : "4.5";
  const reviewCount = product.review_count ?? 0;

  // Safe description / key specs resolution
  const descriptionText =
    product.description ||
    (product.key_specs && Object.keys(product.key_specs).length > 0
      ? Object.entries(product.key_specs)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
          .join(" • ")
      : `${product.brand} official hardware`);

  return (
    <div className="group bg-white rounded-2xl border border-gray-200/80 hover:border-blue-400/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      <Link href={`/products/${product.id}`} className="p-5 block flex-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {product.brand}
          </span>
          {product.in_stock ? (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              In Stock ({product.available_qty})
            </span>
          ) : (
            <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-base leading-snug mb-1">
          {product.name}
        </h3>

        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{descriptionText}</p>

        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
          <div className="flex items-center text-amber-500 font-medium">
            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400 mr-1" />
            <span>{ratingStr}</span>
          </div>
          <span className="text-gray-300">•</span>
          <span>{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {product.tags?.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              #{t}
            </span>
          ))}
        </div>
      </Link>

      <div className="p-5 pt-0 border-t border-gray-100/80 mt-2 bg-gray-50/50 flex flex-col gap-2">
        <div className="flex items-baseline justify-between pt-3">
          <span className="text-xs text-gray-400 font-medium">Price</span>
          <span className="text-lg font-bold text-gray-900">
            ₹{product.price_inr.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock || adding}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              justAdded
                ? "bg-emerald-600 text-white"
                : product.in_stock
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>

          <button
            onClick={handleAskAgent}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-purple-200 hover:border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all"
            title="Ask AI shopping assistant about this product"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
