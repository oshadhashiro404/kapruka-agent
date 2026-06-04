import { z } from "zod";
import { searchProducts } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const searchBodySchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  in_stock_only: z.boolean().optional(),
  sort: z.enum(["popular", "price_asc", "price_desc", "newest"]).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  cursor: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = searchBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await searchProducts(parsed.data);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Product search failed";
    const status = message.toLowerCase().includes("rate") ? 429 : 502;
    return Response.json({ error: message }, { status });
  }
}
