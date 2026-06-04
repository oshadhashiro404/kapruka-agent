import { z } from "zod";
import { quoteDeliveryByCityName } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const quoteBodySchema = z.object({
  city: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  product_code: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = quoteBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { city, date, product_code } = parsed.data;

  try {
    const quote = await quoteDeliveryByCityName(city, date, product_code);
    return Response.json({ quote });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Delivery quote failed";
    const isCity = message.toLowerCase().includes("not found");
    return Response.json({ error: message }, { status: isCity ? 404 : 502 });
  }
}
