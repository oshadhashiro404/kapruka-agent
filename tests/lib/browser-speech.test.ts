import { describe, expect, it } from "vitest";
import {
  isBrowserSttSupported,
  isBrowserTtsSupported,
} from "@/lib/voice/browser-speech";

describe("browser-speech", () => {
  it("reports STT unsupported in test environment", () => {
    expect(isBrowserSttSupported()).toBe(false);
  });

  it("reports TTS unsupported in test environment", () => {
    expect(isBrowserTtsSupported()).toBe(false);
  });
});
