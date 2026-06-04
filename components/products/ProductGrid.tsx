"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { dedupeProducts, formatLKR, productImageSrc } from "@/lib/utils";

interface ProductGridProps {
  products: Product[];
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
}

function GridImage({ product }: { product: Product }) {
  const rawSrc = productImageSrc(
    product.image_url || product.images?.[0] || ""
  );
  const hasImage = rawSrc.length > 0;
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  useEffect(() => {
    setImgState("loading");
  }, [rawSrc]);

  useEffect(() => {
    if (!hasImage || imgState !== "loading") return;
    const t = setTimeout(() => setImgState("error"), 15_000);
    return () => clearTimeout(t);
  }, [hasImage, imgState, rawSrc]);

  if (!hasImage || imgState === "error") {
    return (
      <div className="aspect-square bg-elevated flex items-center justify-center rounded-t-xl">
        <span className="text-2xl font-bold text-primary/50">
          {product.name?.charAt(0)?.toUpperCase() || "?"}
        </span>
      </div>
    );
  }

  return (
    <div className="aspect-square bg-elevated overflow-hidden rounded-t-xl relative">
      {imgState === "loading" && (
        <div className="absolute inset-0 bg-border animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rawSrc}
        alt={product.name}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imgState === "loaded" ? "opacity-100" : "opacity-0"
        }`}
        loading="lazy"
        onLoad={() => setImgState("loaded")}
        onError={() => setImgState("error")}
      />
    </div>
  );
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
          <button type="button" onClick={() => onView(p)} className="w-full text-left">
            <GridImage product={p} />
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
              className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40 hover:bg-primary-hover transition-colors"
            >
              Add to cart
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
