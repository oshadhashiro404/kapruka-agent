import fs from "fs/promises";
import path from "path";

/** Persisted chat session blob (matches client ChatSession shape). */
export interface StoredChatSession {
  id: string;
  title: string;
  messages: unknown[];
  serverContext?: Record<string, unknown>;
  createdAt: number;
}

export interface StoredChatHistory {
  user_id: string;
  sessions: StoredChatSession[];
  activeSessionId: string;
  updated_at: number;
}

const DATA_DIR =
  process.env.CHAT_HISTORY_DIR ??
  path.join(process.cwd(), ".data", "chat-history");

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function historyPath(userId: string): string {
  return path.join(DATA_DIR, safeUserId(userId), "state.json");
}

export async function saveUserChatHistory(
  payload: StoredChatHistory
): Promise<void> {
  const filePath = historyPath(payload.user_id);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload), "utf-8");
}

export async function loadUserChatHistory(
  userId: string
): Promise<StoredChatHistory | null> {
  try {
    const raw = await fs.readFile(historyPath(userId), "utf-8");
    const parsed = JSON.parse(raw) as StoredChatHistory;
    if (!parsed?.user_id || !Array.isArray(parsed.sessions)) return null;
    return parsed;
  } catch {
    return null;
  }
}
