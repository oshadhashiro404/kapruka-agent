import type {
  CartItem,
  ChatMode,
  DeliveryQuote,
  Product,
  SseEvent,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export interface StreamChatCallbacks {
  onText: (content: string) => void;
  onProducts: (items: Product[]) => void;
  onDeliveryQuote: (quote: DeliveryQuote) => void;
  onOrderCreated: (
    payUrl: string,
    orderId: string,
    expiresIn: number
  ) => void;
  onPerishableWarning: (
    message: string,
    alternatives: Product[]
  ) => void;
  onCartUpdate: (cart: CartItem[]) => void;
  onStatus?: (message: string) => void;
  onChips?: (items: string[]) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

function dispatchEvent(event: SseEvent, callbacks: StreamChatCallbacks): void {
  switch (event.type) {
    case "text":
      callbacks.onText(event.content);
      break;
    case "products":
      callbacks.onProducts(event.items);
      break;
    case "delivery_quote":
      callbacks.onDeliveryQuote(event.quote);
      break;
    case "order_created":
      callbacks.onOrderCreated(
        event.pay_url,
        event.order_id,
        event.expires_in
      );
      break;
    case "perishable_warning":
      callbacks.onPerishableWarning(event.message, event.alternatives);
      break;
    case "cart_update":
      callbacks.onCartUpdate(event.cart);
      break;
    case "status":
      callbacks.onStatus?.(event.message);
      break;
    case "chips":
      callbacks.onChips?.(event.items);
      break;
    case "error":
      callbacks.onError(event.message);
      break;
    case "done":
      callbacks.onDone();
      break;
  }
}

function parseSseBuffer(
  buffer: string,
  callbacks: StreamChatCallbacks
): string {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const lines = part.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        const event = JSON.parse(json) as SseEvent;
        dispatchEvent(event, callbacks);
      } catch {
        // skip malformed chunks
      }
    }
  }

  return remainder;
}

/**
 * POST /api/chat with ReadableStream — parses SSE `data: {...}\n\n` frames.
 */
export async function streamChat(
  body: {
    message: string;
    session_id: string;
    cart: CartItem[];
    mode: ChatMode;
  },
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    callbacks.onError(
      "Kapruka is having a moment. Please try again."
    );
    callbacks.onDone();
    return;
  }

  if (!res.ok || !res.body) {
    callbacks.onError(
      res.status === 429
        ? "Too many requests. Let me catch my breath! Try in 30 seconds."
        : "Kapruka is having a moment. Please try again."
    );
    callbacks.onDone();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    callbacks.onDone();
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = parseSseBuffer(buffer, {
        ...callbacks,
        onDone: finish,
      });
    }
    if (buffer.trim()) {
      parseSseBuffer(`${buffer}\n\n`, {
        ...callbacks,
        onDone: finish,
      });
    }
  } finally {
    finish();
  }
}
