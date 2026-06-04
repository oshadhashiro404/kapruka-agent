"use client";

import { formatLKR } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import CheckoutPanel from "@/components/checkout/CheckoutPanel";

interface CartSummaryProps {
  onCheckout: () => void;
  hideButton?: boolean;
}

export default function CartSummary({
  onCheckout,
  hideButton,
}: CartSummaryProps) {
  const total = useCartStore((s) => s.totalLkr());
  const delivery = useCartStore((s) => s.deliveryCostLkr);
  const count = useCartStore((s) => s.itemCount());

  return (
    <div className="border-t border-border p-4 bg-elevated">
      <div className="flex justify-between text-sm text-muted mb-1">
        <span>{count} item(s)</span>
        <span className="text-foreground">{formatLKR(total)}</span>
      </div>
      {delivery > 0 && (
        <div className="flex justify-between text-sm text-muted mb-2">
          <span>Delivery</span>
          <span>{formatLKR(delivery)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-lg mb-4 text-foreground">
        <span>Total</span>
        <span className="text-primary">{formatLKR(total + delivery)}</span>
      </div>
      {!hideButton && <CheckoutPanel onCheckout={onCheckout} />}
    </div>
  );
}
