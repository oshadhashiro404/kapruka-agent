"use client";

import { useCallback, useEffect } from "react";
import {
  pullRemoteChatHistory,
  scheduleChatHistorySave,
  shouldPreferRemote,
} from "@/lib/chat-history-sync";
import { useChatStore } from "@/lib/chat-store";
import { migrateLegacyUserStorage } from "@/lib/user-id";
import { useCartStore } from "@/lib/cart-store";
import type { ChatMessage, ConversationState } from "@/lib/types";

export const ASSISTANT_STREAM_ID = "assistant-stream";

export function deriveConversationState(
  messages: ChatMessage[]
): ConversationState {
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.id !== ASSISTANT_STREAM_ID);
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
}

export function useChatSession() {
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const sessions = useChatStore((s) => s.sessions);
  const updatedAt = useChatStore((s) => s.updatedAt);
  const addSession = useChatStore((s) => s.addSession);
  const switchSession = useChatStore((s) => s.switchSession);
  const updateSessionMessages = useChatStore((s) => s.updateSessionMessages);
  const setSessionTitle = useChatStore((s) => s.setSessionTitle);
  const syncSessionId = useCartStore((s) => s.syncSessionId);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages: ChatMessage[] = (activeSession?.messages ?? []).map((m) => ({
    ...m,
    timestamp:
      typeof m.timestamp === "string" ? new Date(m.timestamp) : m.timestamp,
  }));

  const conversationState = deriveConversationState(messages);

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
        shouldPreferRemote(local.updatedAt, remote.updated_at, {
          localSessionCount: local.sessions.length,
          remoteSessionCount: remote.sessions.length,
        })
      ) {
        useChatStore.getState().hydrateFromRemote({
          sessions: remote.sessions,
          activeSessionId: remote.activeSessionId,
          updatedAt: remote.updated_at,
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
      scheduleChatHistorySave(
        state.sessions,
        state.activeSessionId,
        state.updatedAt
      );
    });
    return unsub;
  }, []);

  const maybeSetSessionTitle = useCallback(
    (sessionId: string, text: string) => {
      const session = useChatStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      if (session?.title === "New chat" || session?.title === "") {
        setSessionTitle(
          sessionId,
          text.trim().slice(0, 32) + (text.trim().length > 32 ? "…" : "")
        );
      }
    },
    [setSessionTitle]
  );

  const handleNewChat = useCallback(
    (onAbortStream?: () => void) => {
      onAbortStream?.();
      addSession();
    },
    [addSession]
  );

  const handleSwitchTab = useCallback(
    (id: string, onAbortStream?: () => void) => {
      onAbortStream?.();
      switchSession(id);
    },
    [switchSession]
  );

  return {
    activeSessionId,
    activeSession,
    messages,
    conversationState,
    updatedAt,
    updateSessionMessages,
    setSessionTitle,
    maybeSetSessionTitle,
    handleNewChat,
    handleSwitchTab,
  };
}
