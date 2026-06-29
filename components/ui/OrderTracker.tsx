"use client";

import { useState } from "react";
import OrderTrackingCard from "@/components/orders/OrderTrackingCard";
import { trackOrder } from "@/lib/api";
import type { OrderTracking } from "@/lib/types";

const DEMO_ORDER_NUMBER = "VPAY827982BA";

interface OrderTrackerProps {
  compact?: boolean;
  initialOrderNumber?: string;
}

export default function OrderTracker({
  compact,
  initialOrderNumber = "",
}: OrderTrackerProps) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (nextOrderNumber?: string) => {
    const candidate = (nextOrderNumber ?? orderNumber).trim();
    if (!candidate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await trackOrder(candidate);
      setTracking(result);
      setOrderNumber(result.order_number || candidate.toUpperCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not track order");
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTryDemo = async () => {
    setOrderNumber(DEMO_ORDER_NUMBER);
    await handleTrack(DEMO_ORDER_NUMBER);
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-surface/75 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <h4
        className={`font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}
      >
        Track order
      </h4>
      {!compact && (
        <p className="font-sinhala text-xs text-muted mt-0.5">ඇණවුම ලුහුබඳින්න</p>
      )}
      {!compact && (
        <p className="mt-2 text-xs text-muted">
          No real purchase needed for demo — try order <span className="font-mono">{DEMO_ORDER_NUMBER}</span>.
        </p>
      )}
      <div className={`flex gap-2 ${compact ? "mt-2" : "mt-3"}`}>
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleTrack()}
          placeholder="e.g. VPAY827982BA"
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={() => void handleTrack()}
          disabled={loading || !orderNumber.trim()}
          className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary-hover transition-colors"
        >
          {loading ? "…" : "Go"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void handleTryDemo()}
        disabled={loading}
        className="mt-2 text-xs text-primary hover:text-primary-hover underline disabled:opacity-50"
      >
        Use demo order ({DEMO_ORDER_NUMBER})
      </button>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
      {tracking && (
        <div className="mt-3">
          <OrderTrackingCard tracking={tracking} compact />
        </div>
      )}
    </div>
  );
}
