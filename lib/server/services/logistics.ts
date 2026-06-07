import { searchProducts, quoteDeliveryByCityName } from "./mcp";
import { runIntentSearch } from "./intent-search";
import type { CartItem, Product } from "../types";

const PERISHABLE_CATEGORIES = new Set([
  "cakes",
  "flowers",
  "gift combos",
  "groceries",
  "chocolates",
]);

export function isPerishableProduct(product: Product): boolean {
  if (product.is_perishable) return true;
  return PERISHABLE_CATEGORIES.has(product.category?.toLowerCase() ?? "");
}

/** Pick the most restrictive perishable item for delivery quoting */
export function selectLeadProductForQuote(
  cart: CartItem[],
  lastProductIds?: string[],
  products?: Product[]
): Product | undefined {
  const fromCart = cart.map((c) => c.product);
  if (fromCart.length > 0) {
    const perishable = fromCart.find(isPerishableProduct);
    return perishable ?? fromCart[0];
  }
  if (products?.length) {
    const perishable = products.find(isPerishableProduct);
    return perishable ?? products[0];
  }
  return undefined;
}

export function parseDeliveryDate(text: string): string | undefined {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (/\btoday\b/i.test(text)) return fmt(today);

  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }

  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const slash = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return undefined;
}

export async function fetchPerishableAlternatives(
  category: string,
  budgetLkr?: number
): Promise<Product[]> {
  const queries = [
    "gift hamper",
    "chocolate gift box",
    "perfume gift",
    "electronics gift",
  ];
  const all: Product[] = [];

  for (const q of queries) {
    try {
      const intent = {
        query: q,
        budgetLkr,
        labels: [q.split(" ")[0]],
      };
      const batch = await runIntentSearch(intent);
      const nonPerishable = batch.filter((p) => !isPerishableProduct(p));
      all.push(...nonPerishable);
      if (all.length >= 4) break;
    } catch {
      continue;
    }
  }

  const seen = new Set<string>();
  return all.filter((p) => {
    if (!p.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).slice(0, 5);
}

export async function quoteCartDelivery(
  city: string,
  date: string,
  leadProductId: string
) {
  return quoteDeliveryByCityName(city, date, leadProductId);
}

export { searchProducts };
