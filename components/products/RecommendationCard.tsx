"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { getCategoryIcon, getCategoryLabel } from "@/lib/category-icons";
import type { Product } from "@/lib/types";
import { formatLKR } from "@/lib/utils";

interface RecommendationCardProps {
  product: Product;
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
}

export default function RecommendationCard({
  product,
  onView,
  onAdd,
}: RecommendationCardProps) {
  const [addingAnim, setAddingAnim] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.in_stock) return;
    setAddingAnim(true);
    onAdd(product);
    setTimeout(() => setAddingAnim(false), 380);
  };

  return (
    <article
      className="shrink-0 w-[152px] flex flex-col rounded-2xl bg-chat-bot border border-chat-glow/30 shadow-[0_0_20px_-8px_rgba(157,114,255,0.35)] hover:border-chat-glow/50 transition-all duration-200 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => onView(product)}
        className="flex flex-col flex-1 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={`View ${product.name}`}
      >
        <div className="relative h-[120px] p-3 flex items-center justify-center">
          <ProductImage
            name={product.name}
            imageUrl={product.image_url}
            images={product.images}
            inStock={product.in_stock}
            className="relative w-full h-full rounded-xl"
            imgClassName="object-contain p-1"
          />
        </div>
        <div className="px-3 pb-2 flex-1 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug w-full">
            {product.name}
          </h3>
          <p className="text-xs font-bold text-primary mt-1">
            {product.price_lkr > 0 ? formatLKR(product.price_lkr) : "—"}
          </p>
        </div>
      </button>

      <div className="px-3 pb-3 flex flex-col gap-2">
        <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-[10px] font-medium text-foreground mx-auto">
          {getCategoryIcon(product.category)}
          <span className="truncate max-w-[90px]">
            {getCategoryLabel(product.category)}
          </span>
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!product.in_stock}
          className={`w-full py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40 hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            addingAnim ? "animate-add-burst" : ""
          }`}
        >
          {product.in_stock ? "Add" : "Out of stock"}
        </button>
      </div>
    </article>
  );
}
