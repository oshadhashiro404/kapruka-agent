import pino from 'pino';
let Redis: any;
try {
	// lazy-load to avoid startup crash if not installed in dev
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	Redis = require('ioredis');
} catch (e) {
	Redis = null;
}

import type RedisType from 'ioredis';
import { promisify } from 'util';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

let redisClient: RedisType | null = null;
if (process.env.REDIS_URL && Redis) {
	try {
		redisClient = new Redis(process.env.REDIS_URL);
		redisClient.on('error', (err: Error) =>
			logger.error({ err }, 'Redis error'),
		);
		logger.info('Connected to Redis');
	} catch (e) {
		logger.warn('Failed to connect to Redis, falling back to memory cache');
		redisClient = null;
	}
}

const memCache = new Map<string, { value: string; expiresAt: number }>();

export async function cacheGet(key: string): Promise<string | null> {
	if (redisClient) {
		try {
			const v = await redisClient.get(key);
			return v;
		} catch (e) {
			logger.warn({ err: e }, 'Redis get failed, falling back to memory');
		}
	}
	const entry = memCache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		memCache.delete(key);
		return null;
	}
	return entry.value;
}

export async function cacheSet(
	key: string,
	value: string,
	ttlSec?: number,
): Promise<void> {
	if (redisClient) {
		try {
			if (ttlSec) await redisClient.set(key, value, 'EX', ttlSec);
			else await redisClient.set(key, value);
			return;
		} catch (e) {
			logger.warn({ err: e }, 'Redis set failed, falling back to memory');
		}
	}
	memCache.set(key, { value, expiresAt: Date.now() + (ttlSec ?? 1800) * 1000 });
}

export function cacheAvailable(): boolean {
	return Boolean(redisClient);
}

export default { cacheGet, cacheSet, cacheAvailable };
