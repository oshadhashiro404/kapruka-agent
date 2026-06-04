"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { dedupeProducts } from "@/lib/utils";
import ProductCard from "./ProductCard";

const MAX_VISIBLE = 5;

interface ProductCarouselProps {
  products: Product[];
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  loading?: boolean;
}

export default function ProductCarousel({
  products,
  onView,
  onAdd,
  loading,
}: ProductCarouselProps) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <ProductCard
            key={i}
            product={{} as Product}
            onView={() => {}}
            onAdd={() => {}}
            loading
          />
        ))}
      </div>
    );
  }

  const unique = dedupeProducts(products);
  if (!unique.length) return null;

  const visible = showAll ? unique : unique.slice(0, MAX_VISIBLE);
  const hasMore = unique.length > MAX_VISIBLE;

  return (
    <div className="space-y-2">
      {visible.map((p, index) => (
        <ProductCard
          key={`${p.id}-${index}`}
          product={p}
          onView={onView}
          onAdd={onAdd}
        />
      ))}
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm text-[#8a8a8a] hover:text-[#e65100] transition-colors"
        >
          Show {unique.length - MAX_VISIBLE} more
        </button>
      )}
    </div>
  );
}
