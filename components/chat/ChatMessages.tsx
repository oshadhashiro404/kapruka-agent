"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OccasionGrid from "@/components/ui/OccasionGrid";
import type { KaprukaCategory } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ScrollFab from "./ScrollFab";
import type { ChatMessage, Product, SessionContext } from "@/lib/types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  status?: string;
  sessionContext?: SessionContext;
  categories: KaprukaCategory[];
  categoriesLoading: boolean;
  onOccasionSelect: (message: string) => void;
  onCategorySelect: (category: string) => void;
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  onSendChip?: (message: string) => void;
  onProductsAppend?: (messageId: string, products: Product[]) => void;
}

const SCROLL_THRESHOLD = 150;

export default function ChatMessages({
  messages,
  isLoading,
  status,
  sessionContext,
  categories,
  categoriesLoading,
  onOccasionSelect,
  onCategorySelect,
  onView,
  onAdd,
  onSendChip,
  onProductsAppend,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showFab, setShowFab] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowFab(distanceFromBottom > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, status, scrollToBottom]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto relative min-h-0"
      onScroll={handleScroll}
    >
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <OccasionGrid
            categories={categories}
            categoriesLoading={categoriesLoading}
            onSelect={onOccasionSelect}
            onCategorySelect={onCategorySelect}
          />
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            sessionContext={sessionContext}
            onView={onView}
            onAdd={onAdd}
            onSendChip={onSendChip}
            onProductsAppend={onProductsAppend}
          />
        ))}
        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {isLoading && (status ? `Assistant: ${status}` : "Assistant is typing")}
        </div>
        {isLoading && <TypingIndicator status={status} />}
        <div ref={bottomRef} className="h-1" />
      </div>
      <ScrollFab
        visible={showFab}
        onClick={() => scrollToBottom("smooth")}
      />
    </div>
  );
}
