"use client";

import { useCallback, useEffect, useState } from "react";
import CheckoutWizard from "@/components/checkout/CheckoutWizard";
import ProductModal from "@/components/products/ProductModal";
import VariantSelector from "@/components/products/VariantSelector";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import { useBackendHealth } from "@/lib/chat/useBackendHealth";
import { useCategories } from "@/lib/chat/useCategories";
import { useChatSession, getLastOrderId } from "@/lib/chat/useChatSession";
import { useChatStreaming } from "@/lib/chat/useChatStreaming";
import { isCheckoutChip } from "@/lib/chat-intents";
import { useCartStore } from "@/lib/cart-store";
import type { ChatMessage, Product } from "@/lib/types";
import { generateId, hasVariants, mergeProductUpdates, stripJsonFromDisplay } from "@/lib/utils";
import { useSpeechInput } from "@/lib/voice/useSpeechInput";
import { useVoicePlayback } from "@/lib/voice/useVoicePlayback";

export default function ChatInterface() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const { backendOk, markHealthy } = useBackendHealth();
  const { categories, loading: categoriesLoading } = useCategories();
  const {
    activeSessionId,
    activeSession,
    messages,
    conversationState,
    updateSessionMessages,
    setServerContext,
    maybeSetSessionTitle,
    handleNewChat,
  } = useChatSession();
  const lastOrderId = getLastOrderId(messages);

  const { isSpeaking, speak, stopSpeaking } = useVoicePlayback();
  const {
    isListening,
    isTranscribing,
    startListening,
    stopListening,
  } = useSpeechInput();

  const openCheckout = useCallback(() => {
    setCheckoutKey((k) => k + 1);
    setCheckoutOpen(true);
  }, []);

  const handleAssistantComplete = useCallback(
    (text: string) => {
      if (!voiceMode) return;
      const spoken = stripJsonFromDisplay(text).trim();
      if (!spoken) return;
      void speak(spoken).catch(() => {
        setVoiceError("Could not play speech. Check ElevenLabs settings.");
      });
    },
    [voiceMode, speak]
  );

  const { isLoading, streamStatus, sendMessage, abortStream } = useChatStreaming({
    onOpenCheckout: openCheckout,
    onCartToast: setCartToast,
    markHealthy,
    onAssistantComplete: handleAssistantComplete,
  });

  const mode = useCartStore((s) => s.mode);
  const setActiveCategory = useCartStore((s) => s.setActiveCategory);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!cartToast) return;
    const t = setTimeout(() => setCartToast(null), 2500);
    return () => clearTimeout(t);
  }, [cartToast]);

  useEffect(() => {
    if (!voiceError) return;
    const t = setTimeout(() => setVoiceError(null), 4000);
    return () => clearTimeout(t);
  }, [voiceError]);

  const handleSend = useCallback(
    (text: string) => {
      if (!activeSessionId) return;
      stopSpeaking();
      void sendMessage(text, activeSessionId, {
        onTitleFromFirstMessage: (t) =>
          maybeSetSessionTitle(activeSessionId, t),
      });
    },
    [activeSessionId, sendMessage, maybeSetSessionTitle, stopSpeaking]
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
      setCartToast(
        mode === "gift"
          ? `Added ${product.name} — add a gift card message from your cart`
          : `Added ${product.name}`
      );
    }
  };

  const handleMicClick = useCallback(async () => {
    setVoiceError(null);
    if (isListening) {
      try {
        const transcript = await stopListening();
        handleSend(transcript);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Voice input failed";
        setVoiceError(message);
      }
      return;
    }

    try {
      stopSpeaking();
      await startListening();
      setVoiceMode(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Microphone access denied. Allow mic permission and try again.";
      setVoiceError(message);
    }
  }, [isListening, stopListening, startListening, handleSend, stopSpeaking]);

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
        chips: [`Track order ${orderId}`, "New search"],
        timestamp: new Date(),
      };
      updateSessionMessages(activeSessionId, (prev) => [
        ...prev,
        userMsg,
        assistantMsg,
      ]);
      setServerContext(activeSessionId, {
        ...(activeSession?.serverContext ?? {}),
        lastOrderId: orderId,
      });
    },
    [activeSessionId, activeSession?.serverContext, setServerContext, updateSessionMessages]
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
      <header className="shrink-0 z-20 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface/50 backdrop-blur-xl shadow-sm">
        <span className="text-sm font-semibold text-foreground bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Kapruka AI</span>
        <button
          type="button"
          onClick={() => handleNewChat(abortStream)}
          className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted hover:text-foreground hover:border-primary/40 bg-black/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          New chat
        </button>
      </header>

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
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-elevated border border-primary text-sm text-foreground animate-slide-in-right shadow-lg"
          role="status"
        >
          {cartToast}
        </div>
      )}

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
          if (/VPAY827982BA\s*\(demo\)/i.test(chip)) {
            handleSend("Track order VPAY827982BA");
            return;
          }
          if (isCheckoutChip(chip)) {
            openCheckout();
            return;
          }
          handleSend(chip);
        }}
        onProductsAppend={handleProductsAppend}
      />

      <ChatInput
        onSend={handleSend}
        onOpenCheckout={openCheckout}
        disabled={isLoading || isTranscribing}
        conversationState={conversationState}
        lastOrderId={lastOrderId}
        voiceMode={voiceMode}
        onVoiceModeChange={setVoiceMode}
        isRecording={isListening}
        isTranscribing={isTranscribing}
        isSpeaking={isSpeaking}
        voiceError={voiceError}
        onMicClick={() => void handleMicClick()}
        onStopSpeaking={stopSpeaking}
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
