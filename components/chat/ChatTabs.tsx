"use client";

import { useChatStore } from "@/lib/chat-store";

interface ChatTabsProps {
  onNewChat: () => void;
  onSwitch: (id: string) => void;
}

export default function ChatTabs({ onNewChat, onSwitch }: ChatTabsProps) {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const deleteSession = useChatStore((s) => s.deleteSession);

  return (
    <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-surface border-b border-border overflow-x-auto scrollbar-hide animate-tab-enter">
      {sessions.map((session) => {
        const active = session.id === activeSessionId;
        return (
          <div
            key={session.id}
            className={`group shrink-0 flex items-center rounded-lg border-b-2 transition-all duration-200 ${
              active
                ? "border-b-primary bg-elevated/80"
                : "border-b-transparent hover:bg-elevated/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onSwitch(session.id)}
              className={`px-3 py-2 text-xs max-w-[140px] truncate ${
                active
                  ? "text-foreground font-medium"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {session.title}
            </button>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="pr-2 text-muted hover:text-foreground text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Close chat"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onNewChat}
        className="shrink-0 w-8 h-8 rounded-lg border border-dashed border-border text-muted hover:border-primary hover:text-primary hover:bg-elevated/50 transition-colors flex items-center justify-center text-lg leading-none"
        aria-label="New chat"
      >
        +
      </button>
    </div>
  );
}
