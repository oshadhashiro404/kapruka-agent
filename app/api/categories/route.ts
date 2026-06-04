import { listCategories } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    const categories = await listCategories();
    return Response.json({ categories });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load categories";
    return Response.json({ error: message }, { status: 502 });
  }
}
