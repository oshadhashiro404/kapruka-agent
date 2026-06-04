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

function normalizeProductId(id: string): string {
  return id.trim();
}

function bestImageUrl(...candidates: (string | undefined)[]): string {
  for (const u of candidates) {
    if (u?.startsWith("http")) return u;
  }
  return "";
}

function bestImages(a: string[] | undefined, b: string[] | undefined): string[] {
  const merged = [...(b ?? []), ...(a ?? [])].filter((u) => u?.startsWith("http"));
  return [...new Set(merged)];
}

/** Prefer the richer record when the same product id appears twice (e.g. after image enrich). */
function mergeProductEntry(prev: Product, next: Product): Product {
  return {
    ...prev,
    ...next,
    id: normalizeProductId(next.id || prev.id),
    name: next.name && next.name !== "undefined" ? next.name : prev.name,
    price_lkr: next.price_lkr > 0 ? next.price_lkr : prev.price_lkr,
    image_url: bestImageUrl(prev.image_url, next.image_url),
    images: bestImages(prev.images, next.images),
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
    const id = normalizeProductId(p.id);
    if (!id) continue;
    const prev = byId.get(id);
    byId.set(id, prev ? mergeProductEntry(prev, { ...p, id }) : { ...p, id });
  }
  return [...byId.values()];
}

/** Merge streamed product batches (e.g. enrich refresh replaces prior rows). */
export function mergeProductUpdates(
  existing: Product[],
  incoming: Product[]
): Product[] {
  if (!incoming.length) return existing;
  if (!existing.length) return dedupeProducts(incoming);

  const existingIds = new Set(
    existing.map((p) => normalizeProductId(p.id)).filter(Boolean)
  );
  const incomingIds = new Set(
    incoming.map((p) => normalizeProductId(p.id)).filter(Boolean)
  );
  const isEnrichRefresh =
    incomingIds.size > 0 &&
    existingIds.size > 0 &&
    incoming.length >= existing.length &&
    [...existingIds].every((id) => incomingIds.has(id));

  if (isEnrichRefresh) {
    return dedupeProducts(incoming);
  }
  return dedupeProducts([...existing, ...incoming]);
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
  const out = text
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
