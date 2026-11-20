import {
  ApproveProposalResponse,
  AvailableFiltersResponse,
  CartActionResponse,
  CartResponse,
  ChatMessageItem,
  ConversationSummary,
  OrderDetailWithEligibility,
  OrderSummary,
  PaginatedProductsResponse,
  ProductDetail,
  UserProfileResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getHeaders(userId?: number | string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["x-user-id"] = String(userId);
  }
  return headers;
}

// ---------------- PRODUCTS ----------------

export async function fetchProducts(params: {
  q?: string;
  category_id?: number | null;
  brand?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  in_stock_only?: boolean;
  tag?: string | null;
  sort_by?: string;
  page?: number;
  page_size?: number;
}, userId?: number): Promise<PaginatedProductsResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category_id) query.set("category_id", String(params.category_id));
  if (params.brand) query.set("brand", params.brand);
  if (params.min_price != null) query.set("min_price", String(params.min_price));
  if (params.max_price != null) query.set("max_price", String(params.max_price));
  if (params.in_stock_only) query.set("in_stock_only", "true");
  if (params.tag) query.set("tag", params.tag);
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));

  const res = await fetch(`${API_BASE}/api/products?${query.toString()}`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function fetchFilters(categoryId?: number | null, userId?: number): Promise<AvailableFiltersResponse> {
  const query = categoryId ? `?category_id=${categoryId}` : "";
  const res = await fetch(`${API_BASE}/api/products/filters${query}`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch filters");
  return res.json();
}

export async function fetchProductDetail(productId: number, userId?: number): Promise<ProductDetail> {
  const res = await fetch(`${API_BASE}/api/products/${productId}`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Product ${productId} not found`);
  return res.json();
}

// ---------------- CART ----------------

export async function fetchCart(userId?: number): Promise<CartResponse> {
  const res = await fetch(`${API_BASE}/api/cart`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load cart");
  return res.json();
}

export async function addToCart(productId: number, quantity: number = 1, userId?: number): Promise<CartActionResponse> {
  const res = await fetch(`${API_BASE}/api/cart/items`, {
    method: "POST",
    headers: getHeaders(userId),
    body: JSON.stringify({ product_id: productId, quantity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to add item to cart");
  }
  return res.json();
}

export async function updateCartItem(productId: number, quantity: number, userId?: number): Promise<CartActionResponse> {
  const res = await fetch(`${API_BASE}/api/cart/items/${productId}`, {
    method: "PATCH",
    headers: getHeaders(userId),
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update item quantity");
  }
  return res.json();
}

export async function removeCartItem(productId: number, userId?: number): Promise<CartActionResponse> {
  const res = await fetch(`${API_BASE}/api/cart/items/${productId}`, {
    method: "DELETE",
    headers: getHeaders(userId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to remove item from cart");
  }
  return res.json();
}

// ---------------- ORDERS ----------------

export async function fetchOrders(limit: number = 20, userId?: number): Promise<OrderSummary[]> {
  const res = await fetch(`${API_BASE}/api/orders?limit=${limit}`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load order history");
  return res.json();
}

export async function fetchOrderDetail(orderId: number, userId?: number): Promise<OrderDetailWithEligibility> {
  const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Order ${orderId} not found`);
  return res.json();
}

export async function cancelOrder(orderId: number, reason: string = "User requested cancellation", userId?: number) {
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
    method: "POST",
    headers: getHeaders(userId),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to cancel order");
  }
  return res.json();
}

// ---------------- USERS & PROFILE ----------------

export async function fetchDemoUsers(): Promise<UserProfileResponse[]> {
  const res = await fetch(`${API_BASE}/api/users`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load user list");
  return res.json();
}

export async function fetchProfile(userId?: number): Promise<UserProfileResponse> {
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

// ---------------- CONVERSATIONS ----------------

export async function fetchConversations(userId?: number): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createConversation(sessionId?: string, userId?: number): Promise<ConversationSummary> {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: "POST",
    headers: getHeaders(userId),
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function fetchConversationMessages(sessionId: string, userId?: number): Promise<ChatMessageItem[]> {
  const res = await fetch(`${API_BASE}/api/conversations/${sessionId}/messages`, {
    headers: getHeaders(userId),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function deleteConversation(sessionId: string, userId?: number) {
  const res = await fetch(`${API_BASE}/api/conversations/${sessionId}`, {
    method: "DELETE",
    headers: getHeaders(userId),
  });
  return res.ok;
}

export async function sendFeedback(
  sessionId: string,
  messageId: string,
  feedback: "up" | "down",
  userId?: number
) {
  const res = await fetch(
    `${API_BASE}/api/conversations/${sessionId}/messages/${messageId}/feedback`,
    {
      method: "POST",
      headers: getHeaders(userId),
      body: JSON.stringify({ feedback }),
    }
  );
  return res.ok;
}

// ---------------- PROPOSALS & ACTIONS ----------------

export async function fetchProposal(proposalId: number, userId?: number): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/proposals/${proposalId}`, {
      headers: getHeaders(userId),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function approveProposal(
  proposalId: number,
  payload: {
    payment_method?: string;
    shipping_address?: string;
    idempotency_key?: string;
  },
  userId?: number
): Promise<ApproveProposalResponse> {
  const res = await fetch(`${API_BASE}/api/proposals/${proposalId}/approve`, {
    method: "POST",
    headers: getHeaders(userId),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to approve proposal");
  }
  return res.json();
}

export async function submitTicketDraft(draftId: string, userId?: number) {
  const res = await fetch(`${API_BASE}/api/tickets/drafts/${draftId}/submit`, {
    method: "POST",
    headers: getHeaders(userId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit ticket draft");
  }
  return res.json();
}

// ---------------- STREAM CHAT (SSE) ----------------

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_products: "Searching product catalog...",
  get_product_details: "Loading product specifications...",
  compare_products: "Comparing product specifications...",
  get_cart: "Checking your shopping cart...",
  add_to_cart: "Adding product to cart...",
  update_cart_item: "Updating cart quantity...",
  remove_cart_item: "Removing item from cart...",
  get_order_history: "Retrieving past orders...",
  get_order_details: "Checking order tracking details...",
  check_order_cancellation_eligibility: "Checking cancellation eligibility...",
  create_order_proposal: "Creating official price quote proposal...",
  get_order_proposal: "Verifying price snapshot...",
  get_support_tickets: "Fetching support tickets...",
  prepare_support_ticket_draft: "Drafting support ticket...",
  get_order_value_summary: "Calculating gross order value...",
  get_available_filters: "Checking catalog filters...",
  check_database_status: "Checking database connection...",
  get_user_profile: "Loading customer profile...",
};

export async function* streamChat(
  userId: number | string,
  sessionId: string,
  prompt: string,
  signal?: AbortSignal
): AsyncGenerator<import("./types").ChatStreamEvent, void, unknown> {
  const response = await fetch(`${API_BASE}/run_sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "x-user-id": String(userId),
    },
    signal,
    body: JSON.stringify({
      appName: "ecommerce_agent",
      userId: String(userId),
      sessionId,
      newMessage: {
        role: "user",
        parts: [{ text: prompt }],
      },
      streaming: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, "");
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          const isPartial = event.partial === true;

          // Process parts in content
          if (event.content?.parts) {
            for (const part of event.content.parts) {
              // 1. Tool Call Event (functionCall)
              const fc = part.functionCall || part.function_call;
              if (fc && fc.name) {
                const displayName =
                  TOOL_DISPLAY_NAMES[fc.name] || `${fc.name.replace(/_/g, " ")}...`;
                yield {
                  type: "tool_start",
                  toolName: fc.name,
                  displayName,
                };
              }

              // 2. Tool Response Event (functionResponse)
              const fr = part.functionResponse || part.function_response;
              if (fr && fr.name) {
                yield {
                  type: "tool_end",
                  toolName: fr.name,
                  result: fr.response || fr.output,
                };
              }

              // 3. Text output
              if (part.text) {
                if (isPartial) {
                  yield { type: "text_delta", text: part.text };
                } else {
                  yield { type: "text_replace", text: part.text };
                }
              }
            }
          }
        } catch {
          // Skip incomplete or unparseable SSE chunks
        }
      }
    }
  } finally {
    yield { type: "done" };
    reader.releaseLock();
  }
}
