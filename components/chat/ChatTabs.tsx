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
    <div className="shrink-0 flex items-center gap-1 px-3 py-2 bg-[#1a1a1a] border-b border-[#2e2e2e] overflow-x-auto scrollbar-hide animate-tab-enter">
      {sessions.map((session) => {
        const active = session.id === activeSessionId;
        return (
          <div
            key={session.id}
            className={`shrink-0 flex items-center gap-1 rounded-lg border transition-all duration-200 ${
              active
                ? "border-[#e65100] bg-[#242424]"
                : "border-[#2e2e2e] bg-transparent hover:border-[#3a3a3a]"
            }`}
          >
            <button
              type="button"
              onClick={() => onSwitch(session.id)}
              className={`px-3 py-1.5 text-xs max-w-[140px] truncate ${
                active ? "text-[#f0f0f0]" : "text-[#8a8a8a]"
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
                className="pr-2 text-[#8a8a8a] hover:text-[#f0f0f0] text-sm"
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
        className="shrink-0 w-8 h-8 rounded-lg border border-dashed border-[#2e2e2e] text-[#8a8a8a] hover:border-[#e65100] hover:text-[#e65100] transition-colors"
        aria-label="New chat"
      >
        +
      </button>
    </div>
  );
}
