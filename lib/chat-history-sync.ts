"use client";

import { loadChatHistory, saveChatHistory } from "./api";
import type { ChatSession } from "./types";
import { getOrCreateUserId } from "./user-id";

function latestActivity(sessions: ChatSession[]): number {
  return sessions.reduce((max, s) => Math.max(max, s.createdAt ?? 0), 0);
}

export async function pullRemoteChatHistory(): Promise<{
  sessions: ChatSession[];
  activeSessionId: string;
  updated_at: number;
} | null> {
  const userId = getOrCreateUserId();
  try {
    const remote = await loadChatHistory(userId);
    if (!remote?.sessions?.length) return null;
    return {
      sessions: remote.sessions,
      activeSessionId: remote.activeSessionId,
      updated_at: remote.updated_at ?? 0,
    };
  } catch {
    return null;
  }
}

export function shouldPreferRemote(
  localSessions: ChatSession[],
  remoteSessions: ChatSession[],
  remoteUpdatedAt: number
): boolean {
  const localUpdated = latestActivity(localSessions);
  if (remoteSessions.length > localSessions.length && remoteUpdatedAt >= localUpdated) {
    return true;
  }
  return remoteUpdatedAt > localUpdated;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleChatHistorySave(
  sessions: ChatSession[],
  activeSessionId: string
): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const userId = getOrCreateUserId();
    void saveChatHistory({
      user_id: userId,
      sessions,
      activeSessionId,
      updated_at: Date.now(),
    });
  }, 800);
}
