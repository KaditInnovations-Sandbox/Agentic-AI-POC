"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { CartResponse } from "@/lib/types";

export const ChatCartCard: React.FC<{ cart: CartResponse }> = ({ cart }) => {
  return (
    <div className="my-2 p-3.5 bg-white border border-blue-200/90 rounded-2xl shadow-2xs hover:border-blue-300 transition-all max-w-md">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
          <ShoppingBag className="w-4 h-4 text-blue-600" />
          <span>Active Shopping Cart</span>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
          {cart.total_items} {cart.total_items === 1 ? "Item" : "Items"}
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        {cart.items.slice(0, 3).map((item) => (
          <div key={item.product_id} className="flex justify-between items-center text-xs">
            <span className="text-gray-700 font-medium truncate max-w-[200px]">
              {item.name} × {item.quantity}
            </span>
            <span className="font-bold text-gray-900">
              ₹{item.line_total_inr.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
        {cart.items.length > 3 && (
          <p className="text-[10px] text-gray-400 italic">
            + {cart.items.length - 3} more items in cart
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold block leading-none">Subtotal</span>
          <span className="text-sm font-black text-gray-900">
            ₹{cart.cart_total_inr.toLocaleString("en-IN")}
          </span>
        </div>

        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
        >
          <span>View Cart</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
