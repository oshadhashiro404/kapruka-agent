"use client";

import { loadChatHistory, saveChatHistory } from "./api";
import type { ChatSession } from "./types";
import { getOrCreateUserId } from "./user-id";

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
  localUpdatedAt: number,
  remoteUpdatedAt: number,
  counts?: { localSessionCount: number; remoteSessionCount: number }
): boolean {
  if (remoteUpdatedAt > localUpdatedAt) return true;
  if (
    counts &&
    counts.remoteSessionCount > counts.localSessionCount &&
    remoteUpdatedAt >= localUpdatedAt
  ) {
    return true;
  }
  return false;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleChatHistorySave(
  sessions: ChatSession[],
  activeSessionId: string,
  updatedAt?: number
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
      updated_at: updatedAt ?? Date.now(),
    });
  }, 800);
}
