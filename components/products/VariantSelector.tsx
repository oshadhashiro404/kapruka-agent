"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatLKR } from "@/lib/utils";

interface VariantSelectorProps {
  product: Product;
  onConfirm: (variant?: string) => void;
  onCancel: () => void;
}

export default function VariantSelector({
  product,
  onConfirm,
  onCancel,
}: VariantSelectorProps) {
  const [selected, setSelected] = useState<string | undefined>();

  const groups: { label: string; options: string[] }[] = [];
  if (product.variants?.sizes?.length) {
    groups.push({ label: "Size", options: product.variants.sizes });
  }
  if (product.variants?.colors?.length) {
    groups.push({ label: "Color", options: product.variants.colors });
  }
  if (product.variants?.flavors?.length) {
    groups.push({ label: "Flavor", options: product.variants.flavors });
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] p-5">
        <h3 className="font-bold text-lg text-[#f0f0f0] mb-1">{product.name}</h3>
        <p className="text-[#e65100] font-bold mb-4">
          {formatLKR(product.price_lkr)}
        </p>
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <p className="text-sm font-medium text-[#8a8a8a] mb-2">{g.label}</p>
            <div className="flex flex-wrap gap-2">
              {g.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelected(opt)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    selected === opt
                      ? "border-[#e65100] bg-[#2a1f00] text-[#ff8f4e] font-semibold"
                      : "border-[#2e2e2e] text-[#f0f0f0]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#2e2e2e] text-[#8a8a8a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={groups.length > 0 && !selected}
            className="flex-1 py-2.5 rounded-xl bg-[#e65100] text-white font-semibold disabled:opacity-40"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
