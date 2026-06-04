"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatLKR, hasVariants, productImageSrc } from "@/lib/utils";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product) => void;
}

function ModalImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <div className="relative w-64 h-64 shrink-0 rounded-xl overflow-hidden bg-[#242424]">
      {state === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#2a1a0e] to-[#1a1a1a]">
          <span className="text-4xl text-[#e65100]/40">📦</span>
          <span className="text-xs text-[#8a8a8a]">Image unavailable</span>
        </div>
      ) : (
        <>
          {state === "loading" && (
            <div className="absolute inset-0 bg-[#2e2e2e] animate-pulse" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              state === "loaded" ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => setState("loaded")}
            onError={() => setState("error")}
          />
        </>
      )}
    </div>
  );
}

export default function ProductModal({
  product,
  onClose,
  onAdd,
}: ProductModalProps) {
  if (!product) return null;

  const images = [
    ...(product.images ?? []),
    ...(product.image_url && !product.images?.includes(product.image_url)
      ? [product.image_url]
      : []),
  ]
    .map((s) => productImageSrc(s))
    .filter((s) => s.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border border-[#2e2e2e] rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center px-4 py-3 bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-[#2e2e2e] z-10">
          <span className="text-xs text-[#8a8a8a] font-medium uppercase tracking-widest">Product Details</span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#242424] text-[#f0f0f0] text-lg flex items-center justify-center hover:bg-[#2e2e2e] transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Images */}
        {images.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 scrollbar-hide">
            {images.map((src, i) => (
              <ModalImage key={i} src={src} alt={`${product.name} ${i + 1}`} />
            ))}
          </div>
        ) : (
          <div className="mx-4 mt-4 rounded-xl bg-gradient-to-br from-[#2a1a0e] to-[#1a1a1a] h-40 flex items-center justify-center border border-[#2e2e2e]">
            <div className="text-center">
              <span className="text-5xl">📦</span>
              <p className="text-xs text-[#8a8a8a] mt-2">No image available</p>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="px-5 pb-6 pt-4">
          <h2 className="text-xl font-bold text-[#f0f0f0] leading-snug">{product.name}</h2>
          <p className="text-2xl font-bold text-[#e65100] mt-1">
            {product.price_lkr > 0 ? formatLKR(product.price_lkr) : "Price unavailable"}
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                product.in_stock
                  ? "bg-green-500/15 text-green-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {product.in_stock ? "✓ In stock" : "✗ Out of stock"}
            </span>
            {product.is_perishable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
                🕐 Perishable
              </span>
            )}
            {product.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#2e2e2e] text-[#8a8a8a]">
                {product.category}
              </span>
            )}
          </div>

          {product.is_perishable && (
            <p className="text-sm text-[#f59e0b]/80 mt-3 bg-amber-500/10 rounded-lg p-3">
              ⚠️ This is a perishable item — delivery date selection matters.
            </p>
          )}

          {hasVariants(product) && (
            <div className="mt-3 space-y-1 text-sm text-[#8a8a8a]">
              {product.variants?.sizes && (
                <p><span className="text-[#f0f0f0]">Sizes:</span> {product.variants.sizes.join(", ")}</p>
              )}
              {product.variants?.colors && (
                <p><span className="text-[#f0f0f0]">Colors:</span> {product.variants.colors.join(", ")}</p>
              )}
              {product.variants?.flavors && (
                <p><span className="text-[#f0f0f0]">Flavors:</span> {product.variants.flavors.join(", ")}</p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl border border-[#2e2e2e] text-sm text-[#ff8f4e] font-medium text-center hover:bg-[#2e2e2e] transition-colors"
            >
              View on Kapruka ↗
            </a>
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={!product.in_stock}
              className="flex-1 py-2.5 rounded-xl bg-[#e65100] text-white font-bold text-sm disabled:opacity-40 hover:bg-[#ff8f4e] transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
