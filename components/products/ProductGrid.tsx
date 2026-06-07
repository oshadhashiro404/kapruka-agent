"use client";

import ProductImage from "@/components/ui/ProductImage";
import type { Product } from "@/lib/types";
import { dedupeProducts, formatLKR } from "@/lib/utils";

interface ProductGridProps {
  products: Product[];
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
}

export default function ProductGrid({
  products,
  onView,
  onAdd,
}: ProductGridProps) {
  const unique = dedupeProducts(products);
  if (!unique.length) return null;

  return (
    <div className="hidden lg:grid grid-cols-2 gap-3">
      {unique.map((p) => (
        <article
          key={p.id}
          className="rounded-xl border border-border bg-elevated overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-black/20 transition-all"
        >
          <button
            type="button"
            onClick={() => onView(p)}
            className="w-full text-left"
          >
            <ProductImage
              name={p.name}
              imageUrl={p.image_url}
              images={p.images}
              inStock={p.in_stock}
              className="aspect-square bg-elevated rounded-t-xl"
            />
            <div className="p-3">
              <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                {p.name}
              </h3>
              <p className="text-primary font-bold text-sm mt-1">
                {p.price_lkr > 0 ? formatLKR(p.price_lkr) : "—"}
              </p>
            </div>
          </button>
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => onAdd(p)}
              disabled={!p.in_stock}
              className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40 hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              Add to cart
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
