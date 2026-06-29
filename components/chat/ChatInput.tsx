"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { useCartStore } from "@/lib/cart-store";
import type { ConversationState } from "@/lib/types";

const CHIPS_BY_STATE: Record<
  ConversationState,
  { en: string; emoji: string; msg: string }[]
> = {
  empty: [
    { emoji: "🎁", en: "Birthday gift", msg: "I want a birthday gift" },
    { emoji: "🌸", en: "Flowers", msg: "Show me flowers" },
  ],
  products: [
    { emoji: "➕", en: "Add first one", msg: "Add the first one to my cart" },
    { emoji: "🔍", en: "See more", msg: "Show me more options" },
    { emoji: "🚚", en: "Check delivery", msg: "Can you check delivery for these?" },
    { emoji: "🛒", en: "Checkout", msg: "I'd like to checkout" },
  ],
  delivery: [
    { emoji: "✓", en: "Confirm", msg: "Yes, please proceed with checkout" },
    { emoji: "📅", en: "Change date", msg: "I need a different delivery date" },
    { emoji: "📍", en: "Different city", msg: "Deliver to a different city" },
  ],
  ordered: [
    { emoji: "📦", en: "Track order", msg: "Track my order" },
    { emoji: "🔎", en: "New search", msg: "I want to search for something else" },
  ],
};

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted?: boolean }) {
  if (muted) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" x2="17" y1="9" y2="15" />
        <line x1="17" x2="23" y1="9" y2="15" />
      </svg>
    );
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onOpenCheckout?: () => void;
  disabled?: boolean;
  conversationState?: ConversationState;
  lastOrderId?: string;
  voiceMode?: boolean;
  onVoiceModeChange?: (enabled: boolean) => void;
  isRecording?: boolean;
  isTranscribing?: boolean;
  isSpeaking?: boolean;
  voiceError?: string | null;
  onMicClick?: () => void;
  onStopSpeaking?: () => void;
}

export default function ChatInput({
  onSend,
  onOpenCheckout,
  disabled,
  conversationState = "empty",
  lastOrderId,
  voiceMode = false,
  onVoiceModeChange,
  isRecording = false,
  isTranscribing = false,
  isSpeaking = false,
  voiceError,
  onMicClick,
  onStopSpeaking,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const itemCount = useCartStore((s) => s.itemCount());
  const hintChips = [...CHIPS_BY_STATE[conversationState]];
  if (conversationState === "ordered" && lastOrderId) {
    const trackIdx = hintChips.findIndex((c) => c.en === "Track order");
    if (trackIdx >= 0) {
      hintChips[trackIdx] = {
        ...hintChips[trackIdx],
        msg: `Track order ${lastOrderId}`,
      };
    }
  }
  if (
    itemCount > 0 &&
    onOpenCheckout &&
    (conversationState === "products" || conversationState === "delivery")
  ) {
    const hasCheckout = hintChips.some((c) => c.en === "Checkout");
    if (!hasCheckout) {
      hintChips.unshift({
        emoji: "🛒",
        en: "Open checkout",
        msg: "__open_checkout__",
      });
    }
  }

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  };

  const handleChip = (msg: string) => {
    if (msg === "__open_checkout__" && onOpenCheckout) {
      onOpenCheckout();
      return;
    }
    if (/VPAY827982BA\s*\(demo\)/i.test(msg)) {
      onSend("Track order VPAY827982BA");
      return;
    }
    onSend(msg);
  };

  const voiceStatus = isTranscribing
    ? "Processing…"
    : isRecording
      ? "Listening… tap mic when done"
      : isSpeaking
        ? "Speaking…"
        : null;

  return (
    <div className="shrink-0 px-3 sm:px-4 py-4 pb-6 bg-gradient-to-t from-bg via-bg/80 to-transparent">
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto bg-surface/70 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-3 relative z-10">
        {(voiceStatus || voiceError) && (
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span
              className={
                voiceError
                  ? "text-warning"
                  : isRecording
                    ? "text-red-400"
                    : "text-muted"
              }
              role="status"
            >
              {voiceError ?? voiceStatus}
            </span>
            {isSpeaking && onStopSpeaking && (
              <button
                type="button"
                onClick={onStopSpeaking}
                className="text-xs text-muted hover:text-foreground underline"
              >
                Stop
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-2.5 pb-1">
          {hintChips.map((chip) => (
            <button
              key={chip.en}
              type="button"
              disabled={disabled}
              onClick={() => handleChip(chip.msg)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-black/20 border border-white/5 text-muted hover:border-white/20 hover:text-foreground hover:bg-white/5 transition-all duration-300 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span aria-hidden>{chip.emoji}</span>
              <span>{chip.en}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          {onVoiceModeChange && (
            <button
              type="button"
              onClick={() => onVoiceModeChange(!voiceMode)}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                voiceMode
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-elevated border-border text-muted hover:text-foreground"
              }`}
              aria-label={voiceMode ? "Disable spoken replies" : "Enable spoken replies"}
              aria-pressed={voiceMode}
            >
              <SpeakerIcon muted={!voiceMode} />
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onInput={onInput}
            disabled={disabled}
            rows={1}
            placeholder="Who are we shopping for today? Just tell me what you need..."
            className="flex-1 resize-none rounded-2xl border border-white/5 bg-black/20 text-foreground placeholder:text-muted px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:opacity-50 min-h-[52px] max-h-24 transition-all"
          />
          {onMicClick && (
            <button
              type="button"
              onClick={onMicClick}
              disabled={(disabled || isTranscribing) && !isRecording}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 ${
                isRecording
                  ? "bg-red-500 border-red-500 text-white animate-pulse"
                  : "bg-elevated border-border text-muted hover:text-foreground hover:border-primary/40"
              }`}
              aria-label={isRecording ? "Stop recording and send" : "Start voice input"}
              aria-pressed={isRecording}
            >
              <MicIcon />
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="shrink-0 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-hover active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
