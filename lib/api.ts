import type {
  CartItem,
  ChatMode,
  ChatSession,
  CreateOrderResult,
  DeliveryQuote,
  KaprukaCategory,
  KaprukaCity,
  OrderTracking,
  Product,
} from "./types";
import { getApiBase } from "./api-base";
import type { SessionContext } from "./types";
import type { StreamChatCallbacks } from "./sse";
import { streamChat } from "./sse";

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function checkHealth(): Promise<{
  status: string;
  mcp: string;
  groq: string;
}> {
  const res = await fetch(`${getApiBase()}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("Backend offline");
  return res.json();
}

export async function getCategories(): Promise<KaprukaCategory[]> {
  const res = await fetch(`${getApiBase()}/api/categories`, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { categories: KaprukaCategory[] };
  return data.categories;
}

export async function searchProducts(params: {
  q: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ products: Product[]; cursor?: string }> {
  const res = await fetch(`${getApiBase()}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const msg = await parseError(res);
    if (res.status === 429) {
      throw new Error(
        "Too many requests. Let me catch my breath! Try in 30 seconds."
      );
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function quoteDelivery(
  city: string,
  date: string,
  productCode: string
): Promise<DeliveryQuote> {
  const res = await fetch(`${getApiBase()}/api/delivery/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, date, product_code: productCode }),
  });
  if (!res.ok) {
    const msg = await parseError(res);
    if (res.status === 404) {
      throw new Error(
        `I couldn't find that city. Did you mean one of these? Try the full name in English or Sinhala.`
      );
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { quote: DeliveryQuote };
  return data.quote;
}

export async function loadChatHistory(userId: string): Promise<{
  sessions: ChatSession[];
  activeSessionId: string;
  updated_at: number;
} | null> {
  const res = await fetch(
    `${getApiBase()}/api/users/chat-history?user_id=${encodeURIComponent(userId)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as {
    history: {
      sessions: ChatSession[];
      activeSessionId: string;
      updated_at: number;
    } | null;
  };
  return data.history;
}

export async function saveChatHistory(payload: {
  user_id: string;
  sessions: ChatSession[];
  activeSessionId: string;
  updated_at?: number;
}): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/users/chat-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function searchCities(
  query: string,
  limit = 20
): Promise<KaprukaCity[]> {
  const res = await fetch(`${getApiBase()}/api/delivery/cities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { cities: KaprukaCity[] };
  return data.cities;
}

export async function createOrder(params: {
  cart: Array<{
    product_id: string;
    quantity: number;
    variant?: string;
  }>;
  recipient: { name: string; phone: string };
  delivery: { address: string; city: string; date: string };
  sender?: { name: string };
  gift_message?: string;
  currency?: string;
}): Promise<CreateOrderResult> {
  const res = await fetch(`${getApiBase()}/api/order/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const msg = await parseError(res);
    if (res.status === 429) {
      throw new Error("Too many orders. Please wait and try again.");
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function trackOrder(
  orderNumber: string
): Promise<OrderTracking> {
  const res = await fetch(`${getApiBase()}/api/order/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_number: orderNumber }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { tracking: OrderTracking };
  return data.tracking;
}

export function chatStream(
  message: string,
  sessionId: string,
  cart: CartItem[],
  mode: ChatMode,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
  options?: {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    context?: SessionContext;
  }
): Promise<void> {
  return streamChat(
    {
      message,
      session_id: sessionId,
      cart,
      mode,
      messages: options?.messages,
      context: options?.context,
    },
    callbacks,
    signal
  );
}
