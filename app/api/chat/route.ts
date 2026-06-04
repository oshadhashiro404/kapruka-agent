import { z } from "zod";
import { encodeSseEvent } from "@/lib/server/sse-encode";
import { runKapruwaChat, toUserFriendlyGroqError } from "@/lib/server/services/groq";
import {
  appendMessage,
  buildSessionFromRequest,
  updateCart,
} from "@/lib/server/services/session";
import type { CartItem, SseEvent } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const cartItemSchema = z.object({
  product: z.object({
    id: z.string(),
    name: z.string(),
    price_lkr: z.number(),
    image_url: z.string(),
    images: z.array(z.string()).default([]),
    category: z.string(),
    in_stock: z.boolean(),
    url: z.string(),
    is_perishable: z.boolean(),
    variants: z
      .object({
        sizes: z.array(z.string()).optional(),
        colors: z.array(z.string()).optional(),
        flavors: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  quantity: z.number().int().positive(),
  selected_variant: z.string().optional(),
  is_gift: z.boolean(),
  gift_message: z.string().optional(),
  gift_message_sinhala: z.string().optional(),
});

const chatBodySchema = z.object({
  message: z.string().min(1).max(8000),
  session_id: z.string().min(1),
  cart: z.array(cartItemSchema).optional(),
  mode: z.enum(["gift", "shopping", "auto"]).optional().default("auto"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  context: z
    .object({
      lastSearchQuery: z.string().optional(),
      lastProducts: z.array(z.string()).optional(),
      deliveryCity: z.string().optional(),
      deliveryCityCode: z.string().optional(),
      recipientName: z.string().optional(),
      recipientPhone: z.string().optional(),
      recipientAddress: z.string().optional(),
      pendingDeliveryDate: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { message, session_id, cart, mode, messages, context } = parsed.data;

  const session = buildSessionFromRequest({
    sessionId: session_id,
    mode,
    cart: cart as CartItem[] | undefined,
    messages,
    context,
  });

  if (cart && cart.length > 0) {
    updateCart(session, cart as CartItem[]);
  }

  appendMessage(session, {
    role: "user",
    content: message,
    timestamp: new Date(),
  });

  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null =
    null;

  const emit = (event: SseEvent) => {
    if (!streamController) return;
    streamController.enqueue(encoder.encode(encodeSseEvent(event)));
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;

      (async () => {
        try {
          const { reply } = await runKapruwaChat(session, message, emit);

          appendMessage(session, {
            role: "model",
            content: reply,
            timestamp: new Date(),
          });

          emit({ type: "done" });
        } catch (err) {
          const { message: errMsg } = toUserFriendlyGroqError(err);
          emit({ type: "text", content: errMsg });
          emit({ type: "session_context", context: session.context });
          emit({ type: "done" });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
