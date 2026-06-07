import { searchProducts } from "./mcp";
import {
  buildRefinedQuery,
  matchScenario,
} from "../config/product-keywords";
import type { Product, Session } from "../types";

export interface ShoppingIntent {
  query: string;
  budgetLkr?: number;
  labels: string[];
  category?: string;
}

function parseBudgetLkr(text: string): number | undefined {
  const m = text.match(
    /(?:rs\.?\s*|lkr\s*)?(\d{1,3}(?:,\d{3})+|\d{4,7})(?:\s*(?:lkr|rs\.?))?/i
  );
  if (!m) return undefined;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return n >= 500 && n <= 5_000_000 ? n : undefined;
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
  const labels = recentUser
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  if (labels.length === 0) return null;

  const query = buildRefinedQuery(recentUser, labels);

  return { query, budgetLkr, labels };
}

export function buildSearchParams(intent: ShoppingIntent): {
  q: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  limit: number;
} {
  const refined = buildRefinedQuery(intent.query, intent.labels);
  const params: {
    q: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    limit: number;
  } = {
    q: refined || intent.query,
    limit: 10,
  };

  if (intent.category) {
    params.category = intent.category;
    params.q = intent.category;
  }

  if (intent.budgetLkr) {
    params.min_price = Math.round(intent.budgetLkr * 0.4);
    params.max_price = Math.round(intent.budgetLkr * 1.2);
  }

  return params;
}

async function searchWithFallbacks(
  intent: ShoppingIntent
): Promise<Product[]> {
  const params = buildSearchParams(intent);
  let { products } = await searchProducts(params);

  if (products.length === 0 && intent.budgetLkr) {
    ({ products } = await searchProducts({
      q: params.q,
      category: params.category,
      min_price: Math.round(intent.budgetLkr * 0.25),
      max_price: Math.round(intent.budgetLkr * 1.5),
      limit: 10,
    }));
  }

  if (products.length === 0 && (params.min_price || params.max_price)) {
    ({ products } = await searchProducts({
      q: params.q,
      category: params.category,
      limit: 10,
    }));
  }

  if (products.length === 0 && intent.labels.length > 1) {
    for (const term of intent.labels) {
      const { products: batch } = await searchProducts({
        q: term,
        limit: 5,
      });
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

export async function runIntentSearch(
  intent: ShoppingIntent
): Promise<Product[]> {
  return searchWithFallbacks(intent);
}

export function buildIntentReply(intent: ShoppingIntent, count: number): string {
  const scenario = matchScenario(intent.query);
  const budgetPart = intent.budgetLkr
    ? ` around Rs ${intent.budgetLkr.toLocaleString("en-LK")}`
    : "";
  const types = intent.labels.filter((l) => l !== intent.category).join(", ") || intent.query;

  if (count === 0) {
    return `Hmm, I couldn't find ${types}${budgetPart} on Kapruka right now. Want me to try a wider budget or different items?`;
  }

  const opener = scenario?.advice
    ? `Aiyo — ${scenario.advice}`
    : "Nice choice!";

  return `${opener} Here are ${count} great find${count === 1 ? "" : "s"} for ${types}${budgetPart} — tap Add on anything you like.`;
}
