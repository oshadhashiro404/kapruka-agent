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
    { emoji: "📱", en: "Electronics", msg: "Show me electronics" },
    { emoji: "📦", en: "Track order", msg: "Track my order" },
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

interface ChatInputProps {
  onSend: (message: string) => void;
  onOpenCheckout?: () => void;
  disabled?: boolean;
  conversationState?: ConversationState;
}

export default function ChatInput({
  onSend,
  onOpenCheckout,
  disabled,
  conversationState = "empty",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const itemCount = useCartStore((s) => s.itemCount());
  const hintChips = [...CHIPS_BY_STATE[conversationState]];
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
    onSend(msg);
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface/95 backdrop-blur-sm px-3 sm:px-4 py-3">
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-2.5 pb-1">
          {hintChips.map((chip) => (
            <button
              key={chip.en}
              type="button"
              disabled={disabled}
              onClick={() => handleChip(chip.msg)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-elevated border border-border text-muted hover:border-primary/70 hover:text-foreground hover:bg-surface transition-all duration-200 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span aria-hidden>{chip.emoji}</span>
              <span>{chip.en}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onInput={onInput}
            disabled={disabled}
            rows={1}
            placeholder="Ask anything… / ඕනෑ දෙයක් අහන්න…"
            className="flex-1 resize-none rounded-2xl border border-border bg-elevated text-foreground placeholder:text-muted px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 disabled:opacity-50 min-h-[52px] max-h-24 transition-shadow"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-hover active:scale-95 transition-all shadow-md shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
