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
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 mt-3">
      <h4 className="font-medium text-warning text-sm">Perishable warning</h4>
      <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{message}</p>
      {alternatives.length > 0 && onView && onAdd && (
        <div className="mt-3">
          <p className="text-xs text-muted mb-2">Alternatives:</p>
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
