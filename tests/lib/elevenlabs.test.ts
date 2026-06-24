import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("elevenlabs service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("throws when API key is missing for TTS", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
    const { synthesizeSpeech } = await import(
      "@/lib/server/services/elevenlabs"
    );
    await expect(synthesizeSpeech("hello")).rejects.toThrow(
      "ELEVENLABS_API_KEY"
    );
  });

  it("returns transcript from STT response", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ text: "show me flowers" }), {
        status: 200,
      })
    );
    const { transcribeAudio } = await import(
      "@/lib/server/services/elevenlabs"
    );
    const text = await transcribeAudio(Buffer.from("audio"), "audio/webm");
    expect(text).toBe("show me flowers");
  });
});
