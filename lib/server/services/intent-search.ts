import { searchProducts } from "./mcp";
import type { Product, Session } from "../types";

export interface ShoppingIntent {
  query: string;
  budgetLkr?: number;
  labels: string[];
}

const PRODUCT_HINTS: { pattern: RegExp; term: string }[] = [
  { pattern: /\bflowers?\b/i, term: "flowers" },
  { pattern: /\bperfumes?\b/i, term: "perfume" },
  { pattern: /\bchocolates?\b/i, term: "chocolate" },
  { pattern: /\bcakes?\b/i, term: "cake" },
  { pattern: /\bgifts?\b/i, term: "gift" },
  { pattern: /\bjewel\w*/i, term: "jewelry" },
  { pattern: /\bwatches?\b/i, term: "watch" },
  { pattern: /\belectronics?\b/i, term: "electronics" },
  { pattern: /\bclothes?\b|\bclothing\b/i, term: "clothing" },
  { pattern: /\btoys?\b/i, term: "toy" },
  { pattern: /\bbooks?\b/i, term: "book" },
  { pattern: /\bbouquet\b/i, term: "bouquet" },
  { pattern: /\broses?\b/i, term: "roses" },
];

function parseBudgetLkr(text: string): number | undefined {
  const m = text.match(
    /(?:rs\.?\s*|lkr\s*)?(\d{1,3}(?:,\d{3})+|\d{4,7})(?:\s*(?:lkr|rs\.?))?/i
  );
  if (!m) return undefined;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return n >= 500 && n <= 5_000_000 ? n : undefined;
}

function extractTerms(text: string): string[] {
  const terms = new Set<string>();
  for (const { pattern, term } of PRODUCT_HINTS) {
    if (pattern.test(text)) terms.add(term);
  }
  return Array.from(terms);
}

/** Build intent from the latest user message plus recent context. */
export function parseShoppingIntent(
  session: Session,
  currentMessage: string
): ShoppingIntent | null {
  const recentUser = session.messages
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.content)
    .concat(currentMessage)
    .join(" ");

  const budgetLkr = parseBudgetLkr(recentUser) ?? parseBudgetLkr(currentMessage);
  const labels = extractTerms(recentUser);
  if (labels.length === 0) return null;

  const query = labels.slice(0, 4).join(" ");

  return { query, budgetLkr, labels };
}

export function buildSearchParams(intent: ShoppingIntent): {
  q: string;
  min_price?: number;
  max_price?: number;
  limit: number;
} {
  const params: {
    q: string;
    min_price?: number;
    max_price?: number;
    limit: number;
  } = {
    q: intent.query,
    limit: 10,
  };

  if (intent.budgetLkr) {
    params.min_price = Math.round(intent.budgetLkr * 0.4);
    params.max_price = Math.round(intent.budgetLkr * 1.2);
  }

  return params;
}

export async function runIntentSearch(
  intent: ShoppingIntent
): Promise<Product[]> {
  const params = buildSearchParams(intent);
  let { products } = await searchProducts(params);

  if (products.length === 0 && (params.min_price || params.max_price)) {
    ({ products } = await searchProducts({
      q: intent.query,
      limit: 10,
    }));
  }

  if (products.length === 0 && intent.labels.length > 1) {
    for (const term of intent.labels) {
      const { products: batch } = await searchProducts({ q: term, limit: 5 });
      products = [...products, ...batch];
      if (products.length >= 6) break;
    }
  }

  const seen = new Set<string>();
  return products.filter((p) => {
    if (!p.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function buildIntentReply(intent: ShoppingIntent, count: number): string {
  const budgetPart = intent.budgetLkr
    ? ` around Rs ${intent.budgetLkr.toLocaleString("en-LK")}`
    : "";
  const types = intent.labels.join(", ");

  if (count === 0) {
    return `Hmm, I couldn't find ${types}${budgetPart} on Kapruka right now. Want me to try a wider budget or different items?`;
  }

  return `Love that! Here are ${count} great finds for ${types}${budgetPart} — tap Add on anything you like, or tell me if you want fancier or cheaper options.`;
}
