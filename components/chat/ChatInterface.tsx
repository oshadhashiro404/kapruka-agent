"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { chatStream, checkHealth, getCategories } from "@/lib/api";
import {
  pullRemoteChatHistory,
  scheduleChatHistorySave,
  shouldPreferRemote,
} from "@/lib/chat-history-sync";
import {
  getCachedHealth,
  setCachedHealth,
  useChatStore,
} from "@/lib/chat-store";
import { migrateLegacyUserStorage } from "@/lib/user-id";
import { useCartStore } from "@/lib/cart-store";
import type {
  ChatMessage,
  ConversationState,
  KaprukaCategory,
  Product,
} from "@/lib/types";
import {
  dedupeProducts,
  mergeProductUpdates,
  generateId,
  hasVariants,
  toUserFriendlyError,
} from "@/lib/utils";
import type { ChatMode } from "@/lib/types";

const ASSISTANT_ID = "assistant-stream";

export default function ChatInterface() {
  const [isLoading, setIsLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [backendOk, setBackendOk] = useState(
    () => getCachedHealth() !== false
  );
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | undefined>();
  const [categories, setCategories] = useState<KaprukaCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
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
  const activeCategory = useCartStore((s) => s.activeCategory);
  const setActiveCategory = useCartStore((s) => s.setActiveCategory);
  const items = useCartStore((s) => s.items);
  const setMode = useCartStore((s) => s.setMode);
  const addItem = useCartStore((s) => s.addItem);
  const setItems = useCartStore((s) => s.setItems);
  const setDeliveryCost = useCartStore((s) => s.setDeliveryCost);
  const syncSessionId = useCartStore((s) => s.syncSessionId);

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
    if (activeSessionId) syncSessionId(activeSessionId);
  }, [activeSessionId, syncSessionId]);

  useEffect(() => {
    migrateLegacyUserStorage();

    async function mergeRemoteHistory() {
      const local = useChatStore.getState();
      const remote = await pullRemoteChatHistory();
      if (
        remote &&
        shouldPreferRemote(
          local.sessions,
          remote.sessions,
          remote.updated_at
        )
      ) {
        useChatStore.getState().hydrateFromRemote({
          sessions: remote.sessions,
          activeSessionId: remote.activeSessionId,
        });
      }
      useChatStore.getState().setHydrated();
    }

    if (useChatStore.persist.hasHydrated()) {
      void mergeRemoteHistory();
      return;
    }

    return useChatStore.persist.onFinishHydration(() => {
      void mergeRemoteHistory();
    });
  }, []);

  useEffect(() => {
    const unsub = useChatStore.subscribe((state) => {
      if (!state.hydrated) return;
      scheduleChatHistorySave(state.sessions, state.activeSessionId);
    });
    return unsub;
  }, []);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    if (healthCheckedRef.current) return;
    healthCheckedRef.current = true;
    checkHealth()
      .then(() => {
        setBackendOk(true);
        setCachedHealth(true);
      })
      .catch(() => setBackendOk(false));
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
          text.trim().slice(0, 32) + (text.trim().length > 32 ? "…" : "")
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

      const effectiveMode: ChatMode =
        mode === "auto"
          ? /gift|present|birthday|wedding|avurudu|vesak|මල|තෑග්/i.test(text)
            ? "gift"
            : "shopping"
          : mode;

      if (mode === "auto") setMode(effectiveMode);

      const historyMessages = (session?.messages ?? [])
        .filter((m) => m.id !== ASSISTANT_ID && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));

      let textBuffer = "";

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
                products: mergeProductUpdates(m.products ?? [], productItems),
              }));
            },
            onDeliveryQuote: (quote) => {
              setDeliveryCost(quote.delivery_cost_lkr);
              updateAssistant((m) => ({ ...m, delivery_quote: quote }));
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
            onCartUpdate: (cart) => setItems(cart),
            onStatus: (message) => setStreamStatus(message),
            onChips: (chipItems) => {
              updateAssistant((m) => ({ ...m, chips: chipItems }));
            },
            onError: (message) => {
              const friendly = toUserFriendlyError(message);
              updateAssistant((m) => ({
                ...m,
                content: m.content?.includes(friendly) ? m.content : friendly,
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
            m.content || "Kapruka is having a moment. Please try again.",
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

  const handleCategorySelect = useCallback(
    (category: string) => {
      setActiveCategory(category);
      if (category === "All") {
        sendMessage("Show me popular items on Kapruka");
      } else {
        sendMessage(`Show me products in ${category} category`);
      }
    },
    [sendMessage, setActiveCategory]
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

  const handleCheckoutViaChat = () => {
    setCartOpen(false);
    setCheckoutOpen(false);
    const summary = items
      .map((i) => `${i.quantity}x ${i.product.name} (${i.product.id})`)
      .join(", ");
    sendMessage(
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
          "Your order is ready! Pay within the next hour to confirm.",
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
        onNewChat={handleNewChat}
        onCheckoutViaChat={handleCheckoutViaChat}
        onOpenCheckoutWizard={() => {
          setCartOpen(false);
          setCheckoutKey((k) => k + 1);
          setCheckoutOpen(true);
        }}
      >
        <Header
          onCartClick={() => setCartOpen(true)}
          onBrowseClick={() => setBrowseOpen(true)}
        />
        <ChatTabs onNewChat={handleNewChat} onSwitch={handleSwitchTab} />
        {!backendOk && (
          <div className="bg-warning/10 border-b border-warning/40 text-warning text-center text-sm py-2 px-4">
            Cannot reach the API. Run pnpm dev in frontend, or check GROQ_API_KEY
            on Vercel.
          </div>
        )}
        {cartToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-elevated border border-primary text-sm text-foreground animate-slide-in-right shadow-lg">
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
          onOccasionSelect={sendMessage}
          onCategorySelect={handleCategorySelect}
          onView={setModalProduct}
          onAdd={handleAddProduct}
          onSendChip={sendMessage}
          onProductsAppend={handleProductsAppend}
        />
        <FloatingCartBar onOpenCart={() => setCartOpen(true)} />
        <ChatInput
          onSend={sendMessage}
          onOpenCheckout={() => {
            setCheckoutKey((k) => k + 1);
            setCheckoutOpen(true);
          }}
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
          setCheckoutKey((k) => k + 1);
          setCheckoutOpen(true);
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
