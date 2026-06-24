"use client";

import { useCallback, useState } from "react";
import { transcribeAudio } from "./api";
import { useVoiceRecorder } from "./useVoiceRecorder";

export function useSpeechInput() {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recorder = useVoiceRecorder();

  const startListening = useCallback(async () => {
    await recorder.startRecording();
    setIsListening(true);
  }, [recorder]);

  const stopListening = useCallback(async (): Promise<string> => {
    if (recorder.isRecording) {
      setIsTranscribing(true);
      setIsListening(false);
      try {
        const blob = await recorder.stopRecording();
        return await transcribeAudio(blob);
      } finally {
        setIsTranscribing(false);
        setIsListening(false);
      }
    }

    throw new Error("Not listening");
  }, [recorder]);

  const cancelListening = useCallback(() => {
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
    usesBrowserStt: false,
  };
}
