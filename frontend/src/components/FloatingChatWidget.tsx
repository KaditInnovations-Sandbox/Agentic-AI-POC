"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  X,
  Send,
  ShoppingBag,
  Maximize2,
  Loader2,
  Trash2,
  Bot,
  Square,
  Plus,
} from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { MessageBubble } from "@/components/chat/MessageBubble";

export const FloatingChatWidget: React.FC = () => {
  const { user } = useAuth();
  const {
    activeSessionId,
    conversations,
    messages,
    sendMessage,
    isStreaming,
    activeActivity,
    stopGenerating,
    isFloatingOpen,
    setFloatingOpen,
    hasUnread,
    startNewConversation,
  } = useChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeSessionId);
  const conversationTitle = activeConv?.title || "Shopping Assistant";

  useEffect(() => {
    if (isFloatingOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, activeActivity, isFloatingOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const q = input;
    setInput("");
    await sendMessage(q);
  };

  const quickPrompts = [
    "Recommend a laptop under ₹60,000",
    "What's in my cart?",
    "Check status of my latest order",
  ];

  return (
    <>
      {/* Floating Toggle Bubble */}
      {!isFloatingOpen && (
        <button
          onClick={() => setFloatingOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3.5 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300"
          title="Open Shopping Assistant"
        >
          <div className="relative flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping" />
            )}
          </div>
          <span className="max-w-0 group-hover:max-w-xs group-hover:ml-2.5 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-xs font-bold tracking-wide">
            Shopping Assistant
          </span>
        </button>
      )}

      {/* Expanded Floating Window */}
      {isFloatingOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-gray-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-xs shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold leading-tight truncate">{conversationTitle}</h3>
                <p className="text-[10px] text-purple-100/90 truncate">
                  {user ? `Shopping for ${user.full_name.split(" ")[0]}` : "Online Assistant"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={startNewConversation}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Start New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <Link
                href="/chat"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Expand to Fullscreen Page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setFloatingOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
            {messages.length === 0 ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-gray-900 mb-1">
                  How can I help you today?
                </h4>
                <p className="text-[11px] text-gray-500 mb-4 px-4 leading-relaxed">
                  I can search products, compare specs, manage your cart, and help you checkout.
                </p>

                <div className="flex flex-col gap-1.5 text-left px-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                    Suggested prompts
                  </span>
                  {quickPrompts.map((qp) => (
                    <button
                      key={qp}
                      onClick={() => sendMessage(qp)}
                      className="text-left text-xs bg-white hover:bg-purple-50 hover:border-purple-200 border border-gray-200/80 text-gray-700 p-2.5 rounded-xl transition-all shadow-2xs"
                    >
                      {qp} &rarr;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isStreaming={isStreaming && idx === messages.length - 1}
                />
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Activity Banner if streaming */}
          {isStreaming && (
            <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-500 font-medium truncate pr-2">
                {activeActivity || "Generating response..."}
              </span>
              <button
                onClick={stopGenerating}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold shadow-2xs transition-colors shrink-0"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}

          {/* Footer Input Bar & AI Disclaimer */}
          <div className="border-t border-gray-100 bg-white shrink-0">
            <form
              onSubmit={handleSubmit}
              className="p-3 pb-1 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products, orders, cart..."
                disabled={isStreaming}
                className="flex-1 text-xs bg-gray-100/80 focus:bg-white text-gray-900 px-3.5 py-2.5 rounded-xl border border-transparent focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-40 transition-colors shadow-2xs shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[10px] text-center text-gray-400 px-3 pb-2 pt-0.5 leading-tight">
              AI can make mistakes. Verify product and order details before purchasing.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
