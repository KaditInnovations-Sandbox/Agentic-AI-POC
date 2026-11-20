"use client";

import React from "react";
import Link from "next/link";
import { Package, Calendar, ArrowRight, Truck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { OrderSummary } from "@/lib/types";

export const ChatOrderCard: React.FC<{ order: OrderSummary }> = ({ order }) => {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>Placed</span>
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Truck className="w-3 h-3 text-amber-500" />
            <span>Shipped</span>
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Delivered</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const itemCount = order.item_count ?? order.items_count ?? 1;

  return (
    <div className="my-2 p-3.5 bg-white border border-gray-200/90 rounded-2xl shadow-2xs hover:border-blue-300 transition-all max-w-md">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-900">{order.order_number}</span>
        </div>
        {getStatusBadge(order.status)}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <span className="text-[10px] text-gray-400 block font-medium">Placed At</span>
          <span className="font-semibold text-gray-700">
            {order.placed_at ? new Date(order.placed_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Recent"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block font-medium">Order Total</span>
          <span className="font-bold text-gray-900">
            ₹{order.total_inr.toLocaleString("en-IN")} ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </div>
      </div>

      <Link
        href={`/orders/${order.id}`}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-bold rounded-xl text-xs transition-colors border border-gray-200/70"
      >
        <span>View Order & Tracking Details</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
