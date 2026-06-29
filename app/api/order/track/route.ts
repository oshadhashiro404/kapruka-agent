import { z } from "zod";
import { trackOrder } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const trackBodySchema = z.object({
  order_number: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = trackBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const normalizedOrderNumber = parsed.data.order_number.trim().toUpperCase();
    const tracking = await trackOrder(normalizedOrderNumber);
    return Response.json({ tracking });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not track that order";
    return Response.json({ error: message }, { status: 502 });
  }
}
