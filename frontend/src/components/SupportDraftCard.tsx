"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Send, Loader2, LifeBuoy } from "lucide-react";
import { submitTicketDraft } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SupportDraftEmbedded } from "@/lib/types";

interface Props {
  draft: SupportDraftEmbedded;
}

export const SupportDraftCard: React.FC<Props> = ({ draft }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [errorMsg, setErrorMsg] = useState("");
  const [ticketId, setTicketId] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!user || loading || status === "success") return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await submitTicketDraft(draft.draftId, user.id);
      setStatus("success");
      setTicketId(res.ticket_id);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to submit support draft.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "success") {
    return (
      <div className="my-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm mb-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Support Ticket #{ticketId} Submitted!</span>
        </div>
        <p className="text-xs text-emerald-700 leading-relaxed">
          Your customer ticket has been submitted successfully! Our support team has received your request and will follow up with you via email.
        </p>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-white border border-amber-200/90 rounded-2xl shadow-xs hover:border-amber-300 transition-all max-w-md">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
          <LifeBuoy className="w-3.5 h-3.5 text-amber-600" />
          <span>Support Request Preview</span>
        </div>
        <span className="text-[11px] text-gray-400 font-semibold">Ready for Review</span>
      </div>

      <div className="text-xs sm:text-sm font-bold text-gray-900 mb-1">{draft.subject}</div>
      <p className="text-xs text-gray-600 mb-3 leading-relaxed bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
        {draft.description}
      </p>

      {status === "error" && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-1.5 text-xs text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Submitting Ticket to Support Queue...</span>
          </>
        ) : (
          <>
            <span>Submit Support Ticket</span>
            <Send className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
};
