import type {
  CartItem,
  ChatMode,
  DeliveryQuote,
  KaprukaCategory,
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
