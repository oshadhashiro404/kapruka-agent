"use client";

interface LoadingStateProps {
  variant?: "inline" | "card" | "skeleton-pills" | "empty";
  message?: string;
  sinhalaMessage?: string;
  className?: string;
}

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-border rounded ${className}`} aria-hidden />
  );
}

export default function LoadingState({
  variant = "inline",
  message,
  sinhalaMessage,
  className = "",
}: LoadingStateProps) {
  if (variant === "skeleton-pills") {
    return (
      <div
        className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}
        role="status"
        aria-label="Loading"
      >
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} className="shrink-0 h-8 w-20 rounded-full" />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`w-full flex gap-3 p-3 rounded-xl bg-elevated border border-border animate-pulse ${className}`}
        role="status"
        aria-label="Loading"
      >
        <LoadingSkeleton className="w-16 h-16 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <LoadingSkeleton className="h-4 w-3/4 rounded" />
          <LoadingSkeleton className="h-3 w-1/2 rounded" />
          <LoadingSkeleton className="h-3 w-1/4 rounded" />
        </div>
      </div>
    );
  }

  if (variant === "empty") {
    return (
      <p className={`text-center text-muted py-12 text-sm leading-relaxed ${className}`}>
        {message}
        {sinhalaMessage && (
          <>
            <br />
            <span className="font-sinhala">{sinhalaMessage}</span>
          </>
        )}
      </p>
    );
  }

  return (
    <p className={`text-sm text-muted ${className}`} role="status">
      {message ?? "Loading…"}
    </p>
  );
}

export function ErrorState({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      className={`text-sm text-danger rounded-lg bg-danger/10 px-3 py-2 ${className}`}
      role="alert"
    >
      {message}
    </p>
  );
}
