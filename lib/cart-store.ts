"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, ChatMode, Product } from "./types";
import { generateId } from "./utils";
import {
  createUserScopedStorage,
  migrateLegacyUserStorage,
} from "./user-id";

interface CartState {
  items: CartItem[];
  session_id: string;
  mode: ChatMode;
  activeCategory: string;
  deliveryCostLkr: number;
  setMode: (mode: ChatMode) => void;
  setActiveCategory: (category: string) => void;
  setDeliveryCost: (cost: number) => void;
  addItem: (
    product: Product,
    variant?: string,
    isGift?: boolean
  ) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  setGiftMessage: (
    productId: string,
    message: string,
    sinhalaMessage?: string
  ) => void;
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

      setMode: (mode) => set({ mode }),
      setActiveCategory: (category) => set({ activeCategory: category }),
      setDeliveryCost: (cost) => set({ deliveryCostLkr: cost }),

      addItem: (product, variant, isGift = false) => {
        const items = get().items;
        const existing = items.find(
          (i) =>
            i.product.id === product.id &&
            i.selected_variant === variant
        );
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id &&
              i.selected_variant === variant
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                product,
                quantity: 1,
                selected_variant: variant,
                is_gift: isGift || get().mode === "gift",
              },
            ],
          });
        }
      },

      removeItem: (productId) =>
        set({
          items: get().items.filter((i) => i.product.id !== productId),
        }),

      updateQuantity: (productId, qty) => {
        if (qty < 1) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity: qty } : i
          ),
        });
      },

      setGiftMessage: (productId, message, sinhalaMessage) =>
        set({
          items: get().items.map((i) =>
            i.product.id === productId
              ? {
                  ...i,
                  gift_message: message,
                  gift_message_sinhala: sinhalaMessage,
                }
              : i
          ),
        }),

      setItems: (items) => set({ items }),

      clearCart: () => set({ items: [], deliveryCostLkr: 0 }),

      totalLkr: () =>
        get().items.reduce(
          (sum, i) => sum + i.product.price_lkr * i.quantity,
          0
        ),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

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
      }),
      onRehydrateStorage: () => (state) => {
        migrateLegacyUserStorage();
        if (state && (!state.session_id || state.session_id.length === 0)) {
          state.session_id = generateId();
        }
      },
    }
  )
);
