import { synthesizeSpeech } from "@/lib/server/services/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();
    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    const audio = await synthesizeSpeech(text);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Speech synthesis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
