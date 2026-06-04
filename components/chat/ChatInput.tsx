"use client";

import { useRef, useState, KeyboardEvent } from "react";
import type { ConversationState } from "@/lib/types";

const CHIPS_BY_STATE: Record<
  ConversationState,
  { en: string; msg: string }[]
> = {
  empty: [
    { en: "Birthday gift", msg: "I want a birthday gift" },
    { en: "Flowers", msg: "Show me flowers" },
    { en: "Electronics", msg: "Show me electronics" },
    { en: "Track order", msg: "Track my order" },
  ],
  products: [
    { en: "Add first one", msg: "Add the first one to my cart" },
    { en: "See more", msg: "Show me more options" },
    { en: "Check delivery", msg: "Can you check delivery for these?" },
  ],
  delivery: [
    { en: "Confirm", msg: "Yes, please proceed with checkout" },
    { en: "Change date", msg: "I need a different delivery date" },
    { en: "Different city", msg: "Deliver to a different city" },
  ],
  ordered: [
    { en: "Track order", msg: "Track my order" },
    { en: "New search", msg: "I want to search for something else" },
  ],
};

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  conversationState?: ConversationState;
}

export default function ChatInput({
  onSend,
  disabled,
  conversationState = "empty",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hintChips = CHIPS_BY_STATE[conversationState];

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

  return (
    <div className="shrink-0 border-t border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-2 pb-1">
          {hintChips.map((chip) => (
            <button
              key={chip.en}
              type="button"
              disabled={disabled}
              onClick={() => onSend(chip.msg)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs bg-[#242424] border border-[#2e2e2e] text-[#8a8a8a] hover:border-[#e65100] hover:text-[#f0f0f0] transition-all duration-200 hover:scale-[1.03] disabled:opacity-40"
            >
              {chip.en}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onInput={onInput}
            disabled={disabled}
            rows={1}
            placeholder="Ask anything… / ඕනෑ දෙයක් අහන්න…"
            className="flex-1 resize-none rounded-2xl border border-[#2e2e2e] bg-[#242424] text-[#f0f0f0] placeholder:text-[#8a8a8a] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#e65100]/40 disabled:opacity-50 min-h-[48px] max-h-24"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="shrink-0 w-11 h-11 rounded-full bg-[#e65100] text-white font-bold disabled:opacity-40 hover:bg-[#ff8f4e] transition-colors"
            aria-label="Send message"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
