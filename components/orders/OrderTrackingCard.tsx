"use client";

import type { OrderTracking } from "@/lib/types";

interface OrderTrackingCardProps {
  tracking: OrderTracking;
  compact?: boolean;
}

export default function OrderTrackingCard({
  tracking,
  compact,
}: OrderTrackingCardProps) {
  const steps = tracking.delivery_progress ?? [];
  const latestIndex = steps.length > 0 ? steps.length - 1 : -1;

  return (
    <div
      className={`rounded-xl bg-elevated border border-border ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-medium text-foreground text-sm">
            Order tracking /{" "}
            <span className="font-sinhala">ඇණවුම ලුහුබඳින්න</span>
          </h4>
          <p className="text-xs text-muted mt-0.5 font-mono">
            {tracking.order_number}
          </p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          {tracking.status}
        </span>
      </div>

      {tracking.recipient && (
        <p className="mt-2 text-sm text-muted">
          <span className="text-foreground font-medium">Recipient:</span>{" "}
          {tracking.recipient}
        </p>
      )}

      {tracking.items && tracking.items.length > 0 && (
        <ul className="mt-2 text-sm text-muted space-y-0.5">
          {tracking.items.map((item, i) => (
            <li key={i}>
              {item.quantity ? `${item.quantity}× ` : ""}
              {item.name}
            </li>
          ))}
        </ul>
      )}

      {steps.length > 0 && (
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => {
            const isLatest = i === latestIndex;
            return (
              <li key={i} className="flex gap-2 text-sm">
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    isLatest ? "bg-primary" : "bg-border"
                  }`}
                  aria-hidden
                />
                <div className={isLatest ? "text-foreground" : "text-muted"}>
                  <p className={isLatest ? "font-medium" : ""}>{step.status}</p>
                  {step.timestamp && (
                    <p className="text-xs text-muted mt-0.5">{step.timestamp}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
