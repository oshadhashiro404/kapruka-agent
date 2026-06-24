"use client";

import { useCallback, useRef, useState } from "react";
import { chatStream } from "@/lib/api";
import {
  formatCartSummary,
  inferModeFromMessage,
  isCheckoutChip,
  matchCartLineByName,
  resolveAddProducts,
  wantsAcceptGiftMessage,
  wantsCartSummary,
  wantsClearCart,
  wantsRemoveFirstProduct,
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
  onGiftMessagePrompt?: (productId: string) => void;
  onAssistantComplete?: (text: string) => void;
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
  const setPendingGiftSuggestion = useCartStore(
    (s) => s.setPendingGiftSuggestion
  );
  const setGiftMessage = useCartStore((s) => s.setGiftMessage);
  const pendingGiftSuggestion = useCartStore((s) => s.pendingGiftSuggestion);

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
      if (isCheckoutChip(text)) {
        callbacks.onOpenCheckout();
        return true;
      }

      if (wantsCartSummary(text)) {
        const summary = formatCartSummary(items);
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: summary,
            timestamp: new Date(),
          },
        ]);
        callbacks.onAssistantComplete?.(summary);
        return true;
      }

      const toAdd = resolveAddProducts(text, lastProducts);
      if (toAdd.length > 0) {
        for (const p of toAdd) {
          addItem(p, undefined, mode === "gift");
        }
        const names = toAdd.map((p) => p.name).join(" + ");
        const reply = `Nice! Added ${names} to your cart.`;
        callbacks.onCartToast(`Added ${names}`);
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: reply,
            timestamp: new Date(),
          },
        ]);
        callbacks.onAssistantComplete?.(reply);
        return true;
      }

      if (wantsRemoveFirstProduct(text) && items[0]) {
        const removed = items[0];
        removeItem(removed.product.id, removed.selected_variant);
        const reply = `Removed "${removed.product.name}" from your cart.`;
        callbacks.onCartToast(`Removed ${removed.product.name}`);
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: reply,
            timestamp: new Date(),
          },
        ]);
        callbacks.onAssistantComplete?.(reply);
        return true;
      }

      const lineToRemove = matchCartLineByName(text, items);
      if (lineToRemove && /\b(remove|delete)\b/i.test(text)) {
        removeItem(lineToRemove.product.id, lineToRemove.selected_variant);
        const reply = `Removed "${lineToRemove.product.name}" from your cart.`;
        callbacks.onCartToast(`Removed ${lineToRemove.product.name}`);
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: reply,
            timestamp: new Date(),
          },
        ]);
        callbacks.onAssistantComplete?.(reply);
        return true;
      }

      if (wantsAcceptGiftMessage(text) && pendingGiftSuggestion) {
        const inCart = items.find(
          (i) => i.product.id === pendingGiftSuggestion.productId
        );
        if (inCart) {
          setGiftMessage(
            pendingGiftSuggestion.productId,
            pendingGiftSuggestion.messageEn,
            pendingGiftSuggestion.messageSi,
            inCart.selected_variant
          );
        }
        const reply = `Done — added your card message: "${pendingGiftSuggestion.messageEn}"`;
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: reply,
            timestamp: new Date(),
          },
        ]);
        setPendingGiftSuggestion(undefined);
        callbacks.onAssistantComplete?.(reply);
        return true;
      }

      if (wantsClearCart(text) && items.length > 0) {
        clearCart();
        const reply = "Cleared your cart.";
        callbacks.onCartToast("Cart cleared");
        updateSessionMessages(sessionId, (prev) => [
          ...prev.filter((m) => m.id !== ASSISTANT_STREAM_ID),
          userMsg,
          {
            id: generateId(),
            role: "assistant",
            content: reply,
            timestamp: new Date(),
          },
        ]);
        callbacks.onAssistantComplete?.(reply);
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
      pendingGiftSuggestion,
      setGiftMessage,
      setPendingGiftSuggestion,
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
            onGiftMessageSuggestion: (productId, messageEn, messageSi) => {
              setPendingGiftSuggestion({
                productId,
                messageEn,
                messageSi,
              });
              const inCart = useCartStore
                .getState()
                .items.find((i) => i.product.id === productId);
              if (inCart) {
                setGiftMessage(
                  productId,
                  messageEn,
                  messageSi,
                  inCart.selected_variant
                );
              }
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
              if (textBuffer.trim()) {
                callbacks.onAssistantComplete?.(textBuffer);
              }
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
      setPendingGiftSuggestion,
      setGiftMessage,
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
