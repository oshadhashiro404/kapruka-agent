"use client";

interface TypingIndicatorProps {
  status?: string;
}

export default function TypingIndicator({ status }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-surface border border-border">
        <div className="flex items-center gap-1.5">
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
