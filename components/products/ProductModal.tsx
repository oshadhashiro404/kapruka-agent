"use client";

import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatLKR, hasVariants } from "@/lib/utils";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product) => void;
}

export default function ProductModal({
  product,
  onClose,
  onAdd,
}: ProductModalProps) {
  if (!product) return null;

  const images =
    product.images?.length > 0
      ? product.images
      : product.image_url
        ? [product.image_url]
        : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border border-[#2e2e2e] rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex justify-end p-3 bg-[#1a1a1a]/95 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#242424] text-[#f0f0f0] text-xl hover:bg-[#2e2e2e]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {images.map((src, i) => (
            <div
              key={i}
              className="relative w-64 h-64 shrink-0 rounded-xl overflow-hidden bg-[#242424]"
            >
              <Image
                src={src}
                alt={`${product.name} ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
        <div className="px-5 pb-6">
          <h2 className="text-xl font-bold text-[#f0f0f0]">{product.name}</h2>
          <p className="text-2xl font-bold text-[#e65100] mt-1">
            {formatLKR(product.price_lkr)}
          </p>
          <p className="text-sm text-[#8a8a8a] mt-1">{product.category}</p>
          {product.is_perishable && (
            <p className="text-sm text-[#f59e0b] mt-2 font-medium">
              Perishable — delivery date matters
            </p>
          )}
          {hasVariants(product) && (
            <div className="mt-3 text-sm text-[#8a8a8a]">
              {product.variants?.sizes && (
                <p>Sizes: {product.variants.sizes.join(", ")}</p>
              )}
              {product.variants?.colors && (
                <p>Colors: {product.variants.colors.join(", ")}</p>
              )}
              {product.variants?.flavors && (
                <p>Flavors: {product.variants.flavors.join(", ")}</p>
              )}
            </div>
          )}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#ff8f4e] underline mt-2 inline-block"
          >
            View on Kapruka →
          </a>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!product.in_stock}
            className="w-full mt-4 py-3 rounded-xl bg-[#e65100] text-white font-bold disabled:opacity-40 hover:bg-[#ff8f4e]"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
