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

  const img = productImageSrc(
    item.product.image_url || item.product.images?.[0] || ""
  );

  return (
    <div className="flex gap-3 py-3 border-b border-[#2e2e2e] last:border-0">
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#242424] shrink-0">
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
        <h4 className="font-medium text-sm text-[#f0f0f0] line-clamp-2">
          {item.product.name}
        </h4>
        {item.selected_variant && (
          <p className="text-xs text-[#8a8a8a]">{item.selected_variant}</p>
        )}
        {item.is_gift && (
          <button
            type="button"
            onClick={onEditGift}
            className="text-xs text-[#e65100] mt-0.5 hover:underline"
          >
            {item.gift_message ? "Edit gift message" : "Add gift message"}
          </button>
        )}
        <p className="text-[#e65100] font-semibold text-sm mt-1">
          {formatLKR(item.product.price_lkr * item.quantity)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
            className="w-7 h-7 rounded-lg border border-[#2e2e2e] bg-[#242424] text-[#f0f0f0] text-sm"
          >
            −
          </button>
          <span className="text-sm text-[#f0f0f0] w-5 text-center">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
            className="w-7 h-7 rounded-lg border border-[#2e2e2e] bg-[#242424] text-[#f0f0f0] text-sm"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => removeItem(item.product.id)}
            className="ml-auto text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
