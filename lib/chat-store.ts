"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChatMessage, ChatSession, SessionContext } from "./types";
import { generateId } from "./utils";

const HEALTH_CACHE_KEY = "kapruka-health";
const HEALTH_TTL_MS = 10 * 60 * 1000;

function createEmptySession(): ChatSession {
  return {
    id: generateId(),
    title: "New chat",
    messages: [],
    createdAt: Date.now(),
  };
}

function reviveMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    ...m,
    timestamp:
      typeof m.timestamp === "string"
        ? new Date(m.timestamp)
        : m.timestamp,
  }));
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string;
  getActiveSession: () => ChatSession;
  addSession: () => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;
  updateSessionMessages: (
    sessionId: string,
    updater: (messages: ChatMessage[]) => ChatMessage[]
  ) => void;
  setSessionTitle: (sessionId: string, title: string) => void;
  setServerContext: (sessionId: string, context: SessionContext) => void;
}

const initialSession = createEmptySession();

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [initialSession],
      activeSessionId: initialSession.id,

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        const found = sessions.find((s) => s.id === activeSessionId);
        if (found) return { ...found, messages: reviveMessages(found.messages) };
        const first = sessions[0] ?? createEmptySession();
        if (!sessions.length) {
          set({ sessions: [first], activeSessionId: first.id });
        } else if (!activeSessionId) {
          set({ activeSessionId: first.id });
        }
        return { ...first, messages: reviveMessages(first.messages) };
      },

      addSession: () => {
        const session = createEmptySession();
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
        }));
        return session.id;
      },

      switchSession: (id) => {
        if (get().sessions.some((s) => s.id === id)) {
          set({ activeSessionId: id });
        }
      },

      deleteSession: (id) => {
        set((state) => {
          const next = state.sessions.filter((s) => s.id !== id);
          if (next.length === 0) {
            const fresh = createEmptySession();
            return { sessions: [fresh], activeSessionId: fresh.id };
          }
          const activeSessionId =
            state.activeSessionId === id ? next[0].id : state.activeSessionId;
          return { sessions: next, activeSessionId };
        });
      },

      setSessionMessages: (sessionId, messages) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, messages } : s
          ),
        }));
      },

      updateSessionMessages: (sessionId, updater) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: updater(reviveMessages(s.messages)) }
              : s
          ),
        }));
      },

      setSessionTitle: (sessionId, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title } : s
          ),
        }));
      },

      setServerContext: (sessionId, context) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, serverContext: context } : s
          ),
        }));
      },
    }),
    {
      name: "kapruka-chat",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.sessions.length === 0) {
          const fresh = createEmptySession();
          state.sessions = [fresh];
          state.activeSessionId = fresh.id;
        } else if (
          !state.activeSessionId ||
          !state.sessions.some((s) => s.id === state.activeSessionId)
        ) {
          state.activeSessionId = state.sessions[0].id;
        }
      },
    }
  )
);

export function getCachedHealth(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HEALTH_CACHE_KEY);
    if (!raw) return null;
    const { ok, ts } = JSON.parse(raw) as { ok: boolean; ts: number };
    if (Date.now() - ts < HEALTH_TTL_MS) return ok;
    return null;
  } catch {
    return null;
  }
}

export function setCachedHealth(ok: boolean): void {
  if (typeof window === "undefined") return;
  if (!ok) {
    sessionStorage.removeItem(HEALTH_CACHE_KEY);
    return;
  }
  sessionStorage.setItem(
    HEALTH_CACHE_KEY,
    JSON.stringify({ ok, ts: Date.now() })
  );
}
