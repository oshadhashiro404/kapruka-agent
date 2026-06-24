"use client";

import { useCallback, useRef, useState } from "react";
import { transcribeAudio } from "./api";
import { isBrowserSttSupported, listenWithBrowser } from "./browser-speech";
import { useVoiceRecorder } from "./useVoiceRecorder";

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognition)
  | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function collectFinalTranscript(event: SpeechRecognitionEvent): string {
  let text = "";
  for (let i = event.resultIndex; i < event.results.length; i++) {
    if (event.results[i].isFinal) {
      text += event.results[i][0].transcript;
    }
  }
  return text.trim();
}

export function useSpeechInput() {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const pendingRef = useRef<{
    resolve: (text: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const recorder = useVoiceRecorder();

  const finishRecognition = useCallback(() => {
    recognitionRef.current = null;
    setIsListening(false);
    setIsTranscribing(false);

    const pending = pendingRef.current;
    pendingRef.current = null;

    const transcript = transcriptRef.current.trim();
    transcriptRef.current = "";

    if (!pending) return;

    if (transcript) pending.resolve(transcript);
    else pending.reject(new Error("No speech detected. Try again."));
  }, []);

  const startListening = useCallback(async () => {
    if (isBrowserSttSupported()) {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) throw new Error("Browser speech recognition not supported");

      transcriptRef.current = "";
      pendingRef.current = null;

      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event) => {
        const chunk = collectFinalTranscript(event);
        if (chunk) {
          transcriptRef.current = transcriptRef.current
            ? `${transcriptRef.current} ${chunk}`
            : chunk;
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "aborted") return;

        const pending = pendingRef.current;
        pendingRef.current = null;
        recognitionRef.current = null;
        transcriptRef.current = "";
        setIsListening(false);
        setIsTranscribing(false);

        if (!pending) return;

        const message =
          event.error === "not-allowed"
            ? "Microphone access denied. Allow mic permission and try again."
            : event.error === "no-speech"
              ? "No speech detected. Try again."
              : `Speech recognition failed: ${event.error}`;
        pending.reject(new Error(message));
      };

      recognition.onend = () => {
        if (!recognitionRef.current) return;
        finishRecognition();
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      return;
    }

    await recorder.startRecording();
    setIsListening(true);
  }, [recorder, finishRecognition]);

  const stopListening = useCallback(async (): Promise<string> => {
    if (recognitionRef.current) {
      setIsTranscribing(true);
      setIsListening(false);

      return new Promise<string>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        try {
          recognitionRef.current?.stop();
        } catch {
          finishRecognition();
          reject(new Error("Could not stop speech recognition"));
          return;
        }

        // Safety net if onend never fires (some browsers)
        window.setTimeout(() => {
          if (!pendingRef.current) return;
          finishRecognition();
        }, 1500);
      });
    }

    if (recorder.isRecording) {
      setIsTranscribing(true);
      setIsListening(false);
      try {
        const blob = await recorder.stopRecording();
        try {
          return await transcribeAudio(blob);
        } catch {
          return listenWithBrowser();
        }
      } finally {
        setIsTranscribing(false);
        setIsListening(false);
      }
    }

    throw new Error("Not listening");
  }, [recorder, finishRecognition]);

  const cancelListening = useCallback(() => {
    pendingRef.current = null;
    transcriptRef.current = "";

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      setIsListening(false);
      setIsTranscribing(false);
      return;
    }

    recorder.cancelRecording();
    setIsListening(false);
    setIsTranscribing(false);
  }, [recorder]);

  return {
    isListening: isListening || recorder.isRecording,
    isTranscribing,
    startListening,
    stopListening,
    cancelListening,
    usesBrowserStt: isBrowserSttSupported(),
  };
}
