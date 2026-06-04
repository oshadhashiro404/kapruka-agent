"use client";

import { useState } from "react";
import { trackOrder } from "@/lib/api";
import type { OrderTracking } from "@/lib/types";

interface OrderTrackerProps {
  compact?: boolean;
}

export default function OrderTracker({ compact }: OrderTrackerProps) {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await trackOrder(orderNumber.trim());
      setTracking(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not track order");
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-border bg-elevated ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <h4
        className={`font-semibold text-foreground ${compact ? "text-sm" : ""}`}
      >
        Track order
      </h4>
      {!compact && (
        <p className="font-sinhala text-xs text-muted mt-0.5">ඇණවුම ලුහුබඳින්න</p>
      )}
      <div className={`flex gap-2 ${compact ? "mt-2" : "mt-3"}`}>
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          placeholder="KAP-12345"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={handleTrack}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary-hover transition-colors"
        >
          {loading ? "…" : "Go"}
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
      {tracking && (
        <div className="mt-3 text-xs sm:text-sm space-y-1 text-muted">
          <p>
            <span className="text-foreground font-medium">Status:</span>{" "}
            {tracking.status}
          </p>
          {tracking.recipient && (
            <p>
              <span className="text-foreground font-medium">Recipient:</span>{" "}
              {tracking.recipient}
            </p>
          )}
          {tracking.delivery_progress &&
            tracking.delivery_progress.length > 0 && (
              <ul className="list-disc pl-4 pt-1">
                {tracking.delivery_progress.map((step, i) => (
                  <li key={i}>
                    {step.status}
                    {step.timestamp ? ` — ${step.timestamp}` : ""}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </div>
  );
}
