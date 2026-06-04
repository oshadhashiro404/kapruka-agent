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
}

export default function CartDrawer({
  open,
  onClose,
  onCheckout,
}: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const setGiftMessage = useCartStore((s) => s.setGiftMessage);
  const [giftProductId, setGiftProductId] = useState<string | null>(null);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[380px] bg-[#1a1a1a] border-l border-[#2e2e2e] z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#2e2e2e] bg-[#242424]">
          <div>
            <h2 className="font-semibold text-[#f0f0f0]">Your cart</h2>
            <p className="font-sinhala text-xs text-[#8a8a8a]">කරත්තය</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-[#8a8a8a] hover:text-[#f0f0f0] hover:bg-[#2e2e2e] text-xl"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="text-center text-[#8a8a8a] py-12 text-sm leading-relaxed">
              Your cart is empty.
              <br />
              <span className="font-sinhala">කරත්ත හිස්.</span>
              <br />
              <span className="text-[#f0f0f0] mt-2 block">
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
        {items.length > 0 && <CartSummary onCheckout={onCheckout} />}
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
