"use client";

import { useCallback, useRef, useState } from "react";
import { synthesizeSpeech } from "./api";
import { isBrowserTtsSupported, speakWithBrowser } from "./browser-speech";

export function useVoicePlayback() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [usesBrowserTts, setUsesBrowserTts] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    setIsSpeaking(false);
    setUsesBrowserTts(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const speak = useCallback(
    async (text: string) => {
      cleanup();
      const trimmed = text.trim();
      if (!trimmed) return;

      setIsSpeaking(true);
      try {
        const blob = await synthesizeSpeech(trimmed);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => cleanup();
        audio.onerror = () => cleanup();
        await audio.play();
      } catch {
        if (!isBrowserTtsSupported()) {
          cleanup();
          throw new Error(
            "Could not play speech. ElevenLabs may be unavailable — try a paid plan or use text-only mode."
          );
        }
        setUsesBrowserTts(true);
        try {
          await speakWithBrowser(trimmed);
          cleanup();
        } catch {
          cleanup();
          throw new Error("Could not play speech");
        }
      }
    },
    [cleanup]
  );

  return { isSpeaking, usesBrowserTts, speak, stopSpeaking };
}
