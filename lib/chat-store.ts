"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChatMessage, ChatSession, SessionContext } from "./types";
import { generateId } from "./utils";
import {
  createUserScopedStorage,
  migrateLegacyUserStorage,
} from "./user-id";

const HEALTH_CACHE_KEY = "kapruka-health";
const HEALTH_TTL_MS = 10 * 60 * 1000;
const CHAT_PERSIST_NAME = "kapruka-chat";

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

export function computeSessionsUpdatedAt(sessions: ChatSession[]): number {
  return sessions.reduce((max, s) => {
    const sessionTs = s.createdAt ?? 0;
    const messageTs = (s.messages ?? []).reduce((mMax, m) => {
      const ts =
        m.timestamp instanceof Date
          ? m.timestamp.getTime()
          : typeof m.timestamp === "string"
            ? new Date(m.timestamp).getTime()
            : 0;
      return Math.max(mMax, Number.isFinite(ts) ? ts : 0);
    }, 0);
    return Math.max(max, sessionTs, messageTs);
  }, 0);
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string;
  hydrated: boolean;
  updatedAt: number;
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
  hydrateFromRemote: (data: {
    sessions: ChatSession[];
    activeSessionId: string;
    updatedAt?: number;
  }) => void;
  setHydrated: () => void;
  touchUpdatedAt: () => void;
}

const initialSession = createEmptySession();

function withUpdatedAt(
  sessions: ChatSession[],
  extra?: number
): number {
  return Math.max(computeSessionsUpdatedAt(sessions), extra ?? 0, Date.now());
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [initialSession],
      activeSessionId: initialSession.id,
      hydrated: false,
      updatedAt: Date.now(),

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
          updatedAt: withUpdatedAt([session, ...state.sessions]),
        }));
        return session.id;
      },

      switchSession: (id) => {
        if (get().sessions.some((s) => s.id === id)) {
          set({ activeSessionId: id, updatedAt: Date.now() });
        }
      },

      deleteSession: (id) => {
        set((state) => {
          const next = state.sessions.filter((s) => s.id !== id);
          if (next.length === 0) {
            const fresh = createEmptySession();
            return {
              sessions: [fresh],
              activeSessionId: fresh.id,
              updatedAt: withUpdatedAt([fresh]),
            };
          }
          const activeSessionId =
            state.activeSessionId === id ? next[0].id : state.activeSessionId;
          return {
            sessions: next,
            activeSessionId,
            updatedAt: withUpdatedAt(next),
          };
        });
      },

      setSessionMessages: (sessionId, messages) => {
        set((state) => {
          const sessions = state.sessions.map((s) =>
            s.id === sessionId ? { ...s, messages } : s
          );
          return { sessions, updatedAt: withUpdatedAt(sessions) };
        });
      },

      updateSessionMessages: (sessionId, updater) => {
        set((state) => {
          const sessions = state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: updater(reviveMessages(s.messages)) }
              : s
          );
          return { sessions, updatedAt: withUpdatedAt(sessions) };
        });
      },

      setSessionTitle: (sessionId, title) => {
        set((state) => {
          const sessions = state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title } : s
          );
          return { sessions, updatedAt: withUpdatedAt(sessions) };
        });
      },

      setServerContext: (sessionId, context) => {
        set((state) => {
          const sessions = state.sessions.map((s) =>
            s.id === sessionId ? { ...s, serverContext: context } : s
          );
          return { sessions, updatedAt: withUpdatedAt(sessions) };
        });
      },

      hydrateFromRemote: ({ sessions, activeSessionId, updatedAt }) => {
        const revived = sessions.map((s) => ({
          ...s,
          messages: reviveMessages(s.messages ?? []),
        }));
        const activeOk = revived.some((s) => s.id === activeSessionId);
        const nextSessions = revived.length ? revived : [createEmptySession()];
        set({
          sessions: nextSessions,
          activeSessionId: activeOk
            ? activeSessionId
            : (nextSessions[0]?.id ?? createEmptySession().id),
          hydrated: true,
          updatedAt: updatedAt ?? withUpdatedAt(nextSessions),
        });
      },

      setHydrated: () => set({ hydrated: true }),

      touchUpdatedAt: () =>
        set((state) => ({
          updatedAt: withUpdatedAt(state.sessions),
        })),
    }),
    {
      name: CHAT_PERSIST_NAME,
      storage: createJSONStorage(() => createUserScopedStorage()),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        updatedAt: state.updatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        migrateLegacyUserStorage();
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
        if (!state.updatedAt) {
          state.updatedAt = computeSessionsUpdatedAt(state.sessions);
        }
        state.hydrated = true;
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
