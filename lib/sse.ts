import { getApiBase } from './api-base';
import { normalizeStreamError } from './errors';
import type {
	CartItem,
	ChatMode,
	DeliveryQuote,
	OrderTracking,
	Product,
	SessionContext,
	SseEvent,
} from './types';

export interface StreamChatCallbacks {
	onText: (content: string) => void;
	onProducts: (items: Product[]) => void;
	onDeliveryQuote: (quote: DeliveryQuote) => void;
	onOpenCheckoutWizard?: () => void;
	onOrderCreated: (payUrl: string, orderId: string, expiresIn: number) => void;
	onOrderTracking?: (tracking: OrderTracking) => void;
	onPerishableWarning: (message: string, alternatives: Product[]) => void;
	onCartUpdate: (cart: CartItem[]) => void;
	onStatus?: (message: string) => void;
	onChips?: (items: string[]) => void;
	onGiftMessageSuggestion?: (
		productId: string,
		messageEn: string,
		messageSi?: string,
	) => void;
	onSessionContext?: (context: SessionContext) => void;
	onError: (message: string) => void;
	onDone: () => void;
}

function dispatchEvent(event: SseEvent, callbacks: StreamChatCallbacks): void {
	switch (event.type) {
		case 'text':
			callbacks.onText(event.content);
			break;
		case 'products':
			callbacks.onProducts(event.items);
			break;
		case 'delivery_quote':
			callbacks.onDeliveryQuote(event.quote);
			break;
		case 'open_checkout_wizard':
			callbacks.onOpenCheckoutWizard?.();
			break;
		case 'order_created':
			callbacks.onOrderCreated(event.pay_url, event.order_id, event.expires_in);
			break;
		case 'order_tracking':
			callbacks.onOrderTracking?.(event.tracking);
			break;
		case 'perishable_warning':
			callbacks.onPerishableWarning(event.message, event.alternatives);
			break;
		case 'cart_update':
			callbacks.onCartUpdate(event.cart);
			break;
		case 'status':
			callbacks.onStatus?.(event.message);
			break;
		case 'chips':
			callbacks.onChips?.(event.items);
			break;
		case 'gift_message_suggestion':
			callbacks.onGiftMessageSuggestion?.(
				event.productId,
				event.messageEn,
				event.messageSi,
			);
			break;
		case 'session_context':
			callbacks.onSessionContext?.(event.context);
			break;
		case 'error':
			callbacks.onError(event.message);
			break;
		case 'done':
			callbacks.onDone();
			break;
	}
}

function parseSseLine(
	line: string,
	callbacks: StreamChatCallbacks,
	onDone?: () => void,
): void {
	if (!line.startsWith('data:')) return;
	const json = line.slice(5).trim();
	if (!json) return;
	try {
		const event = JSON.parse(json) as SseEvent;
		if (event.type === 'done') {
			onDone?.();
			return;
		}
		dispatchEvent(event, callbacks);
	} catch {
		// skip malformed chunks
	}
}

function parseSseBuffer(
	buffer: string,
	callbacks: StreamChatCallbacks,
	onDone?: () => void,
): string {
	const parts = buffer.split('\n\n');
	const remainder = parts.pop() ?? '';

	for (const part of parts) {
		if (!part.trim()) continue;
		const lines = part.split('\n');
		for (const line of lines) {
			parseSseLine(line, callbacks, onDone);
		}
	}

	return remainder;
}

/**
 * POST /api/chat with ReadableStream — parses SSE `data: {...}\n\n` frames.
 */
export async function streamChat(
	body: {
		message: string;
		session_id: string;
		cart: CartItem[];
		mode: ChatMode;
		messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
		context?: SessionContext;
	},
	callbacks: StreamChatCallbacks,
	signal?: AbortSignal,
): Promise<void> {
	let res: Response;
	try {
		res = await fetch(`${getApiBase()}/api/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal,
		});
	} catch {
		callbacks.onError(normalizeStreamError(''));
		callbacks.onDone();
		return;
	}

	if (!res.ok || !res.body) {
		callbacks.onError(normalizeStreamError('', res.status));
		callbacks.onDone();
		return;
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let finished = false;
	const finish = () => {
		if (finished) return;
		finished = true;
		callbacks.onDone();
	};

	// Throttle onText updates to avoid excessive re-renders.
	let textBuffer = '';
	let textTimer: number | null = null;
	const flushText = () => {
		if (textBuffer) {
			callbacks.onText(textBuffer);
			textBuffer = '';
		}
		if (textTimer) {
			clearTimeout(textTimer);
			textTimer = null;
		}
	};

	const wrappedCallbacks: StreamChatCallbacks = {
		...callbacks,
		onText: (content: string) => {
			// append and schedule flush
			textBuffer += content;
			if (!textTimer) {
				// flush at most every 60ms
				// eslint-disable-next-line @typescript-eslint/no-implied-eval
				textTimer = setTimeout(() => flushText(), 60) as unknown as number;
			}
		},
	} as StreamChatCallbacks;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			buffer = parseSseBuffer(
				buffer,
				wrappedCallbacks,
				finish,
			);
		}
		if (buffer.trim()) {
			const trailing = buffer.includes('\n')
				? buffer
				: `${buffer}\n`;
			for (const line of trailing.split('\n')) {
				parseSseLine(line, wrappedCallbacks, finish);
			}
		}
	} finally {
		flushText();
		finish();
	}
}
