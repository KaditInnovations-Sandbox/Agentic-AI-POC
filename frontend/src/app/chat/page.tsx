"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Loader2,
  Bot,
  Square,
  Search,
  Menu,
  X,
  Compass,
  ShoppingBag,
  LifeBuoy,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { MessageBubble } from "@/components/chat/MessageBubble";

export default function ChatPage() {
  const { user } = useAuth();
  const {
    activeSessionId,
    conversations,
    messages,
    isStreaming,
    activeActivity,
    sendMessage,
    stopGenerating,
    selectConversation,
    startNewConversation,
    deleteSession,
  } = useChat();

  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeConv = conversations.find((c) => c.id === activeSessionId);
  const conversationTitle = activeConv?.title || "Shopping Assistant";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollLockedRef = useRef(false);

  // Handle scroll detection so we don't fight user scrolling up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAutoScrollLockedRef.current = !isAtBottom;
  };

  useEffect(() => {
    if (!isAutoScrollLockedRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, activeActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput("");
    isAutoScrollLockedRef.current = false;
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const promptCategories = [
    {
      category: "Product Discovery",
      icon: <Compass className="w-4 h-4 text-purple-600" />,
      prompts: [
        "Recommend a Dell laptop for coding under ₹60,000",
        "Compare Dell Inspiron 14 with Lenovo Yoga Slim",
      ],
    },
    {
      category: "Cart & Purchasing",
      icon: <ShoppingBag className="w-4 h-4 text-blue-600" />,
      prompts: [
        "What items are currently in my shopping cart?",
        "Help me buy product #101",
      ],
    },
    {
      category: "Customer Support",
      icon: <LifeBuoy className="w-4 h-4 text-emerald-600" />,
      prompts: [
        "Check if order ORD-1001 is eligible for cancellation",
        "Prepare a support draft regarding delay in delivery",
      ],
    },
  ];

  return (
    <div className="h-[calc(100vh-8.5rem)] flex bg-white rounded-3xl border border-gray-200/90 shadow-xs overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
        />
      )}

      {/* Left Sidebar: Session List */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-50/80 border-r border-gray-200/90 flex flex-col transition-all duration-300 sm:static shrink-0 ${
          sidebarOpen
            ? "translate-x-0 sm:w-80 sm:opacity-100"
            : "-translate-x-full sm:w-0 sm:border-r-0 sm:overflow-hidden sm:opacity-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200/80 flex items-center justify-between min-w-[280px]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-600" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Conversations
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                startNewConversation();
              }}
              className="flex items-center gap-1 bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-200 text-purple-700 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-2xs transition-all"
              title="Start a new chat session"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4 hidden sm:block" />
              <X className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>

        {/* Conversation Search Bar */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chat sessions..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              {searchTerm ? "No matching sessions found." : "No saved conversations yet."}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeSessionId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    selectConversation(c.id);
                    setSidebarOpen(false);
                  }}
                  className={`group flex items-center justify-between p-3 rounded-2xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? "bg-white text-gray-900 font-bold shadow-2xs border border-gray-200/90"
                      : "text-gray-600 hover:bg-white/80 hover:text-gray-900"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="truncate text-xs">{c.title || "New Conversation"}</p>
                    {c.updated_at && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(c.updated_at * 1000).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Authenticated Customer Footer */}
        <div className="p-3 border-t border-gray-200/80 bg-white/70 text-xs text-gray-500">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user ? user.full_name.charAt(0) : "U"}
            </div>
            <div className="truncate flex-1">
              <span className="font-bold text-gray-800 block text-xs truncate">
                {user?.full_name}
              </span>
              <span className="text-[10px] text-gray-400">Customer ID #{user?.id}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat View */}
      <section className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
              title={sidebarOpen ? "Hide conversation sidebar" : "Show conversation sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5 hidden sm:block" />
              ) : (
                <PanelLeftOpen className="w-5 h-5 hidden sm:block" />
              )}
              <Menu className="w-5 h-5 sm:hidden" />
            </button>

            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
                  {conversationTitle}
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 truncate">
                {activeActivity ? (
                  <span className="text-purple-600 font-semibold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {activeActivity}
                  </span>
                ) : (
                  <span>{user ? `Shopping for ${user.full_name}` : "Online Assistant"}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Assistant
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/40"
        >
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-10 text-center">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <Bot className="w-7 h-7" />
              </div>

              <h3 className="text-base font-extrabold text-gray-900 mb-1">
                How can I assist your shopping today?
              </h3>
              <p className="text-xs text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                I can search products, compare technical specifications, check real-time stock, manage your cart, and help you checkout.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                {promptCategories.map((cat) => (
                  <div key={cat.category} className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      {cat.icon}
                      <span>{cat.category}</span>
                    </div>
                    <div className="space-y-1.5">
                      {cat.prompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => sendMessage(p)}
                          className="w-full text-left p-2 rounded-xl bg-gray-50/70 hover:bg-purple-50 text-[11px] text-gray-700 hover:text-purple-700 font-medium transition-colors border border-gray-100 block group"
                        >
                          <span className="line-clamp-2">{p}</span>
                        </button>
                      ))}
                    </div>
                  </div>
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

        {/* Input Bar & Controls */}
        <div className="p-3.5 sm:p-4 border-t border-gray-100 bg-white shrink-0">
          {isStreaming && (
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-xs">
              <span className="font-medium text-xs text-gray-500 truncate pr-2">
                {activeActivity || "Generating response..."}
              </span>
              <button
                onClick={stopGenerating}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 text-xs font-semibold transition-colors shrink-0"
                title="Stop generation"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products, compare specs, check orders, or request a quote (Enter to send, Shift+Enter for newline)..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 resize-none max-h-32 text-xs sm:text-sm bg-gray-100/80 focus:bg-white text-gray-900 px-4 py-3 rounded-2xl border border-transparent focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl disabled:opacity-40 transition-colors shadow-sm shrink-0"
              title="Send prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-center text-gray-400 mt-2">
            AI can make mistakes. Verify product and order details before purchasing.
          </p>
        </div>
      </section>
    </div>
  );
}
