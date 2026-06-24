export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  const response = await fetch("/api/voice/stt", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { transcript?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Transcription failed");
  }
  if (!data.transcript) throw new Error("No speech detected");
  return data.transcript;
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Speech synthesis failed");
  }

  return response.blob();
}
