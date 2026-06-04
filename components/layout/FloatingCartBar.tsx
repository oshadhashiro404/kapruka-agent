"use client";

import { useCartStore } from "@/lib/cart-store";
import { formatLKR } from "@/lib/utils";

interface FloatingCartBarProps {
  onOpenCart: () => void;
}

export default function FloatingCartBar({ onOpenCart }: FloatingCartBarProps) {
  const itemCount = useCartStore((s) => s.itemCount());
  const totalLkr = useCartStore((s) => s.totalLkr());
  const delivery = useCartStore((s) => s.deliveryCostLkr);

  if (itemCount === 0) return null;

  return (
    <div className="lg:hidden shrink-0 px-4 pb-2 animate-slide-in-right">
      <button
        type="button"
        onClick={onOpenCart}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-elevated border border-border shadow-lg shadow-black/30 hover:border-primary/50 transition-colors"
        aria-label="View cart"
      >
        <span className="text-sm font-medium text-foreground">
          {itemCount} item{itemCount !== 1 ? "s" : ""} in cart
        </span>
        <span className="text-sm font-bold text-primary">
          {formatLKR(totalLkr + delivery)}
        </span>
      </button>
    </div>
  );
}
