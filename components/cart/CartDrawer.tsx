"use client";

import { useState } from "react";
import CartItemRow from "./CartItemRow";
import CartSummary from "./CartSummary";
import SinhalaHelper from "@/components/ui/SinhalaHelper";
import { useCartStore } from "@/lib/cart-store";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onOpenWizard: () => void;
}

export default function CartDrawer({
  open,
  onClose,
  onCheckout,
  onOpenWizard,
}: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const setGiftMessage = useCartStore((s) => s.setGiftMessage);
  const [giftProductId, setGiftProductId] = useState<string | null>(null);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={`lg:hidden fixed right-0 top-0 h-full w-full sm:w-[380px] bg-surface border-l border-border z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-elevated">
          <div>
            <h2 className="font-semibold text-foreground">Your cart</h2>
            <p className="font-sinhala text-xs text-muted">කරත්තය</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-muted hover:text-foreground hover:bg-border text-xl"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="text-center text-muted py-12 text-sm leading-relaxed">
              Your cart is empty.
              <br />
              <span className="font-sinhala">කරත්ත හිස්.</span>
              <br />
              <span className="text-foreground mt-2 block">
                Ask Kapruka in chat to find and add items.
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
          <div className="shrink-0 border-t border-border">
            <div className="px-4 pt-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWizard();
                }}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors mb-2"
              >
                Continue to checkout
              </button>
            </div>
            <CartSummary onCheckout={onCheckout} />
          </div>
        )}
      </div>
      {giftProductId && (
        <SinhalaHelper
          onClose={() => setGiftProductId(null)}
          onSave={(en, si) => {
            setGiftMessage(giftProductId, en, si);
            setGiftProductId(null);
          }}
        />
      )}
    </>
  );
}
