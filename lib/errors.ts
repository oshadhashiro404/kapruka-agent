export interface ApiErrorPayload {
  error?: string;
  details?: unknown;
  message?: string;
}

const FALLBACK =
  "Oops, something went wrong on my end. Mind trying again or rephrasing that?";

const RATE_LIMIT =
  "Whoa, I'm getting a lot of requests! Give me 30 seconds and try again.";

const OFFLINE = "Kapruka's having a little hiccup — please try again in a moment.";

const ORDER_RATE_LIMIT = "Too many orders. Please wait and try again.";

const CITY_NOT_FOUND =
  "I couldn't find that city. Did you mean one of these? Try the full name in English or Sinhala.";

function looksLikeRawJson(message: string): boolean {
  const trimmed = message.trim();
  return (
    trimmed.startsWith("{") ||
    trimmed.includes('"error"') ||
    trimmed.includes("tool_use_failed") ||
    trimmed.includes("invalid_request_error") ||
    message.length > 280
  );
}

export function parseApiErrorPayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as ApiErrorPayload;
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  return null;
}

export async function parseResponseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return (
      parseApiErrorPayload(data) ?? `Request failed (${res.status})`
    );
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function normalizeApiError(
  message: string,
  status?: number
): string {
  if (status === 429) return RATE_LIMIT;
  if (status === 404) return CITY_NOT_FOUND;
  if (!message) return FALLBACK;
  if (looksLikeRawJson(message)) return FALLBACK;
  return message;
}

export function normalizeOrderError(message: string, status?: number): string {
  if (status === 429) return ORDER_RATE_LIMIT;
  return normalizeApiError(message, status);
}

export function normalizeStreamError(message: string, status?: number): string {
  if (status === 429) return RATE_LIMIT;
  if (!message || looksLikeRawJson(message)) return OFFLINE;
  return message;
}

export function toUserFriendlyError(message: string): string {
  return normalizeApiError(message);
}
