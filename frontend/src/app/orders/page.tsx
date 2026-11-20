"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { fetchOrders } from "@/lib/api";
import { OrderSummary } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchOrders(20, user.id)
      .then((data) => setOrders(data))
      .catch((err) => console.warn("Failed to load orders:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Placed (Eligible for Cancel)</span>
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
            <Truck className="w-3.5 h-3.5 text-amber-500" />
            <span>Shipped</span>
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Delivered</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View past orders, track shipments in real time, or manage order cancellations.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
        </span>
      </div>

      {loading ? (
        <div className="h-80 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-200/80">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <p className="text-xs text-gray-500 font-medium">Fetching customer order history...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">No Orders Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            You haven't placed any orders with this account yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Browse Products &rarr;</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">{ord.order_number}</span>
                  {getStatusBadge(ord.status)}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(ord.placed_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                  </span>
                  <span>•</span>
                  <span>
                    {(ord.item_count ?? ord.items_count ?? 1)}{" "}
                    {(ord.item_count ?? ord.items_count ?? 1) === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Total Paid</div>
                  <div className="text-base font-extrabold text-gray-900">
                    ₹{ord.total_inr.toLocaleString("en-IN")}
                  </div>
                </div>

                <Link
                  href={`/orders/${ord.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl text-xs font-bold text-gray-700 hover:text-blue-700 transition-all"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
