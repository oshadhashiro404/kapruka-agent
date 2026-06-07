"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, ChatMode, Product } from "./types";
import { generateId } from "./utils";
import {
  createUserScopedStorage,
  migrateLegacyUserStorage,
} from "./user-id";

export function cartTotalLkr(items: CartItem[]): number {
  return items.reduce(
    (sum, i) => sum + i.product.price_lkr * i.quantity,
    0
  );
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function findCartLine(
  items: CartItem[],
  productId: string,
  variant?: string
): CartItem | undefined {
  return items.find(
    (i) => i.product.id === productId && i.selected_variant === variant
  );
}

function lineKey(productId: string, variant?: string): string {
  return `${productId}::${variant ?? ""}`;
}

interface CartState {
  items: CartItem[];
  session_id: string;
  mode: ChatMode;
  activeCategory: string;
  deliveryCostLkr: number;
  pendingGiftSuggestion?: {
    productId: string;
    messageEn: string;
    messageSi?: string;
  };
  setMode: (mode: ChatMode) => void;
  setActiveCategory: (category: string) => void;
  setDeliveryCost: (cost: number) => void;
  setPendingGiftSuggestion: (
    suggestion: CartState["pendingGiftSuggestion"]
  ) => void;
  addItem: (
    product: Product,
    variant?: string,
    isGift?: boolean
  ) => void;
  removeItem: (productId: string, variant?: string) => void;
  updateQuantity: (productId: string, qty: number, variant?: string) => void;
  setGiftMessage: (
    productId: string,
    message: string,
    sinhalaMessage?: string,
    variant?: string
  ) => void;
  toggleGift: (productId: string, variant?: string) => void;
  setItems: (items: CartItem[]) => void;
  clearCart: () => void;
  totalLkr: () => number;
  itemCount: () => number;
  ensureSessionId: () => string;
  syncSessionId: (chatSessionId: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      session_id: generateId(),
      mode: "auto",
      activeCategory: "All",
      deliveryCostLkr: 0,
      pendingGiftSuggestion: undefined,

      setMode: (mode) => set({ mode }),
      setActiveCategory: (category) => set({ activeCategory: category }),
      setDeliveryCost: (cost) => set({ deliveryCostLkr: cost }),
      setPendingGiftSuggestion: (suggestion) =>
        set({ pendingGiftSuggestion: suggestion }),

      addItem: (product, variant, isGift = false) => {
        const items = [...get().items];
        const existing = findCartLine(items, product.id, variant);
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id && i.selected_variant === variant
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          const pending = get().pendingGiftSuggestion;
          const giftFields =
            pending?.productId === product.id
              ? {
                  gift_message: pending.messageEn,
                  gift_message_sinhala: pending.messageSi,
                }
              : {};
          set({
            items: [
              ...items,
              {
                product,
                quantity: 1,
                selected_variant: variant,
                is_gift: isGift || get().mode === "gift",
                ...giftFields,
              },
            ],
            pendingGiftSuggestion:
              pending?.productId === product.id ? undefined : pending,
          });
        }
      },

      removeItem: (productId, variant) =>
        set({
          items: get().items.filter(
            (i) => lineKey(i.product.id, i.selected_variant) !== lineKey(productId, variant)
          ),
        }),

      updateQuantity: (productId, qty, variant) => {
        if (qty < 1) {
          get().removeItem(productId, variant);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId && i.selected_variant === variant
              ? { ...i, quantity: qty }
              : i
          ),
        });
      },

      setGiftMessage: (productId, message, sinhalaMessage, variant) =>
        set({
          items: get().items.map((i) =>
            i.product.id === productId && i.selected_variant === variant
              ? {
                  ...i,
                  gift_message: message,
                  gift_message_sinhala: sinhalaMessage,
                  is_gift: true,
                }
              : i
          ),
        }),

      toggleGift: (productId, variant) =>
        set({
          items: get().items.map((i) =>
            i.product.id === productId && i.selected_variant === variant
              ? { ...i, is_gift: !i.is_gift }
              : i
          ),
        }),

      setItems: (items) => set({ items: [...items] }),

      clearCart: () => set({ items: [], deliveryCostLkr: 0 }),

      totalLkr: () => cartTotalLkr(get().items),

      itemCount: () => cartItemCount(get().items),

      ensureSessionId: () => {
        const current = get().session_id;
        if (current && current.length > 0) return current;
        const id = generateId();
        set({ session_id: id });
        return id;
      },

      syncSessionId: (chatSessionId) => {
        if (chatSessionId && get().session_id !== chatSessionId) {
          set({ session_id: chatSessionId });
        }
      },
    }),
    {
      name: "kapruka-cart",
      storage: createJSONStorage(() => createUserScopedStorage()),
      partialize: (state) => ({
        items: state.items,
        session_id: state.session_id,
        mode: state.mode,
        deliveryCostLkr: state.deliveryCostLkr,
      }),
      onRehydrateStorage: () => (state) => {
        migrateLegacyUserStorage();
        if (state) {
          if (!state.session_id || state.session_id.length === 0) {
            state.session_id = generateId();
          }
          state.items = [...(state.items ?? [])];
        }
      },
    }
  )
);
