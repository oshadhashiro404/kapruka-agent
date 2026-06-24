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

function BotAvatar() {
  return (
    <span
      className="inline-flex w-8 h-8 rounded-full bg-primary/10 border border-border items-center justify-center shrink-0"
      aria-hidden
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-chat-glow"
      >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
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

  const hasProducts =
    !isUser && message.products && message.products.length > 0;

  if (isUser) {
    return (
      <div
        className="animate-fade-in-up flex justify-end"
        role="article"
        aria-label="Your message"
      >
        <div className="max-w-[85%] sm:max-w-[75%] bg-chat-user text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          {displayContent && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in-up flex flex-col gap-2"
      role="article"
      aria-label="Assistant message"
    >
      <div className="flex justify-start gap-2.5 items-start">
        <BotAvatar />
        <div className="max-w-[85%] sm:max-w-[75%] bg-chat-bot border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-3.5">
          {displayContent && (
            <p
              className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                isSinhala(displayContent) ? "font-sinhala" : ""
              }`}
            >
              {displayContent}
            </p>
          )}

          {message.chips && message.chips.length > 0 && onSendChip && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onSendChip(chip)}
                  className="px-3 py-1.5 rounded-full text-xs bg-elevated border border-border text-foreground hover:bg-primary hover:text-white hover:border-primary transition-colors animate-chip-pop focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {message.delivery_quote && (
            <div className="mt-3">
              <DeliveryCard quote={message.delivery_quote} />
            </div>
          )}

          {message.perishable_warning && (
            <PerishableWarning
              message={message.perishable_warning}
              alternatives={message.perishable_alternatives}
              onView={onView}
              onAdd={onAdd}
            />
          )}

          {message.pay_url && message.order_id && (
            <PayButton
              key={`${message.order_id}-${message.expires_in ?? 3600}`}
              payUrl={message.pay_url}
              orderId={message.order_id}
              expiresIn={message.expires_in ?? 3600}
            />
          )}
        </div>
      </div>

      {hasProducts && (
        <div className="pl-[42px]">
          <ProductCarousel
            products={message.products!}
            onView={onView}
            onAdd={onAdd}
            searchQuery={sessionContext?.lastSearchQuery}
            onLoadMore={(newProducts) =>
              onProductsAppend?.(message.id, newProducts)
            }
          />
        </div>
      )}
    </div>
  );
}
