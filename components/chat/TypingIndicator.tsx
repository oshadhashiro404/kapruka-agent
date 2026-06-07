"use client";

interface TypingIndicatorProps {
  status?: string;
}

export default function TypingIndicator({ status }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start gap-2.5 items-start" role="status" aria-label={status ?? "Assistant is typing"}>
      <span
        className="inline-flex w-8 h-8 rounded-full bg-primary/10 border border-border items-center justify-center shrink-0"
        aria-hidden
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-chat-glow"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      </span>
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-sm bg-chat-bot border border-border">
        <div className="flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-dot-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        {status && <span className="text-sm text-muted">{status}</span>}
      </div>
    </div>
  );
}
