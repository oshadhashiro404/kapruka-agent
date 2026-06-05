import fs from 'fs/promises';
import path from 'path';
import cache from '@/lib/server/cache';
import logger from '@/lib/logger';

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

const IS_SERVERLESS = Boolean(process.env.VERCEL);
const DEFAULT_DATA_DIR = IS_SERVERLESS
	? path.join(process.env.TMPDIR ?? '/tmp', 'chat-history')
	: path.join(process.cwd(), '.data', 'chat-history');

const DATA_DIR = process.env.CHAT_HISTORY_DIR ?? DEFAULT_DATA_DIR;

function safeUserId(userId: string): string {
	return userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function historyPath(userId: string): string {
	return path.join(DATA_DIR, safeUserId(userId), 'state.json');
}

export async function saveUserChatHistory(
	payload: StoredChatHistory,
): Promise<void> {
	const key = `chat_history:${safeUserId(payload.user_id)}`;
	try {
		if (cache && (cache as any).cacheSet) {
			await cache.cacheSet(key, JSON.stringify(payload), 60 * 60 * 24 * 7); // 7 days
			return;
		}
	} catch (e) {
		logger.warn({ err: e }, 'cache save failed, falling back to fs');
	}

	const filePath = historyPath(payload.user_id);
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(payload), 'utf-8');
}

export async function loadUserChatHistory(
	userId: string,
): Promise<StoredChatHistory | null> {
	const key = `chat_history:${safeUserId(userId)}`;
	try {
		if (cache && (cache as any).cacheGet) {
			const raw = await cache.cacheGet(key);
			if (raw) {
				const parsed = JSON.parse(raw) as StoredChatHistory;
				if (parsed?.user_id && Array.isArray(parsed.sessions)) return parsed;
			}
		}
	} catch (e) {
		logger.warn({ err: e }, 'cache load failed, falling back to fs');
	}

	try {
		const raw = await fs.readFile(historyPath(userId), 'utf-8');
		const parsed = JSON.parse(raw) as StoredChatHistory;
		if (!parsed?.user_id || !Array.isArray(parsed.sessions)) return null;
		return parsed;
	} catch {
		return null;
	}
}
