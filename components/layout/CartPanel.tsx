"use client";

import { useState } from "react";
import CartItemRow from "@/components/cart/CartItemRow";
import CartSummary from "@/components/cart/CartSummary";
import SinhalaHelper from "@/components/ui/SinhalaHelper";
import { useCartStore } from "@/lib/cart-store";
import { formatLKR } from "@/lib/utils";

interface CartPanelProps {
  onCheckout: () => void;
  onOpenWizard: () => void;
}

export default function CartPanel({
  onCheckout,
  onOpenWizard,
}: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore((s) => s.itemCount());
  const totalLkr = useCartStore((s) => s.totalLkr());
  const delivery = useCartStore((s) => s.deliveryCostLkr);
  const setGiftMessage = useCartStore((s) => s.setGiftMessage);
  const [giftProductId, setGiftProductId] = useState<string | null>(null);

  return (
    <aside className="hidden lg:flex flex-col w-[320px] shrink-0 border-l border-border bg-surface h-full min-h-0">
      <div className="px-4 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Your cart</h2>
        <p className="font-sinhala text-xs text-muted">කරත්තය</p>
        {itemCount > 0 && (
          <p className="text-sm text-primary font-bold mt-1">
            {formatLKR(totalLkr + delivery)}
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 min-h-0">
        {items.length === 0 ? (
          <p className="text-center text-muted py-12 text-sm leading-relaxed">
            Your cart is empty.
            <br />
            <span className="font-sinhala">කරත්ත හිස්.</span>
            <br />
            <span className="text-foreground mt-2 block">
              Chat with Kapruka to find gifts and more.
            </span>
          </p>
        ) : (
          items.map((item) => (
            <CartItemRow
              key={`${item.product.id}-${item.selected_variant}`}
              item={item}
              onEditGift={
                item.is_gift
                  ? () => setGiftProductId(item.product.id)
                  : undefined
              }
            />
          ))
        )}
      </div>
      {items.length > 0 && (
        <div className="shrink-0 border-t border-border px-4 py-3 space-y-2">
          <button
            type="button"
            onClick={onOpenWizard}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            Continue to checkout
          </button>
          <button
            type="button"
            onClick={onCheckout}
            className="w-full py-2 rounded-xl border border-border text-muted text-sm hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Checkout via chat
          </button>
          <CartSummary onCheckout={onOpenWizard} hideButton />
        </div>
      )}
      {giftProductId && (
        <SinhalaHelper
          onClose={() => setGiftProductId(null)}
          onSave={(en, si) => {
            setGiftMessage(giftProductId, en, si);
            setGiftProductId(null);
          }}
        />
      )}
    </aside>
  );
}
