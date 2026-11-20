"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  Truck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cancelOrder, fetchOrderDetail } from "@/lib/api";
import { OrderDetailWithEligibility } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { sendMessage, setFloatingOpen } = useChat();

  const orderId = Number(params.id);

  const [data, setData] = useState<OrderDetailWithEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("");
  const [cancelErrorMsg, setCancelErrorMsg] = useState("");

  const loadOrder = () => {
    if (!orderId || !user) return;
    setLoading(true);
    fetchOrderDetail(orderId, user.id)
      .then((res) => setData(res))
      .catch((err) => console.warn("Failed to load order:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [orderId, user]);

  const handleCancelOrder = async () => {
    if (!orderId || !user || cancelling) return;
    if (!confirm("Are you sure you want to cancel this order? Items will be restocked immediately.")) {
      return;
    }

    setCancelling(true);
    setCancelErrorMsg("");
    setCancelSuccessMsg("");

    try {
      const res = await cancelOrder(orderId, "Customer requested cancellation from UI", user.id);
      setCancelSuccessMsg(res.message || "Order cancelled successfully.");
      loadOrder();
    } catch (err: any) {
      setCancelErrorMsg(err.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  const handleAskAgentAboutOrder = () => {
    if (!data) return;
    setFloatingOpen(true);
    sendMessage(`Can you give me the status and tracking details for my order #${data.order.order_number}?`);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
        <p className="text-xs text-gray-500 font-medium">Fetching order #{orderId} details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
        <h2 className="text-base font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-xs text-gray-500 mb-4">
          This order does not exist or does not belong to your account.
        </p>
        <Link href="/orders" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          &larr; Back to My Orders
        </Link>
      </div>
    );
  }

  const { order, cancellation_eligibility } = data;

  const timelineSteps = ["placed", "packed", "shipped", "delivered"];
  const currentStepIdx = timelineSteps.indexOf(order.status.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/orders" className="hover:text-blue-600 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>My Orders</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold">{order.order_number}</span>
      </div>

      {/* Order Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Order {order.order_number}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                order.status === "delivered"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : order.status === "cancelled"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : order.status === "shipped"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {order.status}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Placed on {new Date(order.placed_at).toLocaleDateString("en-IN", { dateStyle: "full" })}</span>
          </div>
        </div>

        <button
          onClick={handleAskAgentAboutOrder}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold text-purple-700 transition-all shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Ask AI About Tracking</span>
        </button>
      </div>

      {/* Progress Timeline (if not cancelled) */}
      {order.status !== "cancelled" ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">
            Delivery Timeline
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center relative">
            {timelineSteps.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all ${
                      isPast
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "bg-gray-100 text-gray-400"
                    } ${isCurrent ? "ring-4 ring-blue-100" : ""}`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold capitalize ${
                      isPast ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs text-rose-700">
            <span className="font-bold">This order has been cancelled.</span> Inventory has been returned to stock.
          </div>
        </div>
      )}

      {/* Order Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Items List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">
            Line Items ({order.items.length})
          </h3>

          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.product_id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-600">{item.brand}</div>
                  <Link
                    href={`/products/${item.product_id}`}
                    className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {item.name || item.product_name}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Unit: ₹{item.unit_price_inr.toLocaleString("en-IN")} × {item.quantity}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-gray-900">
                    ₹{item.line_total_inr.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between items-baseline">
            <span className="text-xs font-semibold text-gray-500">Gross Total Amount</span>
            <span className="text-xl font-black text-gray-900">
              ₹{order.total_inr.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Sidebar: Shipping & Cancellation Policy */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Delivery Address</span>
            </div>
            <div className="text-xs text-gray-800 leading-relaxed font-medium">
              {typeof order.shipping_address === "object" ? (
                <>
                  <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                  <p>{order.shipping_address.country}</p>
                </>
              ) : (
                <p>{String(order.shipping_address)}</p>
              )}
            </div>
          </div>

          {/* Cancellation Policy & Action */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Order Cancellation
            </h3>

            {cancelSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cancelSuccessMsg}</span>
              </div>
            )}

            {cancelErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cancelErrorMsg}</span>
              </div>
            )}

            {(cancellation_eligibility.is_eligible_for_cancellation ?? cancellation_eligibility.can_cancel) ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 leading-relaxed">
                  This order is currently in <strong className="text-blue-700">placed</strong> status and can be cancelled immediately. All reserved stock will be automatically returned to the inventory catalog.
                </p>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling Order...</span>
                    </>
                  ) : (
                    <span>Cancel Order #{order.order_number}</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 leading-relaxed space-y-1">
                <p className="font-semibold text-gray-700">Cannot Be Cancelled</p>
                <p>{cancellation_eligibility.reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
