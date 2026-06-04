"use client";

import { generateId } from "./utils";

const USER_ID_KEY = "kapruka-user-id";

/** Stable anonymous user id for this browser (persists across visits). */
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "anonymous";

  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/** Zustand persist storage scoped per user. */
export function createUserScopedStorage(): Storage {
  return {
    getItem: (name) => {
      const userId = getOrCreateUserId();
      return localStorage.getItem(`${userId}:${name}`);
    },
    setItem: (name, value) => {
      const userId = getOrCreateUserId();
      localStorage.setItem(`${userId}:${name}`, value);
    },
    removeItem: (name) => {
      const userId = getOrCreateUserId();
      localStorage.removeItem(`${userId}:${name}`);
    },
    get length() {
      return localStorage.length;
    },
    clear: () => {
      /* intentionally no-op — never clear all localStorage */
    },
    key: (index: number) => localStorage.key(index),
  };
}

const LEGACY_CHAT_KEY = "kapruka-chat";
const LEGACY_CART_KEY = "kapruwa-cart";

/** Copy pre–per-user localStorage keys into the current user's namespace once. */
export function migrateLegacyUserStorage(): void {
  if (typeof window === "undefined") return;
  const userId = getOrCreateUserId();

  const legacyChat = localStorage.getItem(LEGACY_CHAT_KEY);
  if (legacyChat && !localStorage.getItem(`${userId}:${LEGACY_CHAT_KEY}`)) {
    localStorage.setItem(`${userId}:${LEGACY_CHAT_KEY}`, legacyChat);
  }

  const legacyCart = localStorage.getItem(LEGACY_CART_KEY);
  if (legacyCart && !localStorage.getItem(`${userId}:${LEGACY_CART_KEY}`)) {
    localStorage.setItem(`${userId}:${LEGACY_CART_KEY}`, legacyCart);
  }
}
