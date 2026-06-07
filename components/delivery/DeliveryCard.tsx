"use client";

import type { DeliveryQuote } from "@/lib/types";
import { formatDate, formatDeliveryCost, formatLKR } from "@/lib/utils";

interface DeliveryCardProps {
  quote: DeliveryQuote;
  loading?: boolean;
}

export default function DeliveryCard({ quote, loading }: DeliveryCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-elevated border border-border p-4 animate-pulse h-20" />
    );
  }

  return (
    <div className="rounded-xl bg-elevated border border-border p-4">
      <h4 className="font-medium text-foreground text-sm">
        Delivery / <span className="font-sinhala">බෙදාහැරීම</span>
      </h4>
      <p className="text-primary font-semibold mt-1">
        {quote.city || "Your city"}
      </p>
      <div className="mt-2 space-y-1 text-sm text-muted">
        <p>
          <span>Date:</span>{" "}
          <span className="text-foreground">{formatDate(quote.delivery_date)}</span>
        </p>
        <p>
          <span>Cost:</span>{" "}
          <span className="text-primary font-semibold">
            {formatDeliveryCost(quote.delivery_cost_lkr)}
          </span>
        </p>
        {quote.estimated_arrival && (
          <p>
            <span>Arrival:</span>{" "}
            <span className="text-foreground">{quote.estimated_arrival}</span>
          </p>
        )}
        <p className="pt-1">
          {quote.deliverable ? (
            <span className="text-success">Deliverable</span>
          ) : (
            <span className="text-danger">Not available for this date</span>
          )}
        </p>
      </div>
    </div>
  );
}
