"use client";

import type { DeliveryQuote } from "@/lib/types";
import { formatDate, formatLKR } from "@/lib/utils";

interface DeliveryCardProps {
  quote: DeliveryQuote;
  loading?: boolean;
}

export default function DeliveryCard({ quote, loading }: DeliveryCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-[#242424] border border-[#2e2e2e] p-4 animate-pulse h-20" />
    );
  }

  return (
    <div className="rounded-xl bg-[#242424] border border-[#2e2e2e] p-4">
      <h4 className="font-medium text-[#f0f0f0] text-sm">
        Delivery / <span className="font-sinhala">බෙදාහැරීම</span>
      </h4>
      <p className="text-[#e65100] font-semibold mt-1">
        {quote.city || "Your city"}
      </p>
      <div className="mt-2 space-y-1 text-sm text-[#8a8a8a]">
        <p>
          <span className="text-[#8a8a8a]">Date:</span>{" "}
          <span className="text-[#f0f0f0]">{formatDate(quote.delivery_date)}</span>
        </p>
        <p>
          <span className="text-[#8a8a8a]">Cost:</span>{" "}
          <span className="text-[#e65100] font-semibold">
            {formatLKR(quote.delivery_cost_lkr)}
          </span>
        </p>
        {quote.estimated_arrival && (
          <p>
            <span className="text-[#8a8a8a]">Arrival:</span>{" "}
            <span className="text-[#f0f0f0]">{quote.estimated_arrival}</span>
          </p>
        )}
        <p className="pt-1">
          {quote.deliverable ? (
            <span className="text-[#22c55e]">Deliverable</span>
          ) : (
            <span className="text-red-400">Not available for this date</span>
          )}
        </p>
      </div>
    </div>
  );
}
