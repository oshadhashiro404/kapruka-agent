"use client";

import Image from "next/image";
import type { CartItem } from "@/lib/types";
import { formatLKR, productImageSrc } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";

interface CartItemRowProps {
  item: CartItem;
  onEditGift?: () => void;
}

export default function CartItemRow({ item, onEditGift }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const toggleGift = useCartStore((s) => s.toggleGift);
  const variant = item.selected_variant;

  const img = productImageSrc(
    item.product.image_url || item.product.images?.[0] || ""
  );

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-elevated shrink-0">
        {img && (
          <Image
            src={img}
            alt={item.product.name}
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground line-clamp-2">
          {item.product.name}
        </h4>
        {item.selected_variant && (
          <p className="text-xs text-muted">{item.selected_variant}</p>
        )}
        <button
          type="button"
          onClick={() => toggleGift(item.product.id, variant)}
          className="text-xs text-muted mt-0.5 hover:text-primary"
        >
          {item.is_gift ? "🎁 Gift" : "Make this a gift"}
        </button>
        {item.is_gift && onEditGift && (
          <button
            type="button"
            onClick={onEditGift}
            className="text-xs text-primary mt-0.5 hover:underline block"
          >
            {item.gift_message ? "Edit gift message" : "Add gift message"}
          </button>
        )}
        <p className="text-primary font-semibold text-sm mt-1">
          {formatLKR(item.product.price_lkr * item.quantity)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() =>
              updateQuantity(item.product.id, item.quantity - 1, variant)
            }
            className="w-7 h-7 rounded-lg border border-border bg-elevated text-foreground text-sm"
          >
            −
          </button>
          <span className="text-sm text-foreground w-5 text-center">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              updateQuantity(item.product.id, item.quantity + 1, variant)
            }
            className="w-7 h-7 rounded-lg border border-border bg-elevated text-foreground text-sm"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => removeItem(item.product.id, variant)}
            className="ml-auto text-xs text-danger hover:opacity-80"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
