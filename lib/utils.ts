import type { Product } from "./types";

/** Merge product lists from multiple SSE events without duplicate React keys */
export function dedupeProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of products) {
    if (!p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatLKR(amount: number): string {
  return `Rs ${amount.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-LK", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Strip fenced JSON / API error blobs from assistant message text */
export function stripJsonFromDisplay(text: string): string {
  let out = text
    .replace(/```(?:json)?\s*\{[\s\S]*?\}```/gi, "")
    .replace(/<function[^>]*>[\s\S]*?(<\/function>|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (out.startsWith("{") && out.includes('"error"')) {
    return "";
  }
  if (out.length > 300 && /"error"\s*:\s*\{/.test(out)) {
    return "";
  }
  return out;
}

/** Never show raw API JSON in the chat bubble */
export function toUserFriendlyError(message: string): string {
  const fallback =
    "Something went wrong. Please try again or rephrase your request.";
  if (!message) return fallback;
  if (
    message.startsWith("{") ||
    message.includes('"error"') ||
    message.includes("tool_use_failed") ||
    message.includes("invalid_request_error") ||
    message.length > 280
  ) {
    return fallback;
  }
  return message;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function hasVariants(product: {
  variants?: { sizes?: string[]; colors?: string[]; flavors?: string[] };
}): boolean {
  const v = product.variants;
  if (!v) return false;
  return Boolean(
    (v.sizes && v.sizes.length > 0) ||
      (v.colors && v.colors.length > 0) ||
      (v.flavors && v.flavors.length > 0)
  );
}

export function getVariantOptions(product: {
  variants?: { sizes?: string[]; colors?: string[]; flavors?: string[] };
}): string[] {
  const v = product.variants;
  if (!v) return [];
  return [
    ...(v.sizes ?? []),
    ...(v.colors ?? []),
    ...(v.flavors ?? []),
  ];
}
