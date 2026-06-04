"use client";

import { formatLKR } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";

interface CheckoutPanelProps {
  onCheckout: () => void;
}

export default function CheckoutPanel({ onCheckout }: CheckoutPanelProps) {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.totalLkr());
  const delivery = useCartStore((s) => s.deliveryCostLkr);

  if (items.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onCheckout}
      className="w-full py-3 rounded-xl bg-[#e65100] text-white font-semibold hover:bg-[#ff8f4e] transition-colors"
    >
      Checkout via chat / කතාවෙන් ගෙවන්න
    </button>
  );
}
