"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Header from "@/components/layout/Header";
import FloatingCartBar from "@/components/layout/FloatingCartBar";
import CartDrawer from "@/components/cart/CartDrawer";
import CheckoutWizard from "@/components/checkout/CheckoutWizard";
import ProductModal from "@/components/products/ProductModal";
import VariantSelector from "@/components/products/VariantSelector";
import CategoryNav from "@/components/ui/CategoryNav";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatTabs from "./ChatTabs";
import { useBackendHealth } from "@/lib/chat/useBackendHealth";
import { useCategories } from "@/lib/chat/useCategories";
import { useChatSession } from "@/lib/chat/useChatSession";
import { useChatStreaming } from "@/lib/chat/useChatStreaming";
import { isCheckoutChip } from "@/lib/chat-intents";
import { useCartStore } from "@/lib/cart-store";
import type { ChatMessage, Product } from "@/lib/types";
import { generateId, hasVariants, mergeProductUpdates } from "@/lib/utils";

export default function ChatInterface() {
  const [cartOpen, setCartOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [cartToast, setCartToast] = useState<string | null>(null);

  const { backendOk, markHealthy } = useBackendHealth();
  const { categories, loading: categoriesLoading } = useCategories();
  const {
    activeSessionId,
    activeSession,
    messages,
    conversationState,
    updateSessionMessages,
    maybeSetSessionTitle,
    handleNewChat,
    handleSwitchTab,
  } = useChatSession();

  const openCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutKey((k) => k + 1);
    setCheckoutOpen(true);
  }, []);

  const { isLoading, streamStatus, sendMessage, abortStream } = useChatStreaming({
    onOpenCheckout: openCheckout,
    onCartToast: setCartToast,
    markHealthy,
  });

  const mode = useCartStore((s) => s.mode);
  const activeCategory = useCartStore((s) => s.activeCategory);
  const setActiveCategory = useCartStore((s) => s.setActiveCategory);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!cartToast) return;
    const t = setTimeout(() => setCartToast(null), 2500);
    return () => clearTimeout(t);
  }, [cartToast]);

  const handleSend = useCallback(
    (text: string) => {
      if (!activeSessionId) return;
      void sendMessage(text, activeSessionId, {
        onTitleFromFirstMessage: (t) =>
          maybeSetSessionTitle(activeSessionId, t),
      });
    },
    [activeSessionId, sendMessage, maybeSetSessionTitle]
  );

  const handleCategorySelect = useCallback(
    (category: string) => {
      setActiveCategory(category);
      if (category === "All") {
        handleSend("Show me popular items on Kapruka");
      } else {
        handleSend(`Show me products in ${category} category`);
      }
    },
    [handleSend, setActiveCategory]
  );

  const handleAddProduct = (product: Product) => {
    if (!product.in_stock) return;
    if (hasVariants(product)) {
      setVariantProduct(product);
    } else {
      addItem(product, undefined, mode === "gift");
      setCartToast(`Added ${product.name}`);
    }
  };

  const handleCheckoutViaChat = () => {
    setCartOpen(false);
    setCheckoutOpen(false);
    const summary = items
      .map((i) => `${i.quantity}x ${i.product.name} (${i.product.id})`)
      .join(", ");
    handleSend(
      `I'd like to checkout. My cart has: ${summary}. Please help me with delivery details and payment.`
    );
  };

  const handleOrderComplete = useCallback(
    ({
      payUrl,
      orderId,
      expiresIn,
      summary,
    }: {
      payUrl: string;
      orderId: string;
      expiresIn: number;
      summary: string;
    }) => {
      if (!activeSessionId) return;
      setCheckoutOpen(false);
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: `Completed checkout wizard. ${summary}`,
        timestamp: new Date(),
      };
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "You're all set! Your order is ready — pay within the next hour to confirm.",
        pay_url: payUrl,
        order_id: orderId,
        expires_in: expiresIn,
        timestamp: new Date(),
      };
      updateSessionMessages(activeSessionId, (prev) => [
        ...prev,
        userMsg,
        assistantMsg,
      ]);
    },
    [activeSessionId, updateSessionMessages]
  );

  const handleProductsAppend = useCallback(
    (messageId: string, newProducts: Product[]) => {
      if (!activeSessionId) return;
      updateSessionMessages(activeSessionId, (prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                products: mergeProductUpdates(m.products ?? [], newProducts),
              }
            : m
        )
      );
    },
    [activeSessionId, updateSessionMessages]
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg relative">
      <AppShell
        browseOpen={browseOpen}
        onBrowseOpenChange={setBrowseOpen}
        categories={categories}
        categoriesLoading={categoriesLoading}
        onCategorySelect={handleCategorySelect}
        onNewChat={() => handleNewChat(abortStream)}
        onCheckoutViaChat={handleCheckoutViaChat}
        onOpenCheckoutWizard={openCheckout}
      >
        <Header
          onCartClick={() => setCartOpen(true)}
          onBrowseClick={() => setBrowseOpen(true)}
        />
        <ChatTabs
          onNewChat={() => handleNewChat(abortStream)}
          onSwitch={(id) => handleSwitchTab(id, abortStream)}
        />
        {!backendOk && (
          <div
            className="bg-warning/10 border-b border-warning/40 text-warning text-center text-sm py-2 px-4"
            role="status"
          >
            Cannot reach the API. Run pnpm dev in frontend, or check GROQ_API_KEY
            on Vercel.
          </div>
        )}
        {cartToast && (
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-elevated border border-primary text-sm text-foreground animate-slide-in-right shadow-lg"
            role="status"
          >
            {cartToast}
          </div>
        )}
        <CategoryNav
          categories={categories}
          active={activeCategory}
          onSelect={handleCategorySelect}
          loading={categoriesLoading}
        />
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          status={streamStatus}
          sessionContext={activeSession?.serverContext}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onOccasionSelect={handleSend}
          onCategorySelect={handleCategorySelect}
          onView={setModalProduct}
          onAdd={handleAddProduct}
          onSendChip={(chip) => {
            if (isCheckoutChip(chip)) {
              openCheckout();
              return;
            }
            handleSend(chip);
          }}
          onProductsAppend={handleProductsAppend}
        />
        <FloatingCartBar onOpenCart={() => setCartOpen(true)} />
        <ChatInput
          onSend={handleSend}
          onOpenCheckout={openCheckout}
          disabled={isLoading}
          conversationState={conversationState}
        />
      </AppShell>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckoutViaChat}
        onOpenWizard={() => {
          setCartOpen(false);
          openCheckout();
        }}
      />
      <CheckoutWizard
        key={checkoutKey}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        sessionContext={activeSession?.serverContext}
        onOrderComplete={handleOrderComplete}
      />
      <ProductModal
        product={modalProduct}
        onClose={() => setModalProduct(null)}
        onAdd={(p) => {
          setModalProduct(null);
          handleAddProduct(p);
        }}
      />
      {variantProduct && (
        <VariantSelector
          product={variantProduct}
          onCancel={() => setVariantProduct(null)}
          onConfirm={(variant) => {
            addItem(variantProduct, variant, mode === "gift");
            setVariantProduct(null);
            setCartToast(`Added ${variantProduct.name}`);
          }}
        />
      )}
    </div>
  );
}
