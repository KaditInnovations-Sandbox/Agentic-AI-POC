"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import {
  createConversation,
  deleteConversation,
  fetchConversationMessages,
  fetchConversations,
  sendFeedback,
  streamChat,
} from "@/lib/api";
import {
  ChatMessageItem,
  ConversationSummary,
  OrderProposalEmbedded,
  ProductSummary,
  SupportDraftEmbedded,
} from "@/lib/types";

interface ChatContextType {
  activeSessionId: string;
  conversations: ConversationSummary[];
  messages: ChatMessageItem[];
  isStreaming: boolean;
  activeActivity: string | null;
  isFloatingOpen: boolean;
  hasUnread: boolean;
  setFloatingOpen: (open: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  stopGenerating: () => void;
  regenerateResponse: (userMessageId?: string) => Promise<void>;
  setMessageFeedback: (messageId: string, feedback: "up" | "down" | null) => void;
  selectConversation: (sessionId: string) => Promise<void>;
  startNewConversation: () => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  activeSessionId: "",
  conversations: [],
  messages: [],
  isStreaming: false,
  activeActivity: null,
  isFloatingOpen: false,
  hasUnread: false,
  setFloatingOpen: () => {},
  sendMessage: async () => {},
  stopGenerating: () => {},
  regenerateResponse: async () => {},
  setMessageFeedback: () => {},
  selectConversation: async () => {},
  startNewConversation: async () => "",
  deleteSession: async () => {},
  refreshConversations: async () => {},
});

// Helper: parse proposal or draft references inside text (used for reloaded past history)
function extractEmbeddedEntities(text: string): {
  proposal?: OrderProposalEmbedded | null;
  proposals?: OrderProposalEmbedded[] | null;
  draft?: SupportDraftEmbedded | null;
} {
  const proposals: OrderProposalEmbedded[] = [];
  const isExecuted =
    text.toLowerCase().includes("confirmed") ||
    text.toLowerCase().includes("executed") ||
    text.toLowerCase().includes("order #");

  const propRegex = /(?:\[Proposal ID:\s*(\d+)\]|Proposal\s*#(\d+)|proposal\s*ID\s*[:#]?\s*(\d+)|proposal\s*(\d+))/gi;
  let match;
  while ((match = propRegex.exec(text)) !== null) {
    const idStr = match[1] || match[2] || match[3] || match[4];
    if (idStr) {
      const pId = parseInt(idStr, 10);
      if (!proposals.some((p) => p.proposalId === pId)) {
        proposals.push({
          proposalId: pId,
          productTitle: "Reserved Product",
          quantity: 1,
          quotedPrice: 54990,
          status: isExecuted ? "executed" : "pending",
        });
      }
    }
  }

  // Check for DFT-XXXXX
  let draft: SupportDraftEmbedded | null = null;
  const draftMatch = text.match(/\b(DFT-[A-Z0-9]+)\b/i);
  if (draftMatch) {
    draft = {
      draftId: draftMatch[1],
      subject: "Support Request Preview",
      description: text.slice(0, 150) + "...",
    };
  }

  return {
    proposal: proposals.length > 0 ? proposals[0] : null,
    proposals: proposals.length > 0 ? proposals : null,
    draft,
  };
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeActivity, setActiveActivity] = useState<string | null>(null);
  const [isFloatingOpen, setFloatingOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Refresh conversation list
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convs = await fetchConversations(user.id);
      setConversations(convs);
    } catch (err) {
      console.warn("Failed to fetch conversations:", err);
    }
  }, [user]);

  // Load conversation messages
  const selectConversation = useCallback(
    async (sessionId: string) => {
      if (!user || !sessionId) return;
      setActiveSessionId(sessionId);
      localStorage.setItem("active_chat_session_id", sessionId);

      try {
        const msgs = await fetchConversationMessages(sessionId, user.id);
        const enriched = msgs.map((m) => {
          const { proposal, proposals, draft } = extractEmbeddedEntities(m.text);
          return { ...m, proposal, proposals, draft };
        });
        setMessages(enriched);
      } catch (err) {
        console.warn("Failed to load session messages:", err);
      }
    },
    [user]
  );

  // Initialize or resume conversation session
  useEffect(() => {
    if (!user) return;
    refreshConversations();

    const savedSid = localStorage.getItem("active_chat_session_id");
    if (savedSid) {
      selectConversation(savedSid);
    } else {
      const defaultSid = `sess_${user.id}_${Date.now().toString(36)}`;
      createConversation(defaultSid, user.id)
        .then(() => {
          setActiveSessionId(defaultSid);
          localStorage.setItem("active_chat_session_id", defaultSid);
        })
        .catch(() => {});
    }
  }, [user, refreshConversations, selectConversation]);

  // Start new conversation
  const startNewConversation = async (): Promise<string> => {
    if (!user) return "";
    const newSid = `sess_${user.id}_${Date.now().toString(36)}`;
    await createConversation(newSid, user.id);
    setActiveSessionId(newSid);
    localStorage.setItem("active_chat_session_id", newSid);
    setMessages([]);
    await refreshConversations();
    return newSid;
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    if (!user) return;
    await deleteConversation(sessionId, user.id);
    await refreshConversations();
    if (activeSessionId === sessionId) {
      await startNewConversation();
    }
  };

  // Stop generation action
  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setActiveActivity(null);
    setMessages((prev) => prev.map((m) => ({ ...m, activeActivity: null })));
  };

  // Message feedback
  const setMessageFeedback = (messageId: string, feedback: "up" | "down" | null) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
    if (feedback && activeSessionId && user) {
      sendFeedback(activeSessionId, messageId, feedback, user.id).catch(() => {});
    }
  };

  // Send message and stream response
  const sendMessage = async (text: string) => {
    if (!user || !text.trim() || isStreaming) return;

    let sid = activeSessionId;
    if (!sid) {
      sid = await startNewConversation();
    }

    const userMsg: ChatMessageItem = {
      id: `user_${Date.now()}`,
      role: "user",
      text: text.trim(),
      timestamp: Date.now() / 1000,
    };

    const modelMsgId = `model_${Date.now()}`;
    const placeholderMsg: ChatMessageItem = {
      id: modelMsgId,
      role: "model",
      text: "",
      timestamp: Date.now() / 1000,
      activeActivity: "Consulting shopping advisor...",
    };

    setMessages((prev) => [...prev, userMsg, placeholderMsg]);
    setIsStreaming(true);
    setActiveActivity("Consulting shopping advisor...");

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      let accumulatedText = "";
      let capturedProducts: ProductSummary[] | null = null;
      let capturedProposal: OrderProposalEmbedded | null = null;
      let capturedProposals: OrderProposalEmbedded[] = [];
      let capturedDraft: SupportDraftEmbedded | null = null;
      let capturedOrder: any = null;
      let capturedCart: any = null;

      for await (const event of streamChat(user.id, sid, text, abortCtrl.signal)) {
        if (event.type === "tool_start") {
          setActiveActivity(event.displayName);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId ? { ...m, activeActivity: event.displayName } : m
            )
          );
        } else if (event.type === "tool_end") {
          setActiveActivity(null);
          const toolRes = event.result;
          const data = toolRes?.data || toolRes;

          // Check if structured products returned
          if (event.toolName === "search_products") {
            const list = data?.products || (Array.isArray(data) ? data : null);
            if (list && Array.isArray(list) && list.length > 0) {
              capturedProducts = list.slice(0, 4);
            }
          } else if (event.toolName === "get_product_details" && data?.id) {
            capturedProducts = [data];
          } else if (
            (event.toolName === "create_order_proposal" || event.toolName === "update_order_proposal") &&
            data?.id
          ) {
            const propItem: OrderProposalEmbedded = {
              proposalId: data.id,
              productTitle: data.product_name || "Quoted Hardware",
              quantity: data.quantity || 1,
              quotedPrice: data.quoted_unit_price_inr || data.total_estimated_inr || 54990,
              expiresAt: data.expires_at,
              status: data.status || "pending",
            };
            const existingIdx = capturedProposals.findIndex((p) => p.proposalId === data.id);
            if (existingIdx >= 0) {
              capturedProposals[existingIdx] = propItem;
            } else {
              capturedProposals.push(propItem);
            }
            capturedProposal = propItem;
          } else if (event.toolName === "cancel_order_proposal") {
            capturedProposal = null;
            capturedProposals = [];
          } else if (
            (event.toolName === "prepare_support_ticket_draft" ||
              event.toolName === "update_support_ticket_draft") &&
            data?.draft_id
          ) {
            capturedDraft = {
              draftId: data.draft_id,
              subject: data.subject || "Customer Support Issue",
              description: data.description || "",
            };
          } else if (event.toolName === "cancel_support_ticket_draft") {
            capturedDraft = null;
          } else if (event.toolName === "get_order_details" && data?.id) {
            capturedOrder = data;
          } else if (event.toolName === "get_cart" && data?.items) {
            capturedCart = data;
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
                ? {
                    ...m,
                    activeActivity: null,
                    products: capturedProducts ?? m.products,
                    proposal: capturedProposal ?? m.proposal,
                    proposals: capturedProposals.length > 0 ? capturedProposals : m.proposals,
                    draft: capturedDraft ?? m.draft,
                    orderInfo: capturedOrder ?? m.orderInfo,
                    cartSnapshot: capturedCart ?? m.cartSnapshot,
                  }
                : m
            )
          );
        } else if (event.type === "text_delta") {
          accumulatedText += event.text;
          const { proposal, proposals, draft } = extractEmbeddedEntities(accumulatedText);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
                ? {
                    ...m,
                    text: accumulatedText,
                    activeActivity: null,
                    proposal: capturedProposal ?? proposal ?? m.proposal,
                    proposals:
                      capturedProposals.length > 0
                        ? capturedProposals
                        : proposals ?? m.proposals,
                    draft: capturedDraft ?? draft ?? m.draft,
                  }
                : m
            )
          );
        } else if (event.type === "text_replace") {
          // Authoritative final turn text from ADK
          accumulatedText = event.text;
          const { proposal, proposals, draft } = extractEmbeddedEntities(accumulatedText);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
                ? {
                    ...m,
                    text: accumulatedText,
                    activeActivity: null,
                    proposal: capturedProposal ?? proposal ?? m.proposal,
                    proposals:
                      capturedProposals.length > 0
                        ? capturedProposals
                        : proposals ?? m.proposals,
                    draft: capturedDraft ?? draft ?? m.draft,
                  }
                : m
            )
          );
        } else if (event.type === "done") {
          setActiveActivity(null);
          setMessages((prev) =>
            prev.map((m) => (m.id === modelMsgId ? { ...m, activeActivity: null } : m))
          );
        }
      }

      if (!isFloatingOpen) {
        setHasUnread(true);
      }
      await refreshConversations();
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat stream aborted by user.");
      } else {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? {
                  ...m,
                  text:
                    m.text ||
                    "I encountered an error communicating with the agent server. Please ensure the backend is running.",
                  activeActivity: null,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setActiveActivity(null);
      abortControllerRef.current = null;
      setMessages((prev) =>
        prev.map((m) => (m.id === modelMsgId ? { ...m, activeActivity: null } : m))
      );
    }
  };

  // Regenerate last response
  const regenerateResponse = async (userMessageId?: string) => {
    if (isStreaming || messages.length === 0) return;

    let targetIndex = -1;
    if (userMessageId) {
      targetIndex = messages.findIndex((m) => m.id === userMessageId);
    } else {
      // Find last user message
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) return;
    const promptText = messages[targetIndex].text;

    // Prune messages from that point onward
    setMessages((prev) => prev.slice(0, targetIndex));
    await sendMessage(promptText);
  };

  return (
    <ChatContext.Provider
      value={{
        activeSessionId,
        conversations,
        messages,
        isStreaming,
        activeActivity,
        isFloatingOpen,
        hasUnread,
        setFloatingOpen: (open) => {
          setFloatingOpen(open);
          if (open) setHasUnread(false);
        },
        sendMessage,
        stopGenerating,
        regenerateResponse,
        setMessageFeedback,
        selectConversation,
        startNewConversation,
        deleteSession,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
