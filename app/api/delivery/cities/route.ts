import { z } from "zod";
import { listDeliveryCities } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
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
    const cities = await listDeliveryCities(
      parsed.data.query,
      parsed.data.limit ?? 20
    );
    return Response.json({ cities });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "City search failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
