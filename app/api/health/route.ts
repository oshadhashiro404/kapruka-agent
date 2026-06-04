import { checkGroqHealth } from "@/lib/server/services/groq";
import { isMcpReady } from "@/lib/server/services/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const groqOk = await checkGroqHealth();
  const mcpOk = isMcpReady();

  return Response.json({
    status: groqOk ? "ok" : "degraded",
    mcp: mcpOk ? "connected" : "lazy",
    groq: groqOk ? "connected" : "disconnected",
    env: process.env.NODE_ENV ?? "development",
  });
}
