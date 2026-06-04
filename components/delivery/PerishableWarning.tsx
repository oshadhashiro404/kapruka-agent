"use client";

import ProductCarousel from "@/components/products/ProductCarousel";
import type { Product } from "@/lib/types";

interface PerishableWarningProps {
  message: string;
  alternatives?: Product[];
  onView?: (product: Product) => void;
  onAdd?: (product: Product) => void;
}

export default function PerishableWarning({
  message,
  alternatives = [],
  onView,
  onAdd,
}: PerishableWarningProps) {
  return (
    <div className="rounded-xl border border-[#f59e0b]/40 bg-[#2a1f00] p-4 mt-3">
      <h4 className="font-medium text-[#f59e0b] text-sm">
        Perishable warning
      </h4>
      <p className="text-sm text-[#f0f0f0]/90 mt-2 leading-relaxed">{message}</p>
      {alternatives.length > 0 && onView && onAdd && (
        <div className="mt-3">
          <p className="text-xs text-[#8a8a8a] mb-2">Alternatives:</p>
          <ProductCarousel
            products={alternatives}
            onView={onView}
            onAdd={onAdd}
          />
        </div>
      )}
    </div>
  );
}
