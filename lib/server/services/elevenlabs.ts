const MAX_TTS_CHARS = 2000;

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");
  return key;
}

function getVoiceId(): string {
  const id = process.env.ELEVENLABS_VOICE_ID;
  if (!id) throw new Error("ELEVENLABS_VOICE_ID is not configured");
  return id;
}

function getModelId(): string {
  return process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = getApiKey();
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", blob, "recording.webm");
  formData.append("model_id", "scribe_v1");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs STT failed: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim();
  if (!text) throw new Error("No speech detected");
  return text;
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = getApiKey();
  const voiceId = getVoiceId();
  const modelId = getModelId();
  const trimmed = text.trim().slice(0, MAX_TTS_CHARS);
  if (!trimmed) throw new Error("No text to synthesize");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: trimmed,
        model_id: modelId,
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${detail}`);
  }

  return response.arrayBuffer();
}
