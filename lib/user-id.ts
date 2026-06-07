"use client";

import { generateId } from "./utils";

const USER_ID_KEY = "kapruka-user-id";
const MIGRATION_FLAG_KEY = "kapruka-storage-migrated";

const LEGACY_KEYS = [
  { legacy: "kapruka-chat", current: "kapruka-chat" },
  { legacy: "kapruka-cart", current: "kapruka-cart" },
  { legacy: "kapruwa-cart", current: "kapruka-cart" },
] as const;

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

/** Copy pre–per-user localStorage keys into the current user's namespace once. */
export function migrateLegacyUserStorage(): void {
  if (typeof window === "undefined") return;
  const userId = getOrCreateUserId();

  if (localStorage.getItem(`${userId}:${MIGRATION_FLAG_KEY}`) === "1") {
    return;
  }

  let migrated = false;
  for (const { legacy, current } of LEGACY_KEYS) {
    const legacyValue = localStorage.getItem(legacy);
    const scopedKey = `${userId}:${current}`;
    if (legacyValue && !localStorage.getItem(scopedKey)) {
      localStorage.setItem(scopedKey, legacyValue);
      migrated = true;
    }
  }

  localStorage.setItem(`${userId}:${MIGRATION_FLAG_KEY}`, "1");
  if (migrated) {
    /* legacy keys left in place for safety; scoped copy is authoritative */
  }
}
