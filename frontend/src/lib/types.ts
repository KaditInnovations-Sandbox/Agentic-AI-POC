// TypeScript Data Models matching Backend Schemas

export interface ProductSummary {
  id: number;
  sku: string;
  name: string;
  brand: string;
  category_id: number;
  category_name?: string;
  description?: string;
  price_inr: number;
  available_qty: number;
  in_stock: boolean;
  average_rating?: number | null;
  avg_rating?: number | null;
  review_count?: number;
  key_specs?: Record<string, any>;
  tags: string[];
}

export interface ReviewSummary {
  id: number;
  user_name?: string;
  rating: number;
  title: string;
  body: string;
  created_at?: string;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  features: Record<string, any>;
  specs: Record<string, any>;
  active?: boolean;
  stock_qty?: number;
  reserved_qty?: number;
  reviews: ReviewSummary[];
}

export interface FilterCategory {
  id: number;
  name: string;
  parent_id?: number | null;
  count?: number;
}

export interface PriceRange {
  min_price_inr: number;
  max_price_inr: number;
  min?: number;
  max?: number;
}

export interface AvailableFiltersResponse {
  categories: FilterCategory[];
  brands: string[];
  price_range: PriceRange;
  tags: string[];
  spec_keys?: Record<string, any>;
  feature_keys?: Record<string, any>;
  in_stock_count?: number;
}

export interface PaginatedProductsResponse {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CartItemDetail {
  product_id: number;
  sku: string;
  name: string;
  brand: string;
  unit_price_inr: number;
  quantity: number;
  line_total_inr: number;
  available_qty: number;
  in_stock: boolean;
}

export interface CartResponse {
  user_id: number;
  cart_id?: number | null;
  items: CartItemDetail[];
  total_items: number;
  cart_total_inr: number;
}

export interface CartActionResponse {
  status: string;
  message: string;
  cart?: CartResponse | null;
}

export interface OrderItemDetail {
  product_id: number;
  sku: string;
  name: string;
  product_name?: string;
  brand: string;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
}

export interface OrderSummary {
  id: number;
  order_number: string;
  user_id?: number;
  status: string;
  total_inr: number;
  item_count?: number;
  items_count?: number;
  placed_at: string;
  shipping_address?: Record<string, any> | string;
}

export interface OrderDetail {
  id: number;
  order_number: string;
  user_id?: number;
  status: string;
  total_inr: number;
  items: OrderItemDetail[];
  shipping_address: Record<string, any> | string;
  placed_at: string;
}

export interface OrderCancellationEligibility {
  order_id: number;
  order_number?: string;
  current_status: string;
  is_eligible_for_cancellation?: boolean;
  can_cancel?: boolean;
  reason: string;
  policy_explanation?: string;
}

export interface OrderDetailWithEligibility {
  order: OrderDetail;
  cancellation_eligibility: OrderCancellationEligibility;
}

export interface UserProfileResponse {
  id: number;
  full_name: string;
  email: string;
  role: string;
  preferences: Record<string, any>;
  editable: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at?: number | null;
  message_count: number;
  preview: string;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp?: number | null;
  proposal?: OrderProposalEmbedded | null;
  proposals?: OrderProposalEmbedded[] | null;
  draft?: SupportDraftEmbedded | null;
  products?: ProductSummary[] | null;
  orderInfo?: OrderSummary | null;
  cartSnapshot?: CartResponse | null;
  activeActivity?: string | null;
  feedback?: "up" | "down" | null;
}

export type ChatStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "text_replace"; text: string }
  | { type: "tool_start"; toolName: string; displayName: string }
  | { type: "tool_end"; toolName: string; result?: any }
  | { type: "done" };

export interface OrderProposalEmbedded {
  proposalId: number;
  productTitle: string;
  quantity: number;
  quotedPrice: number;
  status?: string;
  expiresAt?: string;
}

export interface SupportDraftEmbedded {
  draftId: string;
  subject: string;
  description: string;
}

export interface ApproveProposalResponse {
  success: boolean;
  order_id: number;
  proposal_id: number;
  status: string;
  total_amount: number;
  message: string;
}
