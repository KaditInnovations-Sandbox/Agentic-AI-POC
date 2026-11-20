"use client";

import React from "react";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";

export const CartDrawer: React.FC = () => {
  const { cart, isDrawerOpen, setDrawerOpen, updateItem, removeItem, itemCount } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Your Cart</h2>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!cart || cart.items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Your cart is empty</h3>
                <p className="text-xs text-gray-500 mb-4">Explore our catalog to find laptops and accessories.</p>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Start Shopping &rarr;
                </button>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.product_id}
                  className="p-3.5 border border-gray-100 rounded-xl bg-white shadow-sm flex items-start gap-3 justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-semibold text-gray-400">{item.brand}</span>
                    <h4 className="text-xs font-semibold text-gray-900 truncate">{item.name}</h4>
                    <div className="text-xs font-bold text-gray-900 mt-1">
                      ₹{item.unit_price_inr.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="text-gray-400 hover:text-rose-500 p-1 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                      <button
                        onClick={() => updateItem(item.product_id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold text-gray-800">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.available_qty}
                        className="p-1 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cart && cart.items.length > 0 && (
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500 font-medium">Subtotal</span>
                <span className="text-lg font-bold text-gray-900">
                  ₹{cart.cart_total_inr.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Taxes and shipping calculated at checkout.</p>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/cart"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center py-2.5 px-3 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 transition-colors"
                >
                  View Cart
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
