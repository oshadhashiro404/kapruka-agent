"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatLKR } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  loading?: boolean;
}

export default function ProductCard({
  product,
  onView,
  onAdd,
  loading,
}: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (loading) {
    return (
      <div className="w-full flex gap-3 p-3 rounded-xl bg-[#242424] border border-[#2e2e2e] animate-pulse">
        <div className="w-14 h-14 rounded-lg bg-[#2e2e2e] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#2e2e2e] rounded w-3/4" />
          <div className="h-3 bg-[#2e2e2e] rounded w-1/2" />
        </div>
      </div>
    );
  }

  const imgSrc =
    product.image_url ||
    product.images?.[0] ||
    "https://www.kapruka.com/favicon.ico";

  return (
    <div className="w-full flex gap-3 p-3 rounded-xl bg-[#242424] border border-[#2e2e2e] hover:border-[#e65100]/50 transition-all duration-150 hover:-translate-y-0.5">
      <button
        type="button"
        onClick={() => onView(product)}
        className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[#2e2e2e]"
        aria-label={`View ${product.name}`}
      >
        {!imgLoaded && (
          <div className="absolute inset-0 bg-[#2e2e2e] blur-sm brightness-75" />
        )}
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          className={`object-cover transition-opacity duration-300 ${
            imgLoaded ? "opacity-100" : "opacity-0 blur-sm brightness-75"
          } ${!product.in_stock ? "grayscale opacity-50" : ""}`}
          sizes="56px"
          onLoad={() => setImgLoaded(true)}
          unoptimized
        />
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
          <p className="text-[#e65100] font-semibold text-sm mt-0.5">
            {formatLKR(product.price_lkr)}
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
