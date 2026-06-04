"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OccasionGrid from "@/components/ui/OccasionGrid";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ScrollFab from "./ScrollFab";
import type { ChatMessage, Product } from "@/lib/types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  status?: string;
  onOccasionSelect: (message: string) => void;
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  onSendChip?: (message: string) => void;
}

const SCROLL_THRESHOLD = 150;

export default function ChatMessages({
  messages,
  isLoading,
  status,
  onOccasionSelect,
  onView,
  onAdd,
  onSendChip,
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
      className="flex-1 overflow-y-auto relative"
      onScroll={handleScroll}
    >
      <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <OccasionGrid onSelect={onOccasionSelect} />
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onView={onView}
            onAdd={onAdd}
            onSendChip={onSendChip}
          />
        ))}
        {isLoading && <TypingIndicator status={status} />}
        <div ref={bottomRef} />
      </div>
      <ScrollFab
        visible={showFab}
        onClick={() => scrollToBottom("smooth")}
      />
    </div>
  );
}
