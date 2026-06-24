import { transcribeAudio } from "@/lib/server/services/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("audio");
    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "audio/webm";
    const transcript = await transcribeAudio(buffer, mimeType);

    return Response.json({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
