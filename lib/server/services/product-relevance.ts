import { GENERIC_TERMS } from "../config/product-keywords";
import {
  getOccasionProfile,
  type OccasionProfile,
} from "../config/occasion-profiles";
import type { Product } from "../types";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "in",
  "on",
  "with",
  "my",
  "me",
  "i",
  "need",
  "want",
  "show",
  "find",
  "get",
  "some",
  "please",
  "kapruka",
  "gift",
  "gifts",
  "present",
  "item",
  "items",
  "product",
  "products",
]);

export interface RelevanceContext {
  query: string;
  labels?: string[];
  budgetLkr?: number;
  occasion?: string | null;
  userMessage?: string;
  category?: string;
  mustHave?: string[];
  avoid?: string[];
}

export interface ScoredProduct {
  product: Product;
  score: number;
  reasons: string[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t) && !GENERIC_TERMS.has(t));
}

function uniqueTokens(...sources: string[]): string[] {
  const set = new Set<string>();
  for (const s of sources) {
    for (const t of tokenize(s)) set.add(t);
  }
  return [...set];
}

function containsTerm(text: string, term: string): boolean {
  const lower = text.toLowerCase();
  if (term.length <= 3) return lower.split(/\W+/).includes(term);
  return lower.includes(term);
}

function scoreProduct(
  product: Product,
  queryTokens: string[],
  profile: OccasionProfile,
  ctx: RelevanceContext
): ScoredProduct {
  const name = product.name ?? "";
  const category = (product.category ?? "").toLowerCase();
  const blob = `${name} ${category}`.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  for (const token of queryTokens) {
    if (containsTerm(name, token)) {
      score += 4;
      reasons.push(`name:${token}`);
    } else if (containsTerm(category, token)) {
      score += 2;
      reasons.push(`cat:${token}`);
    }
  }

  for (const term of ctx.mustHave ?? profile.mustHave) {
    if (containsTerm(blob, term)) {
      score += 3;
      reasons.push(`must:${term}`);
    }
  }

  for (const term of ctx.avoid ?? profile.avoid) {
    if (containsTerm(blob, term)) {
      score -= 5;
      reasons.push(`avoid:${term}`);
    }
  }

  if (profile.categories.length > 0) {
    const catHit = profile.categories.some((c) => category.includes(c));
    if (catHit) {
      score += 2;
      reasons.push("occasion-category");
    } else if (category && !queryTokens.some((t) => category.includes(t))) {
      score -= 2;
      reasons.push("wrong-category");
    }
  }

  if (ctx.category && category.includes(ctx.category.toLowerCase())) {
    score += 4;
    reasons.push("requested-category");
  }

  if (ctx.budgetLkr && product.price_lkr > 0) {
    const min = ctx.budgetLkr * 0.35;
    const max = ctx.budgetLkr * 1.25;
    if (product.price_lkr >= min && product.price_lkr <= max) {
      score += 2;
      reasons.push("budget-fit");
    } else if (product.price_lkr > ctx.budgetLkr * 1.6) {
      score -= 3;
      reasons.push("over-budget");
    } else if (product.price_lkr < ctx.budgetLkr * 0.2) {
      score -= 1;
      reasons.push("too-cheap");
    }
  }

  if (product.in_stock) {
    score += 1;
  } else {
    score -= 4;
    reasons.push("out-of-stock");
  }

  if (!product.image_url && !(product.images?.length)) {
    score -= 0.5;
  }

  return { product, score, reasons };
}

function normalizeScores(scored: ScoredProduct[]): ScoredProduct[] {
  if (!scored.length) return [];
  const max = Math.max(...scored.map((s) => s.score), 1);
  const min = Math.min(...scored.map((s) => s.score), 0);
  const range = max - min || 1;
  return scored.map((s) => ({
    ...s,
    score: (s.score - min) / range,
  }));
}

export function rankProductsByRelevance(
  products: Product[],
  ctx: RelevanceContext,
  options?: { minScore?: number; limit?: number }
): Product[] {
  if (!products.length) return [];

  const profile = getOccasionProfile(ctx.occasion);
  const queryTokens = uniqueTokens(
    ctx.query,
    ctx.userMessage ?? "",
    ...(ctx.labels ?? [])
  );

  let scored = products.map((p) =>
    scoreProduct(p, queryTokens, profile, ctx)
  );
  scored = normalizeScores(scored);
  scored.sort((a, b) => b.score - a.score);

  const minScore = options?.minScore ?? 0.28;
  const limit = options?.limit ?? 8;

  let filtered = scored.filter((s) => s.score >= minScore);

  if (filtered.length < 2 && scored.length >= 2) {
    filtered = scored.filter((s) => s.score >= 0.15);
  }
  if (filtered.length === 0 && scored.length > 0) {
    filtered = scored.slice(0, Math.min(3, scored.length));
  }

  return filtered.slice(0, limit).map((s) => s.product);
}

export { tokenize, uniqueTokens };
