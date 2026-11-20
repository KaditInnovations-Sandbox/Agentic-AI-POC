"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, ShoppingCart, Check, Loader2, ArrowRight, Laptop, Package } from "lucide-react";
import { ProductSummary } from "@/lib/types";
import { useCart } from "@/context/CartContext";

export const ChatProductCard: React.FC<{ product: ProductSummary }> = ({ product }) => {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.in_stock || adding) return;
    setAdding(true);
    try {
      await addItem(product.id, 1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  };

  const rawRating = product.average_rating ?? product.avg_rating;
  const ratingStr = typeof rawRating === "number" && !isNaN(rawRating) ? rawRating.toFixed(1) : "4.5";
  const reviewCount = product.review_count ?? 0;

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200/90 hover:border-purple-300 shadow-2xs hover:shadow-xs transition-all overflow-hidden p-3.5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
            {product.brand}
          </span>
          {product.in_stock ? (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              In Stock ({product.available_qty})
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              Out of Stock
            </span>
          )}
        </div>

        <Link
          href={`/products/${product.id}`}
          className="text-xs sm:text-sm font-bold text-gray-900 hover:text-purple-600 transition-colors line-clamp-1 block mb-1"
        >
          {product.name}
        </Link>

        {product.key_specs && Object.keys(product.key_specs).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(product.key_specs)
              .slice(0, 2)
              .map(([k, v]) => (
                <span
                  key={k}
                  className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100"
                >
                  {k.replace(/_/g, " ")}: {String(v)}
                </span>
              ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-3">
          <div className="flex items-center text-amber-500 font-semibold">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400 mr-0.5" />
            <span>{ratingStr}</span>
          </div>
          <span>•</span>
          <span>{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="shrink-0 min-w-0">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block leading-none">Price</span>
          <span className="text-sm font-black text-gray-900 truncate block">
            ₹{product.price_inr.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/products/${product.id}`}
            className="px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:text-purple-700 bg-gray-100 hover:bg-purple-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Details
          </Link>

          <button
            onClick={handleAddToCart}
            disabled={!product.in_stock || adding}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all whitespace-nowrap ${
              justAdded
                ? "bg-emerald-600 text-white"
                : product.in_stock
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {adding ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : justAdded ? (
              <>
                <Check className="w-3 h-3" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3 h-3" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ChatProductList: React.FC<{ products: ProductSummary[] }> = ({ products }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="my-3 space-y-2 w-full">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5 text-purple-600" />
        <span>Matching Products ({products.length})</span>
      </div>
      <div className="flex flex-col gap-2.5 w-full">
        {products.map((p) => (
          <ChatProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
};
