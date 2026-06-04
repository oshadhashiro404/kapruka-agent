"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import CartDrawer from "@/components/cart/CartDrawer";
import ProductModal from "@/components/products/ProductModal";
import VariantSelector from "@/components/products/VariantSelector";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatTabs from "./ChatTabs";
import { chatStream, checkHealth } from "@/lib/api";
import {
  getCachedHealth,
  setCachedHealth,
  useChatStore,
} from "@/lib/chat-store";
import { useCartStore } from "@/lib/cart-store";
import type { ChatMessage, ConversationState, Product } from "@/lib/types";
import {
  dedupeProducts,
  generateId,
  hasVariants,
  toUserFriendlyError,
} from "@/lib/utils";
import type { ChatMode } from "@/lib/types";

const ASSISTANT_ID = "assistant-stream";
export default function ChatInterface() {
  const [isLoading, setIsLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [backendOk, setBackendOk] = useState(true);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const healthCheckedRef = useRef(false);

  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const sessions = useChatStore((s) => s.sessions);
  const updateSessionMessages = useChatStore((s) => s.updateSessionMessages);
  const setSessionTitle = useChatStore((s) => s.setSessionTitle);
  const setServerContext = useChatStore((s) => s.setServerContext);
  const addSession = useChatStore((s) => s.addSession);
  const switchSession = useChatStore((s) => s.switchSession);

  const mode = useCartStore((s) => s.mode);
  const items = useCartStore((s) => s.items);
  const setMode = useCartStore((s) => s.setMode);
  const addItem = useCartStore((s) => s.addItem);
  const setItems = useCartStore((s) => s.setItems);
  const setDeliveryCost = useCartStore((s) => s.setDeliveryCost);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages: ChatMessage[] = (activeSession?.messages ?? []).map((m) => ({
    ...m,
    timestamp:
      typeof m.timestamp === "string" ? new Date(m.timestamp) : m.timestamp,
  }));

  const conversationState: ConversationState = (() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.id !== ASSISTANT_ID);
    const hasProducts = messages.some(
      (m) => m.role === "assistant" && (m.products?.length ?? 0) > 0
    );
    if (!lastAssistant) {
      return messages.length === 0 ? "empty" : hasProducts ? "products" : "empty";
    }
    if (lastAssistant.pay_url) return "ordered";
    if (lastAssistant.delivery_quote) return "delivery";
    if (lastAssistant.products?.length) return "products";
    return "empty";
  })();

  useEffect(() => {
    if (healthCheckedRef.current) return;
    healthCheckedRef.current = true;

    if (getCachedHealth() === true) {
      setBackendOk(true);
    }

    checkHealth()
      .then(() => {
        setBackendOk(true);
        setCachedHealth(true);
      })
      .catch(() => {
        setBackendOk(false);
      });
  }, []);

  useEffect(() => {
    if (!cartToast) return;
    const t = setTimeout(() => setCartToast(null), 2500);
    return () => clearTimeout(t);
  }, [cartToast]);

  const updateAssistant = useCallback(
    (updater: (msg: ChatMessage) => ChatMessage) => {
      if (!activeSessionId) return;
      updateSessionMessages(activeSessionId, (prev) => {
        const idx = prev.findIndex((m) => m.id === ASSISTANT_ID);
        if (idx === -1) {
          const base: ChatMessage = {
            id: ASSISTANT_ID,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          };
          return [...prev, updater(base)];
        }
        const next = [...prev];
        next[idx] = updater(next[idx]);
        return next;
      });
    },
    [activeSessionId, updateSessionMessages]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !activeSessionId) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      const session = useChatStore.getState().sessions.find(
        (s) => s.id === activeSessionId
      );
      if (session?.title === "New chat" || session?.title === "") {
        setSessionTitle(
          activeSessionId,
          text.trim().slice(0, 32) +
            (text.trim().length > 32 ? "…" : "")
        );
      }

      updateSessionMessages(activeSessionId, (prev) => [
        ...prev.filter((m) => m.id !== ASSISTANT_ID),
        userMsg,
        {
          id: ASSISTANT_ID,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);
      setIsLoading(true);
      setStreamStatus(undefined);

      let textBuffer = "";

      const effectiveMode: ChatMode =
        mode === "auto"
          ? /gift|present|birthday|wedding|avurudu|vesak|මල|තෑග්/i.test(text)
            ? "gift"
            : "shopping"
          : mode;

      if (mode === "auto") {
        setMode(effectiveMode);
      }

      const historyMessages = (session?.messages ?? [])
        .filter((m) => m.id !== ASSISTANT_ID && m.content.trim())
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      try {
        await chatStream(
          text.trim(),
          activeSessionId,
          items,
          effectiveMode,
          {
            onText: (chunk) => {
              if (!chunk) return;
              textBuffer =
                chunk.length >= textBuffer.length &&
                chunk.startsWith(textBuffer.slice(0, 20))
                  ? chunk
                  : textBuffer + chunk;
              updateAssistant((m) => ({ ...m, content: textBuffer }));
            },
            onProducts: (productItems) => {
              setBackendOk(true);
              setCachedHealth(true);
              updateAssistant((m) => ({
                ...m,
                products: dedupeProducts([
                  ...(m.products ?? []),
                  ...productItems,
                ]),
              }));
            },
            onDeliveryQuote: (quote) => {
              setDeliveryCost(quote.delivery_cost_lkr);
              updateAssistant((m) => ({
                ...m,
                delivery_quote: quote,
              }));
            },
            onOrderCreated: (payUrl, orderId, expiresIn) => {
              updateAssistant((m) => ({
                ...m,
                pay_url: payUrl,
                order_id: orderId,
                expires_in: expiresIn,
              }));
            },
            onPerishableWarning: (message, alternatives) => {
              updateAssistant((m) => ({
                ...m,
                perishable_warning: message,
                perishable_alternatives: alternatives,
              }));
            },
            onCartUpdate: (cart) => {
              setItems(cart);
            },
            onStatus: (message) => {
              setStreamStatus(message);
            },
            onChips: (chipItems) => {
              updateAssistant((m) => ({
                ...m,
                chips: chipItems,
              }));
            },
            onError: (message) => {
              const friendly = toUserFriendlyError(message);
              updateAssistant((m) => ({
                ...m,
                content: m.content?.includes(friendly)
                  ? m.content
                  : friendly,
              }));
            },
            onSessionContext: (ctx) => {
              setServerContext(activeSessionId, ctx);
            },
            onDone: () => {
              setIsLoading(false);
              setStreamStatus(undefined);
              updateSessionMessages(activeSessionId, (prev) =>
                prev.map((m) =>
                  m.id === ASSISTANT_ID
                    ? { ...m, id: generateId(), timestamp: new Date() }
                    : m
                )
              );
            },
          },
          abortRef.current.signal,
          {
            messages: historyMessages,
            context: session?.serverContext,
          }
        );
      } catch {
        updateAssistant((m) => ({
          ...m,
          content:
            m.content ||
            "Kapruka is having a moment. Please try again.",
        }));
        setIsLoading(false);
        setStreamStatus(undefined);
      }
    },
    [
      isLoading,
      activeSessionId,
      items,
      mode,
      setMode,
      setItems,
      setDeliveryCost,
      updateAssistant,
      updateSessionMessages,
      setSessionTitle,
      setServerContext,
    ]
  );

  const handleNewChat = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    addSession();
  };

  const handleSwitchTab = (id: string) => {
    abortRef.current?.abort();
    setIsLoading(false);
    switchSession(id);
  };

  const handleAddProduct = (product: Product) => {
    if (!product.in_stock) return;
    if (hasVariants(product)) {
      setVariantProduct(product);
    } else {
      addItem(product, undefined, mode === "gift");
      setCartToast(`Added ${product.name}`);
    }
  };

  const handleCheckout = () => {
    setCartOpen(false);
    const summary = items
      .map((i) => `${i.quantity}x ${i.product.name} (${i.product.id})`)
      .join(", ");
    sendMessage(
      `I'd like to checkout. My cart has: ${summary}. Please help me with delivery details and payment.`
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0f0f0f] relative">
      <Header onCartClick={() => setCartOpen(true)} />
      <ChatTabs onNewChat={handleNewChat} onSwitch={handleSwitchTab} />
      {!backendOk && (
        <div className="bg-[#2a1f00] border-b border-[#f59e0b]/40 text-[#f59e0b] text-center text-sm py-2 px-4">
          Cannot reach the API. Run pnpm dev in frontend, or check GROQ_API_KEY on Vercel.
        </div>
      )}
      {cartToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-[#242424] border border-[#e65100] text-sm text-[#f0f0f0] animate-slide-in-right shadow-lg">
          {cartToast}
        </div>
      )}
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        status={streamStatus}
        onOccasionSelect={sendMessage}
        onView={setModalProduct}
        onAdd={handleAddProduct}
        onSendChip={sendMessage}
      />
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        conversationState={conversationState}
      />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
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
