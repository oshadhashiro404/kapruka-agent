import type { Product } from "./types";

/** Kapruka CDN blocks hotlinking — serve via same-origin proxy with Referer */
export function productImageSrc(url: string | undefined): string {
  if (!url?.startsWith("http")) return "";
  try {
    const host = new URL(url).hostname;
    if (host === "kapruka.com" || host.endsWith(".kapruka.com")) {
      return `/api/product-image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return "";
  }
  return url;
}

/** Prefer the richer record when the same product id appears twice (e.g. after image enrich). */
function mergeProductEntry(prev: Product, next: Product): Product {
  return {
    ...prev,
    ...next,
    id: next.id || prev.id,
    name: next.name && next.name !== "undefined" ? next.name : prev.name,
    price_lkr: next.price_lkr > 0 ? next.price_lkr : prev.price_lkr,
    image_url: next.image_url || prev.image_url,
    images: next.images?.length ? next.images : prev.images,
    url:
      next.url && next.url !== "https://www.kapruka.com" ? next.url : prev.url,
    in_stock: next.in_stock ?? prev.in_stock,
    is_perishable: next.is_perishable ?? prev.is_perishable,
    category: next.category || prev.category,
    variants: next.variants ?? prev.variants,
  };
}

/** Merge product lists from multiple SSE events without duplicate React keys */
export function dedupeProducts(products: Product[]): Product[] {
  const byId = new Map<string, Product>();
  for (const p of products) {
    if (!p.id) continue;
    const prev = byId.get(p.id);
    byId.set(p.id, prev ? mergeProductEntry(prev, p) : p);
  }
  return [...byId.values()];
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
