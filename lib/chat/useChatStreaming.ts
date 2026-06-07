"use client";

import { useCallback, useRef, useState } from "react";
import { chatStream } from "@/lib/api";
import {
  wantsAddFirstProduct,
  wantsClearCart,
  wantsRemoveFirstProduct,
  inferModeFromMessage,
} from "@/lib/chat-intents";
import { toUserFriendlyError } from "@/lib/errors";
import { useChatStore } from "@/lib/chat-store";
import { useCartStore } from "@/lib/cart-store";
import type { ChatMessage, Product } from "@/lib/types";
import { generateId, mergeProductUpdates } from "@/lib/utils";
import { ASSISTANT_STREAM_ID } from "./useChatSession";

export interface ChatStreamingCallbacks {
  onOpenCheckout: () => void;
  onCartToast: (message: string) => void;
  markHealthy: () => void;
}

export function useChatStreaming(callbacks: ChatStreamingCallbacks) {
  const [isLoading, setIsLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const items = useCartStore((s) => s.items);
  const mode = useCartStore((s) => s.mode);
  const setMode = useCartStore((s) => s.setMode);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const setItems = useCartStore((s) => s.setItems);
  const setDeliveryCost = useCartStore((s) => s.setDeliveryCost);

  const updateSessionMessages = useChatStore((s) => s.updateSessionMessages);
  const setServerContext = useChatStore((s) => s.setServerContext);

  const abortStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStreamStatus(undefined);
  }, []);

  const updateAssistant = useCallback(
    (sessionId: string, updater: (msg: ChatMessage) => ChatMessage) => {
      updateSessionMessages(sessionId, (prev) => {
        const idx = prev.findIndex((m) => m.id === ASSISTANT_STREAM_ID);
        if (idx === -1) {
          const base: ChatMessage = {
            id: ASSISTANT_STREAM_ID,
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
    [updateSessionMessages]
  );

  const handleLocalCartIntent = useCallback(
    (
      text: string,
      sessionId: string,
      userMsg: ChatMessage,
      lastProducts: Product[]
    ): boolean => {
      if (wantsAddFirstProduct(text) && lastProducts[0]) {
        const p = lastProducts[0];
        addItem(p, undefined, mode === "gift");
        callbacks.onCartToast(`Added ${p.name}`);
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: `Nice pick! Added "${p.name}" to your cart.`,
            timestamp: new Date(),
          },
        ]);
        return true;
      }

      if (wantsRemoveFirstProduct(text) && items[0]) {
        const removed = items[0].product;
        removeItem(removed.id);
        callbacks.onCartToast(`Removed ${removed.name}`);
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: `Removed "${removed.name}" from your cart.`,
            timestamp: new Date(),
          },
        ]);
        return true;
      }

      if (wantsClearCart(text) && items.length > 0) {
        clearCart();
        callbacks.onCartToast("Cart cleared");
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: "Cleared your cart.",
            timestamp: new Date(),
          },
        ]);
        return true;
      }

      return false;
    },
    [
      addItem,
      removeItem,
      clearCart,
      items,
      mode,
      callbacks,
      updateSessionMessages,
    ]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      sessionId: string,
      options?: { onTitleFromFirstMessage?: (text: string) => void }
    ) => {
      if (!text.trim() || isLoading || !sessionId) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      options?.onTitleFromFirstMessage?.(text.trim());

      const session = useChatStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const lastProducts =
        [...(session?.messages ?? [])]
          .reverse()
          .find((m) => (m.products?.length ?? 0) > 0)?.products ?? [];

      if (handleLocalCartIntent(text, sessionId, userMsg, lastProducts)) {
        return;
      }

      updateSessionMessages(sessionId, (prev) => [
        ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
        userMsg,
        {
          id: ASSISTANT_STREAM_ID,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);
      setIsLoading(true);
      setStreamStatus(undefined);

      const effectiveMode = inferModeFromMessage(text, mode);
      if (mode === "auto") setMode(effectiveMode);

      const historyMessages = (session?.messages ?? [])
        .filter((m) => m.id !== ASSISTANT_STREAM_ID && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));

      let textBuffer = "";

      try {
        await chatStream(
          text.trim(),
          sessionId,
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
              updateAssistant(sessionId, (m) => ({
                ...m,
                content: textBuffer,
              }));
            },
            onProducts: (productItems) => {
              callbacks.markHealthy();
              updateAssistant(sessionId, (m) => ({
                ...m,
                products: mergeProductUpdates(m.products ?? [], productItems),
              }));
            },
            onDeliveryQuote: (quote) => {
              setDeliveryCost(quote.delivery_cost_lkr);
              updateAssistant(sessionId, (m) => ({
                ...m,
                delivery_quote: quote,
              }));
            },
            onOpenCheckoutWizard: () => callbacks.onOpenCheckout(),
            onOrderCreated: (payUrl, orderId, expiresIn) => {
              updateAssistant(sessionId, (m) => ({
                ...m,
                pay_url: payUrl,
                order_id: orderId,
                expires_in: expiresIn,
              }));
            },
            onPerishableWarning: (message, alternatives) => {
              updateAssistant(sessionId, (m) => ({
                ...m,
                perishable_warning: message,
                perishable_alternatives: alternatives,
              }));
            },
            onCartUpdate: (cart) => setItems(cart),
            onStatus: (message) => setStreamStatus(message),
            onChips: (chipItems) => {
              updateAssistant(sessionId, (m) => ({ ...m, chips: chipItems }));
            },
            onError: (message) => {
              const friendly = toUserFriendlyError(message);
              updateAssistant(sessionId, (m) => ({
                ...m,
                content: m.content?.includes(friendly) ? m.content : friendly,
              }));
            },
            onSessionContext: (ctx) => setServerContext(sessionId, ctx),
            onDone: () => {
              setIsLoading(false);
              setStreamStatus(undefined);
              updateSessionMessages(sessionId, (prev) =>
                prev.map((m) =>
                  m.id === ASSISTANT_STREAM_ID
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
        updateAssistant(sessionId, (m) => ({
          ...m,
          content:
            m.content || "Kapruka's having a little hiccup — please try again in a moment.",
        }));
        setIsLoading(false);
        setStreamStatus(undefined);
      }
    },
    [
      isLoading,
      items,
      mode,
      setMode,
      setItems,
      setDeliveryCost,
      updateAssistant,
      updateSessionMessages,
      setServerContext,
      handleLocalCartIntent,
      callbacks,
    ]
  );

  return {
    isLoading,
    streamStatus,
    sendMessage,
    abortStream,
  };
}
