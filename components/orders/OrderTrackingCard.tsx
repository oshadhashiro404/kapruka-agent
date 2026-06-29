"use client";

import type { OrderTracking } from "@/lib/types";

interface OrderTrackingCardProps {
  tracking: OrderTracking;
  compact?: boolean;
}

function prettyTimestamp(raw?: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const parsed = Date.parse(t);
  if (Number.isNaN(parsed)) return t;
  return new Date(parsed).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("deliver")) return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
  if (s.includes("out for delivery") || s.includes("shipped")) {
    return "bg-sky-500/15 text-sky-300 border-sky-400/30";
  }
  if (s.includes("cancel") || s.includes("failed")) {
    return "bg-rose-500/15 text-rose-300 border-rose-400/30";
  }
  return "bg-primary/15 text-primary border-primary/30";
}

export default function OrderTrackingCard({
  tracking,
  compact,
}: OrderTrackingCardProps) {
  const steps = tracking.delivery_progress ?? [];
  const latestIndex = steps.length > 0 ? steps.length - 1 : -1;
  const latest = latestIndex >= 0 ? steps[latestIndex] : null;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-surface/70 backdrop-blur-xl ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-medium text-foreground text-sm">
            Order tracking / <span className="font-sinhala">ඇණවුම ලුහුබඳින්න</span>
          </h4>
          <p className="text-xs text-muted mt-0.5 font-mono">{tracking.order_number}</p>
        </div>
        <span
          className={`shrink-0 max-w-[58%] px-2.5 py-1 rounded-full text-xs font-semibold border truncate ${statusTone(
            tracking.status
          )}`}
          title={tracking.status}
        >
          {tracking.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {tracking.recipient && (
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <p className="text-muted">Recipient</p>
            <p className="text-foreground font-medium truncate" title={tracking.recipient}>
              {tracking.recipient}
            </p>
          </div>
        )}
        {latest && (
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <p className="text-muted">Latest update</p>
            <p className="text-foreground font-medium truncate" title={latest.status}>
              {latest.status}
            </p>
            {latest.timestamp && (
              <p className="text-muted mt-0.5">{prettyTimestamp(latest.timestamp)}</p>
            )}
          </div>
        )}
      </div>

      {tracking.items && tracking.items.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Items</p>
          <ul className="text-sm text-muted space-y-1">
            {tracking.items.map((item, i) => (
              <li key={i} className="truncate" title={item.name}>
                {item.quantity ? `${item.quantity}× ` : ""}
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-muted mb-2">
            Delivery timeline ({steps.length} updates)
          </p>
          <ol className="space-y-2 max-h-72 overflow-auto pr-1">
            {steps.map((step, i) => {
              const isLatest = i === latestIndex;
              return (
                <li
                  key={i}
                  className={`relative pl-5 py-2 rounded-lg text-sm border ${
                    isLatest
                      ? "border-primary/30 bg-primary/10"
                      : "border-white/5 bg-black/10"
                  }`}
                >
                  <span
                    className={`absolute left-2 top-4 w-2 h-2 rounded-full ${
                      isLatest ? "bg-primary" : "bg-border"
                    }`}
                    aria-hidden
                  />
                  <p className={isLatest ? "text-foreground font-medium" : "text-muted"}>
                    {step.status}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-muted mt-0.5">{prettyTimestamp(step.timestamp)}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
