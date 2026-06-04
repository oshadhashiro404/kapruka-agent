"use client";

import { useState } from "react";
import { trackOrder } from "@/lib/api";
import type { OrderTracking } from "@/lib/types";

export default function OrderTracker() {
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
    <div className="rounded-xl border border-secondary/20 bg-white p-4 shadow-sm">
      <h4 className="font-bold text-secondary mb-2">Track your order</h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="Order number e.g. KAP-12345"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleTrack}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-secondary text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? "…" : "Track"}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {tracking && (
        <div className="mt-3 text-sm space-y-2">
          <p>
            <span className="font-semibold">Status:</span> {tracking.status}
          </p>
          {tracking.recipient && (
            <p>
              <span className="font-semibold">Recipient:</span>{" "}
              {tracking.recipient}
            </p>
          )}
          {tracking.delivery_progress &&
            tracking.delivery_progress.length > 0 && (
              <ul className="list-disc pl-5 text-gray-600">
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
