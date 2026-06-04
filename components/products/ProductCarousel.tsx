"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { dedupeProducts } from "@/lib/utils";
import ProductCard from "./ProductCard";
import ProductGrid from "./ProductGrid";

const MAX_VISIBLE = 5;

interface ProductCarouselProps {
  products: Product[];
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  loading?: boolean;
  searchQuery?: string;
  searchCategory?: string;
  searchCursor?: string;
  onLoadMore?: (newProducts: Product[], cursor?: string) => void;
}

export default function ProductCarousel({
  products,
  onView,
  onAdd,
  loading,
  searchQuery,
  searchCategory,
  searchCursor,
  onLoadMore,
}: ProductCarouselProps) {
  const [showAll, setShowAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(searchCursor);
  const [extra, setExtra] = useState<Product[]>([]);

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

  const unique = dedupeProducts([...products, ...extra]);
  if (!unique.length) return null;

  const displayProducts = showAll ? unique : unique.slice(0, MAX_VISIBLE);
  const hasMoreLocal = unique.length > MAX_VISIBLE && !showAll;
  const canFetchMore = Boolean(searchQuery && onLoadMore);

  const handleLoadMore = async () => {
    if (!searchQuery || !onLoadMore) {
      setShowAll(true);
      return;
    }
    if (!cursor) {
      setShowAll(true);
      return;
    }
    setLoadingMore(true);
    try {
      const { searchProducts } = await import("@/lib/api");
      const result = await searchProducts({
        q: searchQuery,
        category: searchCategory,
        cursor,
        limit: 10,
      });
      setExtra((prev) => dedupeProducts([...prev, ...result.products]));
      setCursor(result.cursor);
      onLoadMore(result.products, result.cursor);
      setShowAll(true);
    } catch {
      setShowAll(true);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mt-3">
      <ProductGrid
        products={displayProducts}
        onView={onView}
        onAdd={onAdd}
      />
      <div className="lg:hidden space-y-2">
        {displayProducts.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onView={onView}
            onAdd={onAdd}
          />
        ))}
      </div>
      {(hasMoreLocal || (canFetchMore && cursor)) && !showAll && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 text-sm text-muted hover:text-primary border border-border rounded-xl hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          {loadingMore
            ? "Loading…"
            : canFetchMore && cursor
              ? "Load more from Kapruka"
              : `Show ${unique.length - MAX_VISIBLE} more`}
        </button>
      )}
    </div>
  );
}
