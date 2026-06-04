import { z } from "zod";
import {
  loadUserChatHistory,
  saveUserChatHistory,
  type StoredChatHistory,
} from "@/lib/server/services/chat-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.unknown()),
  serverContext: z.record(z.unknown()).optional(),
  createdAt: z.number(),
});

const saveBodySchema = z.object({
  user_id: z.string().min(1).max(128),
  sessions: z.array(sessionSchema),
  activeSessionId: z.string().min(1),
  updated_at: z.number().optional(),
});

export async function GET(req: Request): Promise<Response> {
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId?.trim()) {
    return Response.json({ error: "user_id is required" }, { status: 400 });
  }

  try {
    const history = await loadUserChatHistory(userId.trim());
    if (!history) {
      return Response.json({ history: null });
    }
    return Response.json({ history });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load chat history";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { user_id, sessions, activeSessionId, updated_at } = parsed.data;

  try {
    await saveUserChatHistory({
      user_id,
      sessions: sessions as StoredChatHistory["sessions"],
      activeSessionId,
      updated_at: updated_at ?? Date.now(),
    });
    return Response.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save chat history";
    return Response.json({ error: message }, { status: 500 });
  }
}
