export interface Product {
  id: string;
  name: string;
  price_lkr: number;
  image_url: string;
  images: string[];
  category: string;
  in_stock: boolean;
  variants?: {
    sizes?: string[];
    colors?: string[];
    flavors?: string[];
  };
  url: string;
  is_perishable: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selected_variant?: string;
  is_gift: boolean;
  gift_message?: string;
  gift_message_sinhala?: string;
}

export interface DeliveryQuote {
  deliverable: boolean;
  city: string;
  city_code: string;
  delivery_date: string;
  delivery_cost_lkr: number;
  estimated_arrival: string;
  is_perishable: boolean;
  perishable_warning?: string;
}

export type ChatMode = "gift" | "shopping" | "auto";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  chips?: string[];
  delivery_quote?: DeliveryQuote;
  pay_url?: string;
  order_id?: string;
  expires_in?: number;
  perishable_warning?: string;
  perishable_alternatives?: Product[];
  timestamp: Date | string;
}

export type ConversationState =
  | "empty"
  | "products"
  | "delivery"
  | "ordered";

export interface SessionContext {
  lastSearchQuery?: string;
  lastProducts?: string[];
  deliveryCity?: string;
  deliveryCityCode?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  pendingDeliveryDate?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  serverContext?: SessionContext;
  createdAt: number;
}

export type SseEvent =
  | { type: "text"; content: string }
  | { type: "products"; items: Product[] }
  | { type: "cart_update"; cart: CartItem[] }
  | { type: "delivery_quote"; quote: DeliveryQuote }
  | {
      type: "order_created";
      pay_url: string;
      order_id: string;
      expires_in: number;
    }
  | {
      type: "perishable_warning";
      message: string;
      alternatives: Product[];
    }
  | { type: "status"; message: string }
  | { type: "chips"; items: string[] }
  | { type: "session_context"; context: SessionContext }
  | { type: "error"; message: string }
  | { type: "done" };

export interface KaprukaCategory {
  name: string;
  url: string;
  product_count: number;
}

export interface KaprukaCity {
  city_code: string;
  name: string;
  aliases?: string[];
}

export interface CreateOrderResult {
  order_id: string;
  pay_url: string;
  total_lkr: number;
  estimated_arrival: string;
  expires_in: number;
}

export interface OccasionTile {
  id: string;
  emoji: string;
  label: string;
  labelSinhala: string;
  message: string;
  category: string;
}

export interface OrderTracking {
  status: string;
  recipient?: string;
  items?: unknown[];
  delivery_progress?: Array<{ status: string; timestamp?: string }>;
}
