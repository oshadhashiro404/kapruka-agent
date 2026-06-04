"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { formatLKR, productImageSrc } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  loading?: boolean;
}

function ProductImagePlaceholder({ name }: { name: string }) {
  const letter = name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2a1a0e] to-[#1a1a1a]">
      <span className="text-2xl font-bold text-[#e65100]/60">{letter}</span>
    </div>
  );
}

export default function ProductCard({
  product,
  onView,
  onAdd,
  loading,
}: ProductCardProps) {
  const rawSrc = productImageSrc(
    product.image_url || product.images?.[0] || ""
  );
  const hasImage = rawSrc.length > 0;
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setImgState("loading");
    setRetry(0);
  }, [rawSrc]);

  useEffect(() => {
    if (!hasImage || imgState !== "loading") return;
    const t = setTimeout(() => setImgState("error"), 15_000);
    return () => clearTimeout(t);
  }, [hasImage, imgState, rawSrc]);

  const imgSrc =
    retry > 0 ? `${rawSrc}${rawSrc.includes("?") ? "&" : "?"}r=${retry}` : rawSrc;

  if (loading) {
    return (
      <div className="w-full flex gap-3 p-3 rounded-xl bg-[#242424] border border-[#2e2e2e] animate-pulse">
        <div className="w-16 h-16 rounded-xl bg-[#2e2e2e] shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-[#2e2e2e] rounded w-3/4" />
          <div className="h-3 bg-[#2e2e2e] rounded w-1/2" />
          <div className="h-3 bg-[#2e2e2e] rounded w-1/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex gap-3 p-3.5 rounded-xl bg-[#242424] border border-[#2e2e2e] hover:border-[#e65100]/50 hover:shadow-md hover:shadow-black/20 transition-all duration-150 hover:-translate-y-0.5">
      <button
        type="button"
        onClick={() => onView(product)}
        className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#2e2e2e]"
        aria-label={`View ${product.name}`}
      >
        {(!hasImage || imgState === "error") ? (
          <ProductImagePlaceholder name={product.name} />
        ) : (
          <>
            {imgState === "loading" && (
              <div className="absolute inset-0 bg-[#2e2e2e] animate-pulse" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imgSrc}
              src={imgSrc}
              alt={product.name}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                imgState === "loaded" ? "opacity-100" : "opacity-0"
              } ${!product.in_stock ? "grayscale opacity-50" : ""}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgState("loaded")}
              onError={() => {
                if (retry < 1) {
                  setRetry((r) => r + 1);
                  setImgState("loading");
                } else {
                  setImgState("error");
                }
              }}
            />
          </>
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <button
          type="button"
          onClick={() => onView(product)}
          className="text-left"
        >
          <h3 className="text-sm font-medium text-[#f0f0f0] line-clamp-2 leading-snug">
            {product.name}
          </h3>
          <p className="text-[#e65100] font-bold text-sm mt-0.5">
            {product.price_lkr > 0 ? formatLKR(product.price_lkr) : "Price unavailable"}
          </p>
          <p className="text-xs mt-0.5 flex items-center gap-1 flex-wrap">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                product.in_stock ? "bg-[#22c55e]" : "bg-red-500"
              }`}
            />
            <span className={product.in_stock ? "text-[#8a8a8a]" : "text-red-400"}>
              {product.in_stock ? "In stock" : "Out of stock"}
            </span>
            {product.is_perishable && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                Perishable
              </span>
            )}
          </p>
        </button>
        {product.url && product.url !== "https://www.kapruka.com" && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#8a8a8a] hover:text-[#ff8f4e] transition-colors mt-0.5 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            kapruka.com ↗
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAdd(product)}
        disabled={!product.in_stock}
        className="shrink-0 self-center px-3 py-1.5 rounded-lg bg-[#e65100] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#ff8f4e] transition-colors"
      >
        Add
      </button>
    </div>
  );
}
