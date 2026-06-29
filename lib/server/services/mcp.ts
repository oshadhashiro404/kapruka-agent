import axios from 'axios';
import type {
	DeliveryQuote,
	KaprukaCategory,
	KaprukaCity,
	McpProductHit,
	OrderCreatedResult,
	OrderTrackResult,
	Product,
} from '../types';

const MCP_ENDPOINT = process.env.MCP_ENDPOINT ?? 'https://mcp.kapruka.com/mcp';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — matches Kapruka MCP server cache

import cache from '../cache';
import logger from '../../logger';

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

let requestId = 1;
let initialized = false;
let initPromise: Promise<void> | null = null;
/** Streamable HTTP session from Kapruka MCP — required on all requests after initialize */
let mcpSessionId: string | null = null;

const MCP_PROTOCOL_VERSION = '2024-11-05';

/** JSON-RPC 2.0 request envelope for Streamable HTTP MCP */
interface JsonRpcRequest {
	jsonrpc: '2.0';
	id?: number;
	method: string;
	params?: Record<string, unknown>;
}

interface JsonRpcResponse {
	jsonrpc: string;
	id: number;
	result?: unknown;
	error?: { code: number; message: string; data?: unknown };
}

const PERISHABLE_CATEGORIES = new Set([
	'cakes',
	'flowers',
	'gift combos',
	'groceries',
	'chocolates',
]);

function cacheKey(tool: string, args: Record<string, unknown>): string {
	return `${tool}:${JSON.stringify(args)}`;
}

async function getCached<T>(key: string): Promise<T | null> {
	try {
		const raw = await cache.cacheGet(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch (e) {
		logger.warn({ err: e, key }, 'cache get failed');
		return null;
	}
}

async function setCached<T>(key: string, data: T): Promise<void> {
	try {
		await cache.cacheSet(
			key,
			JSON.stringify(data),
			Math.floor(CACHE_TTL_MS / 1000),
		);
	} catch (e) {
		logger.warn({ err: e, key }, 'cache set failed');
	}
}

function buildMcpHeaders(requireSession: boolean): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
		'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
	};
	if (requireSession && mcpSessionId) {
		headers['Mcp-Session-Id'] = mcpSessionId;
	}
	return headers;
}

function extractSessionId(
	responseHeaders: Record<string, unknown>,
	result: unknown,
): string | null {
	const headerId =
		responseHeaders['mcp-session-id'] ?? responseHeaders['Mcp-Session-Id'];
	if (typeof headerId === 'string' && headerId.length > 0) {
		return headerId;
	}
	if (Array.isArray(headerId) && headerId[0]) {
		return String(headerId[0]);
	}
	const bodyId = (result as { sessionId?: string })?.sessionId;
	return bodyId && bodyId.length > 0 ? bodyId : null;
}

function resetMcpSession(): void {
	initialized = false;
	initPromise = null;
	mcpSessionId = null;
}

/** Kapruka MCP responds with SSE envelopes, not bare JSON */
function parseSseResponseBody(raw: unknown): JsonRpcResponse | null {
	if (raw == null) return null;

	if (typeof raw === 'object' && 'jsonrpc' in (raw as object)) {
		return raw as JsonRpcResponse;
	}

	if (typeof raw !== 'string') return null;

	const trimmed = raw.trim();
	if (trimmed.startsWith('{')) {
		try {
			return JSON.parse(trimmed) as JsonRpcResponse;
		} catch {
			return null;
		}
	}

	for (const line of trimmed.split(/\r?\n/)) {
		if (line.startsWith('data:')) {
			const payload = line.slice(5).trim();
			if (!payload) continue;
			try {
				return JSON.parse(payload) as JsonRpcResponse;
			} catch {
				continue;
			}
		}
	}

	return null;
}

/** Kapruka tools expect arguments wrapped as { params: { ... } } */
function wrapToolArguments(
	args: Record<string, unknown>,
): Record<string, unknown> {
	if (
		args.params &&
		typeof args.params === 'object' &&
		!Array.isArray(args.params)
	) {
		return args;
	}
	return { params: args };
}

/**
 * Sends a JSON-RPC POST to the Kapruka MCP Streamable HTTP endpoint.
 * After initialize, every request must include Mcp-Session-Id (Streamable HTTP spec).
 */
async function mcpRequest(
	method: string,
	params?: Record<string, unknown>,
	options?: { isNotification?: boolean },
): Promise<unknown> {
	const body: JsonRpcRequest = {
		jsonrpc: '2.0',
		method,
		params,
	};

	if (!options?.isNotification) {
		body.id = requestId++;
	}

	const isInitialize = method === 'initialize';
	/** All requests after initialize must carry Mcp-Session-Id, including notifications */
	const requireSession = !isInitialize;

	if (requireSession && !mcpSessionId) {
		await ensureMcpInitialized();
	}

	const start = Date.now();
	logger.debug({ method }, 'mcpRequest start');

	try {
		const response = await axios.post<JsonRpcResponse>(MCP_ENDPOINT, body, {
			headers: buildMcpHeaders(requireSession),
			timeout: 30000,
			validateStatus: (s) => s < 500,
		});

		const { data: rawData, status, headers: resHeaders } = response;
		const envelope = parseSseResponseBody(rawData);

		if (status === 404 && mcpSessionId) {
			resetMcpSession();
			await ensureMcpInitialized();
			return mcpRequest(method, params, options);
		}

		if (status === 400 || status === 401) {
			const errMsg =
				envelope?.error?.message ?? `Kapruka MCP error (${status})`;
			if (errMsg.toLowerCase().includes('session') && !isInitialize) {
				resetMcpSession();
				await ensureMcpInitialized();
				return mcpRequest(method, params, options);
			}
			throw formatMcpError(errMsg, status);
		}

		if (status >= 400) {
			throw formatMcpError(
				envelope?.error?.message ?? `Kapruka MCP error (${status})`,
				status,
			);
		}

		if (isInitialize && envelope?.result) {
			const sid = extractSessionId(
				resHeaders as Record<string, unknown>,
				envelope.result,
			);
			if (sid) {
				mcpSessionId = sid;
				try {
					await cache.cacheSet('mcp:session_id', sid, 60 * 60 * 24);
				} catch {
					// ignore
				}
			}
		}

		if (envelope?.error) {
			throw formatMcpError(envelope.error.message, envelope.error.code);
		}

		return envelope?.result;
	} catch (err) {
		logger.error({ err, method }, 'mcpRequest error');
		if (axios.isAxiosError(err)) {
			const status = err.response?.status;
			if (status === 429) {
				throw new Error(
					'Kapruka is busy right now (rate limit). Please wait a minute and try again.',
				);
			}
			const payload = err.response?.data as {
				error?: { message?: string };
				message?: string;
			};
			const msg = payload?.error?.message ?? payload?.message ?? err.message;
			throw formatMcpError(msg, status);
		}
		throw err;
	} finally {
		const took = Date.now() - start;
		logger.debug({ method, took }, 'mcpRequest finished');
	}
}

function formatMcpError(message: string, code?: number): Error {
	const lower = message.toLowerCase();
	if (lower.includes('rate') || code === 429) {
		return new Error(
			'Too many requests to Kapruka. Please wait a moment and retry.',
		);
	}
	if (lower.includes('order') && lower.includes('limit')) {
		return new Error(
			'Order limit reached (30 per hour). Please try again later.',
		);
	}
	return new Error(message || 'Kapruka service error');
}

/**
 * Streamable HTTP MCP lifecycle:
 * 1. initialize → capture Mcp-Session-Id response header
 * 2. notifications/initialized (with session header)
 * 3. tools/list and tools/call on subsequent requests
 */
export async function ensureMcpInitialized(): Promise<void> {
	if (initialized && mcpSessionId) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		// Try restoring session id from cache first
		try {
			const cachedSid = await cache.cacheGet('mcp:session_id');
			if (cachedSid) {
				mcpSessionId = String(cachedSid);
				initialized = true;
				logger.info('Restored MCP session id from cache');
				return;
			}
		} catch (e) {
			logger.debug({ err: e }, 'failed to restore mcp session from cache');
		}

		mcpSessionId = null;
		await mcpRequest('initialize', {
			protocolVersion: MCP_PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: { name: 'kapruka-assistant', version: '1.0' },
		});

		if (!mcpSessionId) {
			throw new Error(
				'Kapruka MCP did not return a session ID. Check MCP endpoint configuration.',
			);
		}

		await mcpRequest('notifications/initialized', {}, { isNotification: true });
		await mcpRequest('tools/list', {});
		initialized = true;
	})();

	try {
		await initPromise;
	} catch (e) {
		resetMcpSession();
		throw e;
	}
}

/**
 * tools/call — executes a named Kapruka MCP tool with arguments.
 */
export async function callMcpTool(
	name: string,
	args: Record<string, unknown> = {},
): Promise<unknown> {
	await ensureMcpInitialized();
	const key = cacheKey(name, args);
	const readTools = ['kapruka_list_categories', 'kapruka_search_products'];
	if (readTools.includes(name)) {
		const cached = await getCached<unknown>(key);
		if (cached !== null) return cached;
	}

	const result = await mcpRequest('tools/call', {
		name,
		arguments: wrapToolArguments(args),
	});

	if (readTools.includes(name)) {
		await setCached(key, result);
	}

	return parseToolResult(result);
}

function normalizeKaprukaErrorMessage(text: string): string {
	return text
		.replace(/^Error executing tool[^:]+:\s*/i, '')
		.replace(/^Error\s*\([^)]+\):\s*/i, '')
		.replace(/^Error:\s*/i, '')
		.trim();
}

function extractKaprukaErrorMessage(raw: unknown): string | null {
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (/^Error\b/i.test(trimmed) || /^Failed\b/i.test(trimmed)) {
			return normalizeKaprukaErrorMessage(trimmed);
		}
		return null;
	}
	if (!raw || typeof raw !== 'object') return null;
	const obj = raw as Record<string, unknown>;
	const direct = obj.error ?? obj.errMsg ?? obj.message;
	if (typeof direct === 'string' && direct.trim()) {
		return normalizeKaprukaErrorMessage(direct);
	}
	if (obj.error && typeof obj.error === 'object') {
		const nested = obj.error as Record<string, unknown>;
		if (typeof nested.message === 'string' && nested.message.trim()) {
			return normalizeKaprukaErrorMessage(nested.message);
		}
	}
	if (typeof obj.result === 'string') {
		return extractKaprukaErrorMessage(obj.result);
	}
	return null;
}

/** MCP returns tool output in content[] — markdown or JSON text */
function parseToolResult(result: unknown): unknown {
	if (result == null) return result;

	const r = result as {
		content?: Array<{ type: string; text?: string }>;
		structuredContent?: unknown;
		isError?: boolean;
	};

	if (r.structuredContent !== undefined) {
		const sc = r.structuredContent as { result?: string };
		const scError = extractKaprukaErrorMessage(sc.result ?? r.structuredContent);
		if (r.isError || scError) {
			throw formatMcpError(scError ?? 'Kapruka tool execution failed');
		}
		if (typeof sc.result === 'string') {
			try {
				return JSON.parse(sc.result);
			} catch {
				return sc.result;
			}
		}
		return r.structuredContent;
	}

	if (Array.isArray(r.content)) {
		const texts = r.content
			.filter((c) => c.type === 'text' && c.text)
			.map((c) => c.text as string);
		if (texts.length === 0) return result;

		const combined = texts.join('\n');
		const contentError = extractKaprukaErrorMessage(combined);
		if (r.isError || combined.includes('Error executing tool') || contentError) {
			throw formatMcpError(contentError ?? normalizeKaprukaErrorMessage(combined));
		}

		try {
			return JSON.parse(combined);
		} catch {
			return combined;
		}
	}

	const topLevelError = extractKaprukaErrorMessage(result);
	if (topLevelError) throw formatMcpError(topLevelError);

	return result;
}

export function isPerishableCategory(category?: string): boolean {
	if (!category) return false;
	return PERISHABLE_CATEGORIES.has(category.toLowerCase());
}

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
	for (const k of keys) {
		const v = raw[k];
		if (v !== undefined && v !== null && v !== '') return String(v);
	}
	return '';
}

function pickNum(raw: Record<string, unknown>, ...keys: string[]): number {
	for (const k of keys) {
		const v = raw[k];
		const n = typeof v === 'number' ? v : Number(v);
		if (!Number.isNaN(n) && n > 0) return n;
	}
	return 0;
}

function pickImageList(raw: Record<string, unknown>): string[] {
	for (const k of ['images', 'imageUrls', 'gallery', 'photos']) {
		const v = raw[k];
		if (Array.isArray(v) && v.length > 0) {
			return (v as string[]).filter(
				(s) => typeof s === 'string' && s.startsWith('http'),
			);
		}
	}
	const single = pickStr(
		raw,
		'image_url',
		'imageUrl',
		'thumbnail',
		'image',
		'primaryImage',
		'mainImage',
		'img',
	);
	return single ? [single] : [];
}

export function normalizeProduct(
	raw: McpProductHit & Record<string, unknown>,
): Product {
	const id = pickStr(raw, 'id', 'productId', 'product_id');
	const name = pickStr(raw, 'name', 'title', 'productName', 'product_name');
	const price = pickNum(
		raw,
		'price_lkr',
		'price',
		'lkrPrice',
		'amount',
		'cost',
	);
	const category = pickStr(raw, 'category', 'categoryName', 'cat');
	const images = pickImageList(raw);
	const imageUrl = images[0] ?? '';
	const url =
		pickStr(raw, 'url', 'productUrl', 'link', 'href') ||
		'https://www.kapruka.com';

	return {
		id,
		name,
		price_lkr: price,
		image_url: imageUrl,
		images,
		category,
		in_stock:
			(raw.in_stock as boolean | undefined) !== false &&
			(raw.inStock as boolean | undefined) !== false,
		variants: (raw.variants ?? raw.options) as Product['variants'],
		url,
		is_perishable:
			raw.is_perishable === true ||
			(raw.isPerishable as boolean | undefined) === true ||
			isPerishableCategory(category),
	};
}

/** Return true when a normalized product has enough data to show in the UI */
export function isValidProduct(p: Product): boolean {
	return (
		p.id.length > 0 &&
		p.name.length > 0 &&
		p.name !== 'undefined' &&
		p.name !== 'null'
	);
}

/** Parse Kapruka markdown search results into Product[] for the UI */
export function parseKaprukaSearchMarkdown(text: string): Product[] {
	// If the text is actually JSON, delegate to JSON extraction
	const trimmed = text.trim();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			const parsed = JSON.parse(trimmed) as Record<string, unknown>;
			const list = extractArray(parsed, 'products');
			if (list.length > 0) {
				return list
					.map((p) =>
						normalizeProduct(p as McpProductHit & Record<string, unknown>),
					)
					.filter(isValidProduct);
			}
		} catch {
			// fall through to markdown parsing
		}
	}

	const products: Product[] = [];
	const blocks = text.split(/\*\*\d+\.\s*/).slice(1);

	for (const block of blocks) {
		const nameMatch = block.match(/^([^*\n]+)/);
		// Support both `backtick` and plain ID formats
		const idMatch =
			block.match(/ID:\s*`([^`]+)`/) ??
			block.match(/ID:\s*([A-Za-z0-9_-]+)/) ??
			block.match(/product[_-]?id[:\s]+([A-Za-z0-9_-]+)/i);
		const priceMatch = block.match(/(?:LKR|Rs\.?)\s*([\d,]+)/i);
		const urlMatch =
			block.match(/\[View\s+product\]\(([^)]+)\)/i) ??
			block.match(/https?:\/\/[^\s)]+kapruka[^\s)]*/);
		const imageMatch =
			block.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/) ??
			block.match(/(https?:\/\/\S+\.(?:jpg|jpeg|png|webp)[^\s]*)/i);

		if (!nameMatch) continue;
		const name = nameMatch[1].trim();
		if (!name || name === 'undefined') continue;
		if (!idMatch) continue;

		// Prefer explicit stock/availability lines. Only treat as out-of-stock when
		// an explicit stock/availability indicator is present and negative.
		const explicitStockMatch = block.match(
			/(?:^|\n)\s*(?:\*\*Stock\*\*|Stock|Availability|Available)[:\s]*([^\n]+)/i,
		);
		let inStock = true;
		if (explicitStockMatch && explicitStockMatch[1]) {
			const stockText = explicitStockMatch[1].toLowerCase();
			if (/out of stock|not available|unavailable|no stock/.test(stockText)) {
				inStock = false;
			} else if (
				/in stock|available|usually available|instock/.test(stockText)
			) {
				inStock = true;
			}
		}

		const imageUrl = imageMatch?.[1] ?? '';
		products.push(
			normalizeProduct({
				id: idMatch[1].trim(),
				name,
				price_lkr: parseInt(priceMatch?.[1]?.replace(/,/g, '') ?? '0', 10),
				image_url: imageUrl,
				images: imageUrl ? [imageUrl] : [],
				category: '',
				in_stock: inStock,
				url: (
					urlMatch?.[1] ??
					urlMatch?.[0] ??
					'https://www.kapruka.com'
				).trim(),
			} as McpProductHit & Record<string, unknown>),
		);
	}

	return products.filter(isValidProduct);
}

/**
 * Parse kapruka_get_product markdown (Kapruka MCP returns markdown, not JSON).
 * Example line: **Image**: https://www.kapruka.com/shops/.../image.jpg
 */
export function parseKaprukaProductMarkdown(text: string): Product {
	const trimmed = text.trim();

	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			const parsed = JSON.parse(trimmed) as Record<string, unknown>;
			const item =
				(parsed.product as McpProductHit) ??
				(parsed.data as McpProductHit) ??
				parsed;
			return normalizeProduct(item as McpProductHit & Record<string, unknown>);
		} catch {
			// fall through to markdown
		}
	}

	const nameMatch = trimmed.match(/^##\s+(.+?)\s*$/m);
	const idMatch = trimmed.match(/\*\*ID\*\*:\s*`([^`]+)`/i);
	const priceMatch =
		trimmed.match(/\*\*Price\*\*:\s*LKR\s*([\d,]+)/i) ??
		trimmed.match(/LKR\s*([\d,]+)/);
	const categoryMatch = trimmed.match(/\*\*Category\*\*:\s*(.+?)\s*$/im);
	const imageMatch =
		trimmed.match(/\*\*Image\*\*:\s*(https?:\/\/\S+)/i) ??
		trimmed.match(/(https?:\/\/\S+\.(?:jpg|jpeg|png|webp)(?:\?[^\s]*)?)/i);
	const urlMatch =
		trimmed.match(/\[View on Kapruka\]\(([^)]+)\)/i) ??
		trimmed.match(/\[View product\]\(([^)]+)\)/i);
	const stockMatch = trimmed.match(/\*\*Stock\*\*:\s*(.+?)\s*$/im);

	// Detect explicit stock/availability lines. Default to in-stock unless
	// a clearly negative availability is present.
	const explicitStock = stockMatch?.[1];
	let inStock = true;
	if (explicitStock) {
		const stockText = String(explicitStock).toLowerCase();
		if (/out of stock|not available|unavailable|no stock/.test(stockText)) {
			inStock = false;
		} else if (/in stock|available|usually available|instock/.test(stockText)) {
			inStock = true;
		}
	}

	const imageUrl = imageMatch?.[1]?.replace(/[)\],.]+$/, '').trim() ?? '';

	return normalizeProduct({
		id: idMatch?.[1]?.trim() ?? '',
		name: nameMatch?.[1]?.trim() ?? '',
		price_lkr: parseInt(priceMatch?.[1]?.replace(/,/g, '') ?? '0', 10),
		image_url: imageUrl,
		images: imageUrl ? [imageUrl] : [],
		category: categoryMatch?.[1]?.trim() ?? '',
		in_stock: inStock,
		url: urlMatch?.[1]?.trim() ?? 'https://www.kapruka.com',
		is_perishable: isPerishableCategory(categoryMatch?.[1]?.trim() ?? ''),
	} as McpProductHit & Record<string, unknown>);
}

// --- Typed wrappers for all 7 MCP tools ---

export async function searchProducts(params: {
	q: string;
	category?: string;
	min_price?: number;
	max_price?: number;
	in_stock_only?: boolean;
	sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
	limit?: number;
	cursor?: string;
}): Promise<{ products: Product[]; cursor?: string }> {
	const raw = await callMcpTool('kapruka_search_products', params);

	const text =
		typeof raw === 'string'
			? raw
			: typeof (raw as { result?: string })?.result === 'string'
				? (raw as { result: string }).result
				: null;

	if (text) {
		const cursorMatch = text.match(/cursor="([^"]+)"/);
		return {
			products: parseKaprukaSearchMarkdown(text),
			cursor: cursorMatch?.[1],
		};
	}

	const list = extractArray(raw, 'products');
	return {
		products: list
			.map((p) =>
				normalizeProduct(p as McpProductHit & Record<string, unknown>),
			)
			.filter(isValidProduct),
		cursor: (raw as { cursor?: string })?.cursor,
	};
}

export async function getProduct(
	productId: string,
	currency?: string,
): Promise<Product> {
	const args: Record<string, unknown> = { product_id: productId };
	if (currency) args.currency = currency;
	const raw = await callMcpTool('kapruka_get_product', args);

	let product: Product;

	if (typeof raw === 'string') {
		product = parseKaprukaProductMarkdown(raw);
	} else if (typeof (raw as { result?: string })?.result === 'string') {
		product = parseKaprukaProductMarkdown((raw as { result: string }).result);
	} else {
		const r = raw as Record<string, unknown>;
		const item =
			(r.product as McpProductHit) ??
			(r.data as McpProductHit) ??
			(r.item as McpProductHit) ??
			(raw as McpProductHit);
		product = normalizeProduct(item as McpProductHit & Record<string, unknown>);
	}

	if (!product.id) product.id = productId;
	if (!isValidProduct(product)) {
		throw new Error(`Could not parse product details for ${productId}`);
	}

	return product;
}

export async function listCategories(
	depth?: number,
): Promise<KaprukaCategory[]> {
	const raw = await callMcpTool(
		'kapruka_list_categories',
		depth !== undefined ? { depth } : {},
	);
	return extractArray(raw, 'categories') as KaprukaCategory[];
}

export async function listDeliveryCities(
	query: string,
	limit = 50,
): Promise<KaprukaCity[]> {
	const raw = await callMcpTool('kapruka_list_delivery_cities', {
		query,
		limit,
	});
	return extractArray(raw, 'cities') as KaprukaCity[];
}

/** @deprecated Use listDeliveryCities */
export async function searchCities(q: string): Promise<KaprukaCity[]> {
	return listDeliveryCities(q);
}

export async function checkDelivery(params: {
	city: string;
	delivery_date: string;
	product_id: string;
}): Promise<{
	deliverable: boolean;
	delivery_cost_lkr: number;
	estimated_arrival: string;
	is_perishable: boolean;
	perishable_warning?: string;
}> {
	const raw = await callMcpTool('kapruka_check_delivery', params);
	const q = raw as Record<string, unknown>;
	return {
		deliverable: q.deliverable !== false && q.deliverable !== null,
		delivery_cost_lkr: Number(q.delivery_cost_lkr ?? q.cost_lkr ?? 0),
		estimated_arrival: String(
			q.estimated_arrival ?? q.estimated_delivery ?? '',
		),
		is_perishable: Boolean(q.is_perishable),
		perishable_warning: q.perishable_warning as string | undefined,
	};
}

export interface CreateOrderInput {
	cart: Array<{
		product_id: string;
		quantity: number;
		variant?: string;
	}>;
	recipient: { name: string; phone: string };
	delivery: { address: string; city: string; date: string };
	sender?: { name: string };
	gift_message?: string;
	currency?: string;
}

/** Parse kapruka_create_order markdown / mixed MCP responses */
export function parseKaprukaOrderResult(raw: unknown): OrderCreatedResult {
	const extractedError = extractKaprukaErrorMessage(raw);
	if (extractedError) {
		throw new Error(extractedError);
	}

	if (typeof raw === 'string') {
		const fromMd = parseOrderMarkdown(raw);
		if (fromMd) return fromMd;
		try {
			return parseKaprukaOrderResult(JSON.parse(raw));
		} catch {
			// fall through
		}
	}

	if (raw && typeof raw === 'object') {
		const obj = raw as Record<string, unknown>;

		if (typeof obj.result === 'string') {
			const nested = parseKaprukaOrderResult(obj.result);
			if (nested.order_id && nested.pay_url) return nested;
		}

		const order = (obj.order as Record<string, unknown>) ?? obj;
		const order_id = String(
			order.order_id ??
				order.orderId ??
				order.order_number ??
				order.id ??
				'',
		).trim();
		const pay_url = String(
			order.pay_url ??
				order.payUrl ??
				order.payment_url ??
				order.paymentUrl ??
				order.checkout_url ??
				'',
		).trim();

		if (order_id && pay_url) {
			return {
				order_id,
				pay_url,
				total_lkr: Number(
					order.total_lkr ?? order.total ?? order.amount ?? 0,
				),
				estimated_arrival: String(
					order.estimated_arrival ?? order.estimated_delivery ?? '',
				),
			};
		}

		const fromMd = parseOrderMarkdown(JSON.stringify(obj));
		if (fromMd) return fromMd;
	}

	// Log exactly what Kapruka returned so we can debug the format
	// eslint-disable-next-line no-console
	console.error('[kapruka_create_order] could not parse response:', JSON.stringify(raw).slice(0, 1000));

	throw new Error(
		'I could not generate a payment link from Kapruka right now. Please ensure all delivery details (Address, City, Phone) are complete and try again, or contact Kapruka support.',
	);
}

function parseOrderMarkdown(text: string): OrderCreatedResult | null {
	const order_id =
		text.match(/\*\*Order(?:\s+Number|\s+ID)?\*\*:\s*`?([^`\n]+)`?/i)?.[1]?.trim() ??
		text.match(/order(?:\s+number|\s+id)?[:\s]+`?([A-Za-z0-9_-]+)`?/i)?.[1]?.trim() ??
		text.match(/\*\*Order\*\*:\s*([A-Za-z0-9_-]+)/i)?.[1]?.trim();

	const payLinkMatch =
		text.match(/\*\*Pay(?:ment)?(?:\s+URL|\s+Link)?\*\*:\s*(https?:\/\/\S+)/i) ??
		text.match(/\[([^\]]*(?:pay|checkout)[^\]]*)\]\((https?:\/\/[^)]+)\)/i) ??
		text.match(/(https?:\/\/[^\s)\]"']*kapruka[^\s)\]"']*)/i);

	const pay_url = (payLinkMatch?.[2] ?? payLinkMatch?.[1])
		?.replace(/[)\],.]+$/, '')
		.trim();

	const totalMatch =
		text.match(/\*\*Total\*\*:\s*LKR\s*([\d,]+)/i) ??
		text.match(/total(?:\s+lkr)?[:\s]+(?:LKR\s*)?([\d,]+)/i);

	const arrivalMatch = text.match(
		/\*\*Estimated(?:\s+Arrival|\s+Delivery)?\*\*:\s*([^\n]+)/i,
	);

	if (!order_id || !pay_url) return null;

	return {
		order_id,
		pay_url,
		total_lkr: totalMatch
			? parseInt(totalMatch[1].replace(/,/g, ''), 10)
			: 0,
		estimated_arrival: arrivalMatch?.[1]?.trim() ?? '',
	};
}

async function resolveDeliveryCityCode(city: string): Promise<string> {
	const trimmed = city.trim();
	if (!trimmed) return trimmed;
	if (/^[A-Z0-9_-]{2,12}$/i.test(trimmed) && !trimmed.includes(' ')) {
		return trimmed;
	}
	try {
		const cities = await listDeliveryCities(trimmed, 5);
		if (cities[0]?.city_code) return cities[0].city_code;
		if (cities[0]?.name) return cities[0].name;
	} catch {
		// use raw city
	}
	return trimmed;
}

export async function createOrder(
	params: CreateOrderInput,
): Promise<OrderCreatedResult> {
	const deliveryCity = await resolveDeliveryCityCode(params.delivery.city);
	const payload = {
		cart: params.cart,
		recipient: params.recipient,
		delivery: {
			...params.delivery,
			city: deliveryCity,
		},
		sender: params.sender ?? { name: params.recipient.name || 'Kapruka Customer' },
		...(params.gift_message ? { gift_message: params.gift_message } : {}),
		currency: params.currency ?? 'LKR',
	};

	const raw = await callMcpTool('kapruka_create_order', payload);

	logger.info({ raw: typeof raw === 'string' ? raw.slice(0, 500) : JSON.stringify(raw).slice(0, 500) }, 'kapruka_create_order raw response');

	try {
		return parseKaprukaOrderResult(raw);
	} catch (err) {
		logger.warn({ raw, err }, 'createOrder parse failed');
		throw err;
	}
}

/** Flat shape used by REST / legacy callers */
export async function createOrderFlat(params: {
	items: Array<{
		product_id: string;
		quantity: number;
		variant?: string;
	}>;
	recipient_name: string;
	recipient_phone: string;
	delivery_address: string;
	city_code: string;
	delivery_date: string;
	gift_message?: string;
	currency?: string;
}): Promise<OrderCreatedResult> {
	return createOrder({
		cart: params.items,
		recipient: {
			name: params.recipient_name,
			phone: params.recipient_phone,
		},
		delivery: {
			address: params.delivery_address,
			city: params.city_code,
			date: params.delivery_date,
		},
		gift_message: params.gift_message,
		currency: params.currency,
	});
}

export async function trackOrder(
	order_number: string,
): Promise<OrderTrackResult> {
	const normalizedOrderNumber = order_number.trim().toUpperCase();
	const raw = await callMcpTool('kapruka_track_order', {
		order_number: normalizedOrderNumber,
	});
	return parseKaprukaTrackResult(raw, normalizedOrderNumber);
}

/** Parse kapruka_track_order markdown / mixed MCP responses */
export function parseKaprukaTrackResult(
	raw: unknown,
	orderNumber: string,
): OrderTrackResult {
	const extractedError = extractKaprukaErrorMessage(raw);
	if (extractedError) {
		throw new Error(extractedError);
	}

	const fallback: OrderTrackResult = {
		order_number: orderNumber,
		status: 'Unknown',
	};

	if (typeof raw === 'string') {
		const fromMd = parseTrackMarkdown(raw, orderNumber);
		if (fromMd) return fromMd;
		try {
			return parseKaprukaTrackResult(JSON.parse(raw), orderNumber);
		} catch {
			return {
				...fallback,
				status: raw.trim().slice(0, 200) || fallback.status,
			};
		}
	}

	if (raw && typeof raw === 'object') {
		const obj = raw as Record<string, unknown>;

		if (typeof obj.result === 'string') {
			return parseKaprukaTrackResult(obj.result, orderNumber);
		}

		const tracking = (obj.tracking as Record<string, unknown>) ?? obj;
		const status = String(
			tracking.status ?? tracking.order_status ?? tracking.state ?? '',
		).trim();
		const recipient = String(
			tracking.recipient ?? tracking.recipient_name ?? '',
		).trim();

		const progressRaw = tracking.delivery_progress ?? tracking.progress;
		const delivery_progress = normalizeDeliveryProgress(progressRaw);

		const itemsRaw = tracking.items;
		const items = normalizeTrackItems(itemsRaw);

		if (status) {
			return {
				order_number: String(
					tracking.order_number ?? tracking.order_id ?? orderNumber,
				).trim(),
				status,
				...(recipient ? { recipient } : {}),
				...(items.length > 0 ? { items } : {}),
				...(delivery_progress.length > 0 ? { delivery_progress } : {}),
			};
		}

		const fromMd = parseTrackMarkdown(JSON.stringify(obj), orderNumber);
		if (fromMd) return fromMd;
	}

	return {
		order_number: orderNumber,
		status: typeof raw === 'object' && raw ? JSON.stringify(raw).slice(0, 200) : 'Tracking information unavailable.',
	};
}

function normalizeDeliveryProgress(
	raw: unknown,
): Array<{ status: string; timestamp?: string }> {
	if (!Array.isArray(raw)) return [];
	return raw
		.map((step) => {
			if (typeof step === 'string') return { status: step };
			if (step && typeof step === 'object') {
				const s = step as Record<string, unknown>;
				const status = String(s.status ?? s.label ?? s.step ?? '').trim();
				const timestamp = String(s.timestamp ?? s.date ?? s.time ?? '').trim();
				if (!status) return null;
				return timestamp
					? { status, timestamp }
					: { status };
			}
			return null;
		})
		.filter((s): s is { status: string; timestamp?: string } => s !== null);
}

function normalizeTrackItems(
	raw: unknown,
): Array<{ name?: string; quantity?: number }> {
	if (!Array.isArray(raw)) return [];
	const items: Array<{ name?: string; quantity?: number }> = [];
	for (const item of raw) {
		if (typeof item === 'string') {
			items.push({ name: item });
			continue;
		}
		if (item && typeof item === 'object') {
			const i = item as Record<string, unknown>;
			const name = String(i.name ?? i.product_name ?? i.title ?? '').trim();
			const qty = Number(i.quantity ?? i.qty);
			if (!name) continue;
			items.push({
				name,
				...(Number.isFinite(qty) && qty > 0 ? { quantity: qty } : {}),
			});
		}
	}
	return items;
}

function parseTrackMarkdown(
	text: string,
	orderNumber: string,
): OrderTrackResult | null {
	const clean = (v: string): string =>
		v
			.replace(/\*\*/g, '')
			.replace(/`/g, '')
			.replace(/\s+/g, ' ')
			.trim();

	const headingMatch = text.match(
		/##\s*Order\s*`?([A-Za-z0-9_-]+)`?\s*[—-]\s*([^\n|]+)/i,
	);
	const headingOrder = headingMatch?.[1]?.trim();
	const headingStatus = headingMatch?.[2]?.trim();

	const status = clean(
		headingStatus ??
			text.match(/\*\*Status\*\*:\s*([^\n]+)/i)?.[1]?.trim() ??
			text.match(/status[:\s]+([^\n]+)/i)?.[1]?.trim() ??
			'',
	);

	const recipient = clean(
		text.match(/\*\*Recipient\*\*:\s*([^\n]+)/i)?.[1]?.trim() ??
			text.match(/recipient[:\s]+([^\n]+)/i)?.[1]?.trim() ??
			text.match(/\*\*Delivering to\*\*[\s\S]*?[-*]\s*([^\n<]+)/i)?.[1]?.trim() ??
			'',
	);

	if (!status) return null;

	const progressSection = text.match(/\*\*Progress\*\*([\s\S]*)/i)?.[1] ?? text;
	const delivery_progress = progressSection
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => /^[-*]\s+/.test(line))
		.map((line) => line.replace(/^[-*]\s+/, '').trim())
		.map((line) => {
			const parts = line.split(/\s+[—-]\s+/);
			if (parts.length < 2) return { status: clean(line) };
			const timestamp = clean(parts[0]);
			const stepStatus = clean(parts.slice(1).join(' — '));
			return stepStatus ? { status: stepStatus, timestamp } : null;
		})
		.filter((step): step is { status: string; timestamp?: string } => {
			if (!step) return false;
			if (!step.status) return false;
			return !/delivering to|recipient|order\s+\|/i.test(step.status);
		});

	return {
		order_number: headingOrder ?? orderNumber,
		status,
		...(recipient ? { recipient } : {}),
		...(delivery_progress.length > 0 ? { delivery_progress } : {}),
	};
}

/** True when MCP session was established (no network call). */
export function isMcpReady(): boolean {
	return initialized && Boolean(mcpSessionId);
}

/** Health probe — does not initialize MCP (saves API calls on page load). */
export async function checkMcpHealth(): Promise<boolean> {
	return isMcpReady();
}

function extractArray(raw: unknown, key?: string): unknown[] {
	if (Array.isArray(raw)) return raw;
	if (raw && typeof raw === 'object') {
		const obj = raw as Record<string, unknown>;
		if (key && Array.isArray(obj[key])) return obj[key] as unknown[];
		for (const k of [
			'items',
			'results',
			'data',
			'products',
			'categories',
			'cities',
		]) {
			if (Array.isArray(obj[k])) return obj[k] as unknown[];
		}
	}
	return [];
}

/** Resolve delivery quote by city name (used by REST route) */
export async function quoteDeliveryByCityName(
	city: string,
	date: string,
	productId: string,
): Promise<DeliveryQuote> {
	const cities = await listDeliveryCities(city, 10);
	const resolvedCity = cities[0]?.name ?? city;
	const cityCode = cities[0]?.city_code ?? '';

	const quote = await checkDelivery({
		city: resolvedCity,
		delivery_date: date,
		product_id: productId,
	});

	return {
		deliverable: quote.deliverable,
		city: resolvedCity,
		city_code: cityCode,
		delivery_date: date,
		delivery_cost_lkr: quote.delivery_cost_lkr,
		estimated_arrival: quote.estimated_arrival,
		is_perishable: quote.is_perishable,
		perishable_warning: quote.perishable_warning,
	};
}

function normalizeCreateOrderArgs(
	args: Record<string, unknown>,
): CreateOrderInput {
	if (args.cart && args.recipient && args.delivery) {
		return args as unknown as CreateOrderInput;
	}
	return {
		cart: (args.items as CreateOrderInput['cart']) ?? [],
		recipient: {
			name: String(
				args.recipient_name ??
					(args.recipient as { name?: string })?.name ??
					'',
			),
			phone: String(
				args.recipient_phone ??
					(args.recipient as { phone?: string })?.phone ??
					'',
			),
		},
		delivery: {
			address: String(
				args.delivery_address ??
					(args.delivery as { address?: string })?.address ??
					'',
			),
			city: String(
				args.city_code ?? (args.delivery as { city?: string })?.city ?? '',
			),
			date: String(
				args.delivery_date ?? (args.delivery as { date?: string })?.date ?? '',
			),
		},
		sender:
			(args.sender as CreateOrderInput['sender'] | undefined) ??
			({ name: 'Kapruka Customer' } as const),
		gift_message: args.gift_message as string | undefined,
		currency: args.currency as string | undefined,
	};
}

/** Map tool name from LLM function call → MCP executor */
export async function executeMcpToolCall(
	name: string,
	args: Record<string, unknown>,
): Promise<unknown> {
	switch (name) {
		case 'kapruka_search_products':
			return searchProducts(args as Parameters<typeof searchProducts>[0]);
		case 'kapruka_get_product': {
			const pid = String(args.product_id ?? args.id ?? '');
			return getProduct(pid, args.currency as string | undefined);
		}
		case 'kapruka_list_categories':
			return listCategories(args.depth as number | undefined);
		case 'kapruka_list_delivery_cities':
			return listDeliveryCities(
				String(args.query ?? args.q ?? ''),
				Number(args.limit) || 50,
			);
		case 'kapruka_search_cities':
			return listDeliveryCities(String(args.q ?? args.query ?? ''), 50);
		case 'kapruka_check_delivery':
			return checkDelivery({
				city: String(args.city ?? args.city_code ?? ''),
				delivery_date: String(args.delivery_date ?? ''),
				product_id: String(args.product_id ?? args.product_code ?? ''),
			});
		case 'kapruka_quote_delivery':
			return checkDelivery({
				city: String(args.city_code ?? args.city ?? ''),
				delivery_date: String(args.delivery_date ?? ''),
				product_id: String(args.product_code ?? args.product_id ?? ''),
			});
		case 'kapruka_create_order':
			return createOrder(normalizeCreateOrderArgs(args));
		case 'kapruka_track_order':
			return trackOrder(String(args.order_number));
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}
