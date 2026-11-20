"use client";

import React, { useState } from "react";
import {
  Bot,
  User as UserIcon,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import { ChatMessageItem } from "@/lib/types";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { OrderProposalCard } from "@/components/OrderProposalCard";
import { SupportDraftCard } from "@/components/SupportDraftCard";
import { ChatProductList } from "./ChatProductCard";
import { ChatOrderCard } from "./ChatOrderCard";
import { ChatCartCard } from "./ChatCartCard";
import { useChat } from "@/context/ChatContext";

interface Props {
  message: ChatMessageItem;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<Props> = ({ message, isStreaming = false }) => {
  const { regenerateResponse, setMessageFeedback } = useChat();
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = message.timestamp
    ? new Date(message.timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={`group flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content Container */}
      <div className={`max-w-[95%] sm:max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {/* Message Bubble Body */}
        <div
          className={`px-4 py-3 rounded-2xl transition-all ${
            isUser
              ? "bg-blue-600 text-white rounded-tr-xs shadow-xs"
              : "bg-white text-gray-800 border border-gray-200/90 rounded-tl-xs shadow-2xs hover:border-gray-300"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{message.text}</p>
          ) : message.text ? (
            <MarkdownMessage content={message.text} isStreaming={isStreaming && !message.text} />
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-xs text-purple-700 py-1 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 shrink-0" />
              <span>{message.activeActivity || "Thinking..."}</span>
            </div>
          ) : null}
        </div>

        {/* Embedded Rich Cards */}
        {!isUser && (
          <div className="w-full space-y-2 mt-1">
            {/* Attached Products */}
            {message.products && message.products.length > 0 && (
              <ChatProductList products={message.products} />
            )}

            {/* Embedded Order Reviews / Proposals */}
            {message.proposals && message.proposals.length > 0 ? (
              <div className="space-y-3">
                {message.proposals.map((p) => (
                  <OrderProposalCard key={p.proposalId} proposal={p} />
                ))}
              </div>
            ) : message.proposal ? (
              <OrderProposalCard proposal={message.proposal} />
            ) : null}

            {/* Embedded Support Ticket Draft */}
            {message.draft && (
              <SupportDraftCard draft={message.draft} />
            )}

            {/* Attached Order Details */}
            {message.orderInfo && (
              <ChatOrderCard order={message.orderInfo} />
            )}

            {/* Attached Cart Details */}
            {message.cartSnapshot && (
              <ChatCartCard cart={message.cartSnapshot} />
            )}
          </div>
        )}

        {/* Footer: Timestamp & Action Toolbar */}
        <div className="flex items-center gap-3 px-1 mt-1 text-[11px] text-gray-400">
          {formattedTime && <span>{formattedTime}</span>}

          {!isUser && message.text && (
            <div className="flex items-center gap-1.5 transition-opacity">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>

              {/* Regenerate button */}
              <button
                onClick={() => regenerateResponse()}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Regenerate answer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>

              {/* Feedback Section */}
              {message.feedback ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{message.feedback === "up" ? "Helpful" : "Feedback noted"}</span>
                </span>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  {/* Feedback thumbs up */}
                  <button
                    onClick={() => setMessageFeedback(message.id, "up")}
                    className="p-1 rounded hover:bg-gray-100 hover:text-emerald-600 text-gray-400 transition-colors"
                    title="Helpful response"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>

                  {/* Feedback thumbs down */}
                  <button
                    onClick={() => setMessageFeedback(message.id, "down")}
                    className="p-1 rounded hover:bg-gray-100 hover:text-rose-600 text-gray-400 transition-colors"
                    title="Not helpful"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-2xs">
          <UserIcon className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
