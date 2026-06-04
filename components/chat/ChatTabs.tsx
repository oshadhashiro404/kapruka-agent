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
    <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1a] border-b border-[#2e2e2e] overflow-x-auto scrollbar-hide animate-tab-enter">
      {sessions.map((session) => {
        const active = session.id === activeSessionId;
        return (
          <div
            key={session.id}
            className={`group shrink-0 flex items-center rounded-lg border-b-2 transition-all duration-200 ${
              active
                ? "border-b-[#e65100] bg-[#242424]/80"
                : "border-b-transparent hover:bg-[#242424]/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onSwitch(session.id)}
              className={`px-3 py-2 text-xs max-w-[140px] truncate ${
                active
                  ? "text-[#f0f0f0] font-medium"
                  : "text-[#8a8a8a] hover:text-[#c0c0c0]"
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
                className="pr-2 text-[#8a8a8a] hover:text-[#f0f0f0] text-sm opacity-0 group-hover:opacity-100 transition-opacity"
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
        className="shrink-0 w-8 h-8 rounded-lg border border-dashed border-[#2e2e2e] text-[#8a8a8a] hover:border-[#e65100] hover:text-[#e65100] hover:bg-[#242424]/50 transition-colors flex items-center justify-center text-lg leading-none"
        aria-label="New chat"
      >
        +
      </button>
    </div>
  );
}
