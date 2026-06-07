import { getOccasionProfile } from "../config/occasion-profiles";
import { matchScenario } from "../config/product-keywords";
import type { ShoppingIntent } from "./intent-search";
import { searchProducts } from "./mcp";
import { rankProductsByRelevance, type RelevanceContext } from "./product-relevance";
import {
  curateProductsEmotionally,
  type CurationResult,
} from "./product-curator";
import type { Product } from "../types";

export interface SmartSearchOptions {
  userMessage?: string;
  occasion?: string | null;
  mustHave?: string[];
  avoid?: string[];
  /** Use Groq emotional curation (best for narrative/emotional queries) */
  emotionalCuration?: boolean;
}

export interface SmartSearchResult {
  products: Product[];
  searchQuery: string;
  curation?: CurationResult;
}

async function multiQueryFetch(intent: ShoppingIntent): Promise<Product[]> {
  const scenario = matchScenario(intent.query);
  const profile = getOccasionProfile(scenario?.occasion ?? null);

  const queries = new Set<string>([intent.query]);
  if (intent.category) queries.add(intent.category);
  for (const alt of profile.alternateQueries.slice(0, 2)) {
    queries.add(alt);
  }

  const all: Product[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const params: Parameters<typeof searchProducts>[0] = {
      q,
      limit: 10,
    };
    if (intent.category) params.category = intent.category;
    if (intent.budgetLkr) {
      params.min_price = Math.round(intent.budgetLkr * 0.35);
      params.max_price = Math.round(intent.budgetLkr * 1.3);
    }

    try {
      const { products } = await searchProducts(params);
      for (const p of products) {
        if (p.id && !seen.has(p.id)) {
          seen.add(p.id);
          all.push(p);
        }
      }
    } catch {
      continue;
    }
    if (all.length >= 20) break;
  }

  if (all.length === 0) {
    const { products } = await searchProducts({
      q: intent.query,
      category: intent.category,
      limit: 12,
    });
    return products;
  }

  return all;
}

function buildRelevanceContext(
  intent: ShoppingIntent,
  options: SmartSearchOptions
): RelevanceContext {
  const scenario = matchScenario(options.userMessage ?? intent.query);
  return {
    query: intent.query,
    labels: intent.labels,
    budgetLkr: intent.budgetLkr,
    occasion: options.occasion ?? scenario?.occasion ?? null,
    userMessage: options.userMessage,
    category: intent.category,
    mustHave: options.mustHave,
    avoid: options.avoid,
  };
}

/**
 * Search Kapruka, filter irrelevant MCP hits, optionally curate with emotional intelligence.
 */
export async function smartSearch(
  intent: ShoppingIntent,
  options: SmartSearchOptions = {}
): Promise<SmartSearchResult> {
  const raw = await multiQueryFetch(intent);
  const ctx = buildRelevanceContext(intent, options);

  const ranked = rankProductsByRelevance(raw, ctx, {
    minScore: 0.28,
    limit: 12,
  });

  if (options.emotionalCuration && ranked.length > 2) {
    const curation = await curateProductsEmotionally(
      raw,
      options.userMessage ?? intent.query,
      ctx
    );
    return {
      products: curation.products,
      searchQuery: intent.query,
      curation,
    };
  }

  return {
    products: ranked.slice(0, 8),
    searchQuery: intent.query,
  };
}
