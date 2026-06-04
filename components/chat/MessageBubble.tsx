"use client";

import DeliveryCard from "@/components/delivery/DeliveryCard";
import PerishableWarning from "@/components/delivery/PerishableWarning";
import PayButton from "@/components/checkout/PayButton";
import ProductCarousel from "@/components/products/ProductCarousel";
import type { ChatMessage, Product } from "@/lib/types";
import { stripJsonFromDisplay } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  onSendChip?: (message: string) => void;
}

function isSinhala(text: string): boolean {
  return /[\u0D80-\u0DFF]/.test(text);
}

export default function MessageBubble({
  message,
  onView,
  onAdd,
  onSendChip,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const displayContent = isUser
    ? message.content
    : stripJsonFromDisplay(message.content);

  return (
    <div
      className={`animate-fade-in-up flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`${
          isUser
            ? "max-w-[75%] bg-[#e65100] text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm shadow-[#e65100]/20"
            : "max-w-[92%] w-full sm:max-w-[88%] bg-[#1a1a1a] border border-[#2e2e2e] border-l-2 border-l-[#e65100]/50 text-[#f0f0f0] rounded-2xl rounded-bl-sm px-4 py-3.5"
        }`}
      >
        {displayContent && (
          <p
            className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
              !isUser && isSinhala(displayContent) ? "font-sinhala" : ""
            }`}
          >
            {displayContent}
          </p>
        )}

        {!isUser && message.chips && message.chips.length > 0 && onSendChip && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onSendChip(chip)}
                className="px-3 py-1.5 rounded-full text-xs bg-transparent border border-[#e65100]/60 text-[#f0f0f0] hover:bg-[#e65100] hover:border-[#e65100] transition-colors animate-chip-pop"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {!isUser && message.products && message.products.length > 0 && (
          <div className="mt-3 space-y-2">
            <ProductCarousel
              products={message.products}
              onView={onView}
              onAdd={onAdd}
            />
          </div>
        )}

        {!isUser && message.delivery_quote && (
          <div className="mt-3">
            <DeliveryCard quote={message.delivery_quote} />
          </div>
        )}

        {!isUser && message.perishable_warning && (
          <PerishableWarning
            message={message.perishable_warning}
            alternatives={message.perishable_alternatives}
            onView={onView}
            onAdd={onAdd}
          />
        )}

        {!isUser && message.pay_url && message.order_id && (
          <PayButton
            payUrl={message.pay_url}
            orderId={message.order_id}
            expiresIn={message.expires_in ?? 3600}
          />
        )}
      </div>
    </div>
  );
}
