import { z } from "zod";
import { getProduct } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  product_id: z.string().min(1),
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
    const product = await getProduct(parsed.data.product_id);
    return Response.json({ product });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Product lookup failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
