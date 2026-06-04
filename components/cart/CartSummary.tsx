"use client";

import { formatLKR } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import CheckoutPanel from "@/components/checkout/CheckoutPanel";

interface CartSummaryProps {
  onCheckout: () => void;
}

export default function CartSummary({ onCheckout }: CartSummaryProps) {
  const total = useCartStore((s) => s.totalLkr());
  const delivery = useCartStore((s) => s.deliveryCostLkr);
  const count = useCartStore((s) => s.itemCount());

  return (
    <div className="border-t border-[#2e2e2e] p-4 bg-[#242424]">
      <div className="flex justify-between text-sm text-[#8a8a8a] mb-1">
        <span>{count} item(s)</span>
        <span className="text-[#f0f0f0]">{formatLKR(total)}</span>
      </div>
      {delivery > 0 && (
        <div className="flex justify-between text-sm text-[#8a8a8a] mb-2">
          <span>Delivery</span>
          <span>{formatLKR(delivery)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-lg mb-4 text-[#f0f0f0]">
        <span>Total</span>
        <span className="text-[#e65100]">{formatLKR(total + delivery)}</span>
      </div>
      <CheckoutPanel onCheckout={onCheckout} />
    </div>
  );
}
