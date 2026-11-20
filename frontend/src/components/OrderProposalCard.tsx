"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Loader2, FileText, ShieldCheck } from "lucide-react";
import { approveProposal, fetchProposal } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OrderProposalEmbedded } from "@/lib/types";

interface Props {
  proposal: OrderProposalEmbedded;
  onOrderPlaced?: (orderId: number) => void;
}

const parseSecondsRemaining = (expiresAt?: string): number => {
  if (!expiresAt) return 15 * 60;
  let clean = expiresAt.trim();
  if (clean.endsWith(" UTC")) {
    clean = clean.replace(" UTC", "Z").replace(" ", "T");
  } else if (!clean.includes("Z") && !clean.includes("+") && clean.includes(" ")) {
    clean = clean.replace(" ", "T") + "Z";
  }
  const expTime = new Date(clean).getTime();
  if (isNaN(expTime)) return 15 * 60;
  const now = Date.now();
  const diff = Math.floor((expTime - now) / 1000);
  return Math.max(0, Math.min(15 * 60, diff));
};

export const OrderProposalCard: React.FC<Props> = ({ proposal, onOrderPlaced }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    proposal.status === "executed" ? "success" : "pending"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);

  // 15-minute countdown display (defaults to 15m if no expiresAt provided)
  const [secondsLeft, setSecondsLeft] = useState<number>(() => parseSecondsRemaining(proposal.expiresAt));

  useEffect(() => {
    if (proposal.status === "executed") {
      setStatus("success");
      return;
    }
    // Reconcile status with backend if available
    if (user && proposal.proposalId) {
      fetchProposal(proposal.proposalId, user.id)
        .then((p) => {
          if (p?.status === "executed") {
            setStatus("success");
          } else if (p?.status === "expired") {
            setSecondsLeft(0);
          }
        })
        .catch(() => {});
    }
  }, [proposal.proposalId, proposal.status, user]);

  useEffect(() => {
    setSecondsLeft(parseSecondsRemaining(proposal.expiresAt));
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [proposal.expiresAt]);

  const isExpired = secondsLeft <= 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedCountdown = isExpired
    ? "Expired"
    : `${mins}:${secs < 10 ? "0" : ""}${secs} remaining`;

  const handleApprove = async () => {
    if (!user || loading || status === "success" || isExpired) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await approveProposal(
        proposal.proposalId,
        {
          payment_method: "credit_card",
          idempotency_key: `prop_${proposal.proposalId}_${Date.now()}`,
        },
        user.id
      );
      setStatus("success");
      if (res.order_id) setOrderId(res.order_id);
      if (onOrderPlaced && res.order_id) onOrderPlaced(res.order_id);
    } catch (err: any) {
      const msg = err.message || "";
      if (
        msg.includes("already 'executed'") ||
        msg.includes("already been placed") ||
        msg.includes("already placed")
      ) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(msg || "Failed to confirm order.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === "success") {
    return (
      <div className="my-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm mb-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{orderId ? `Order #${orderId} Confirmed!` : "Order Confirmed & Placed!"}</span>
        </div>
        <p className="text-xs text-emerald-700 leading-relaxed mb-3">
          Your order has been placed successfully! We've reserved your items and are preparing them for shipment.
        </p>
        <Link
          href={orderId ? `/orders/${orderId}` : "/orders"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
        >
          <span>View Order & Tracking</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-white border border-blue-200/90 rounded-2xl shadow-xs hover:border-blue-400 transition-all max-w-md">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Checkout Review</span>
        </div>
        <div
          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
            isExpired
              ? "text-rose-600 bg-rose-50 border-rose-200/60"
              : "text-amber-600 bg-amber-50 border-amber-200/60"
          }`}
        >
          <Clock className={`w-3 h-3 ${isExpired ? "text-rose-500" : "text-amber-500 animate-pulse"}`} />
          <span>{isExpired ? "Price Lock Expired" : `Price Lock: ${formattedCountdown}`}</span>
        </div>
      </div>

      {/* Item Details */}
      <div className="text-xs sm:text-sm font-bold text-gray-900 mb-1">
        {proposal.productTitle}
      </div>

      <div className="flex justify-between items-baseline mb-3">
        <span className="text-xs text-gray-500 font-medium">Quantity: {proposal.quantity} unit{proposal.quantity > 1 ? "s" : ""}</span>
        <div className="text-right">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block leading-none">Quoted Total</span>
          <span className="text-base font-black text-gray-900">
            ₹{proposal.quotedPrice.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Verified Notice */}
      <div className="p-2 mb-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-1.5 text-[11px] text-gray-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <span>15-minute price lock guaranteed. Click below to confirm and place your order.</span>
      </div>

      {status === "error" && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Approval Button */}
      <button
        onClick={handleApprove}
        disabled={loading || isExpired}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Confirming & Placing Order...</span>
          </>
        ) : isExpired ? (
          <span>Price Lock Expired (Request New Quote)</span>
        ) : (
          <>
            <span>Confirm & Place Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
};
