export function isBrowserSttSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isBrowserTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognition)
  | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function listenWithBrowser(): Promise<string> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return Promise.reject(new Error("Browser speech recognition not supported"));
  }

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) finish(() => resolve(transcript));
      else finish(() => reject(new Error("No speech detected")));
    };

    recognition.onerror = (event) => {
      const message =
        event.error === "not-allowed"
          ? "Microphone access denied. Allow mic permission and try again."
          : event.error === "no-speech"
            ? "No speech detected. Try again."
            : `Speech recognition failed: ${event.error}`;
      finish(() => reject(new Error(message)));
    };

    recognition.onend = () => {
      finish(() => reject(new Error("No speech detected")));
    };

    try {
      recognition.start();
    } catch {
      finish(() =>
        reject(new Error("Could not start speech recognition. Try again."))
      );
    }
  });
}

export function speakWithBrowser(text: string): Promise<void> {
  if (!isBrowserTtsSupported()) {
    return Promise.reject(new Error("Browser speech not supported"));
  }

  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Could not play speech"));
    window.speechSynthesis.speak(utterance);
  });
}
