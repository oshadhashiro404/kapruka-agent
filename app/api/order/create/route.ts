import { z } from "zod";
import { createOrder } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  cart: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().min(1),
        variant: z.string().optional(),
      })
    )
    .min(1),
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
  }),
  delivery: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  sender: z.object({ name: z.string() }).optional(),
  gift_message: z.string().optional(),
  currency: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await createOrder(parsed.data);
    return Response.json({
      order_id: result.order_id,
      pay_url: result.pay_url,
      total_lkr: result.total_lkr,
      estimated_arrival: result.estimated_arrival,
      expires_in: 3600,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Order creation failed";
    const status = message.toLowerCase().includes("rate") ? 429 : 502;
    return Response.json({ error: message }, { status });
  }
}
