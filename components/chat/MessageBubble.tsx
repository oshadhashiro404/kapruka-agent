"use client";

import DeliveryCard from "@/components/delivery/DeliveryCard";
import PerishableWarning from "@/components/delivery/PerishableWarning";
import PayButton from "@/components/checkout/PayButton";
import ProductCarousel from "@/components/products/ProductCarousel";
import type { ChatMessage, Product, SessionContext } from "@/lib/types";
import { stripJsonFromDisplay } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  sessionContext?: SessionContext;
  onView: (product: Product) => void;
  onAdd: (product: Product) => void;
  onSendChip?: (message: string) => void;
  onProductsAppend?: (messageId: string, products: Product[]) => void;
}

function isSinhala(text: string): boolean {
  return /[\u0D80-\u0DFF]/.test(text);
}

function KaprukaMark() {
  return (
    <span
      className="inline-flex w-6 h-6 rounded-full bg-primary/20 items-center justify-center text-[10px] font-bold text-primary shrink-0"
      aria-hidden
    >
      K
    </span>
  );
}

export default function MessageBubble({
  message,
  sessionContext,
  onView,
  onAdd,
  onSendChip,
  onProductsAppend,
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
            ? "max-w-[85%] sm:max-w-[75%] bg-primary text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm shadow-primary/20"
            : "max-w-full w-full bg-surface border border-border border-l-2 border-l-primary/50 text-foreground rounded-2xl rounded-bl-sm px-4 py-3.5"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/60">
            <KaprukaMark />
            <span className="text-xs font-medium text-muted">
              Shopping assistant
            </span>
          </div>
        )}

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
                className="px-3 py-1.5 rounded-full text-xs bg-transparent border border-primary/60 text-foreground hover:bg-primary hover:border-primary transition-colors animate-chip-pop focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {!isUser && message.products && message.products.length > 0 && (
          <div className="mt-3">
            <ProductCarousel
              products={message.products}
              onView={onView}
              onAdd={onAdd}
              searchQuery={sessionContext?.lastSearchQuery}
              onLoadMore={(newProducts) =>
                onProductsAppend?.(message.id, newProducts)
              }
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
            key={`${message.order_id}-${message.expires_in ?? 3600}`}
            payUrl={message.pay_url}
            orderId={message.order_id}
            expiresIn={message.expires_in ?? 3600}
          />
        )}
      </div>
    </div>
  );
}
