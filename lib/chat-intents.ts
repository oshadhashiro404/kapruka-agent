import type { ChatMode, Product } from "./types";
import { cartTotalLkr } from "./cart-store";
import type { CartItem } from "./types";

export function wantsAddFirstProduct(text: string): boolean {
  return /\b(add|put)\b.*\b(first|1st)\b/i.test(text.trim());
}

export function wantsAddSecondProduct(text: string): boolean {
  return /\b(add|put)\b.*\b(second|2nd)\b/i.test(text.trim());
}

export function wantsAddThirdProduct(text: string): boolean {
  return /\b(add|put)\b.*\b(third|3rd|last)\b/i.test(text.trim());
}

export function wantsAddBoth(text: string): boolean {
  return /\b(add both|add all|add them both)\b/i.test(text.trim());
}

export function wantsRemoveFirstProduct(text: string): boolean {
  return /\b(remove|delete)\b.*\b(first|1st)\b/i.test(text.trim());
}

export function wantsClearCart(text: string): boolean {
  return /\bclear\b.*\bcart\b/i.test(text.trim());
}

export function wantsCartSummary(text: string): boolean {
  return /\b(what'?s in my cart|show my cart|cart summary|review cart)\b/i.test(
    text.trim()
  );
}

export function wantsAcceptGiftMessage(text: string): boolean {
  return /\b(yes use that|use that message|sounds good|perfect message)\b/i.test(
    text.trim()
  );
}

export function isCheckoutChip(chip: string): boolean {
  return /checkout|pay/i.test(chip);
}

export function inferModeFromMessage(text: string, currentMode: ChatMode): ChatMode {
  if (currentMode !== "auto") return currentMode;
  return /gift|present|birthday|wedding|avurudu|vesak|මල|තෑග්/i.test(text)
    ? "gift"
    : "shopping";
}

export function isGiftIntent(text: string): boolean {
  return /gift|present|birthday|wedding|avurudu|vesak|මල|තෑග්/i.test(text);
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/** Match product by partial name from user text */
export function matchProductByName(
  text: string,
  products: Product[]
): Product | undefined {
  const lower = normalizeName(text);
  for (const p of products) {
    const name = normalizeName(p.name);
    if (lower.includes(name) || name.split(" ").some((w) => w.length > 3 && lower.includes(w))) {
      return p;
    }
  }
  const addMatch = text.match(/\badd\s+(?:the\s+)?(.+?)(?:\s+to\s+(?:my\s+)?cart)?$/i);
  if (addMatch) {
    const term = normalizeName(addMatch[1]);
    return products.find((p) => normalizeName(p.name).includes(term));
  }
  return undefined;
}

export function matchCartLineByName(
  text: string,
  items: CartItem[]
): CartItem | undefined {
  const removeMatch = text.match(/\b(?:remove|delete)\s+(?:the\s+)?(.+?)(?:\s+from\s+(?:my\s+)?cart)?$/i);
  const term = normalizeName(removeMatch?.[1] ?? text);
  return items.find((i) => normalizeName(i.product.name).includes(term));
}

export function formatCartSummary(items: CartItem[]): string {
  if (!items.length) return "Your cart is empty.";
  const lines = items.map(
    (i) =>
      `• ${i.product.name}${i.selected_variant ? ` (${i.selected_variant})` : ""} ×${i.quantity} — Rs ${(i.product.price_lkr * i.quantity).toLocaleString("en-LK")}${i.is_gift ? " 🎁" : ""}`
  );
  const total = cartTotalLkr(items);
  return `Here's your cart:\n${lines.join("\n")}\n\nTotal: Rs ${total.toLocaleString("en-LK")}`;
}

export function resolveAddProducts(
  text: string,
  products: Product[]
): Product[] {
  if (wantsAddBoth(text) && products.length >= 2) {
    return products.slice(0, 2);
  }
  if (wantsAddFirstProduct(text) && products[0]) return [products[0]];
  if (wantsAddSecondProduct(text) && products[1]) return [products[1]];
  if (wantsAddThirdProduct(text)) {
    const idx = /\blast\b/i.test(text) ? products.length - 1 : 2;
    if (products[idx]) return [products[idx]];
  }
  const byName = matchProductByName(text, products);
  if (byName) return [byName];

  const multiMatch = text.match(/\badd\s+(?:the\s+)?(.+?)\s+and\s+(?:the\s+)?(.+?)(?:\s+to\s+cart)?$/i);
  if (multiMatch) {
    const found: Product[] = [];
    for (const part of [multiMatch[1], multiMatch[2]]) {
      const p = products.find((pr) =>
        normalizeName(pr.name).includes(normalizeName(part))
      );
      if (p) found.push(p);
    }
    if (found.length) return found;
  }

  return [];
}
