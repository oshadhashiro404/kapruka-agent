import type { Session } from "../types";
import {
  extractProductTerms,
  hasSpecificKeyword,
  isNarrativeMessage,
  parseCategoryBrowse,
  PRODUCT_HINTS,
} from "../config/product-keywords";
import {
  buildSearchParams,
  buildIntentReply,
  runIntentSearch,
  type ShoppingIntent,
} from "./intent-search";

export type IntentType =
  | "browse"
  | "gift_search"
  | "add_to_cart"
  | "checkout"
  | "track"
  | "delivery_query"
  | "clarify"
  | "chit_chat"
  | "category_browse";

export interface Intent {
  type: IntentType;
  confidence: number;
  extractedBudget?: number;
  extractedCity?: string;
  extractedKeywords: string[];
  extractedCategory?: string;
  isNegation: boolean;
  isFollowUp: boolean;
  requiresCheckout: boolean;
  skipFastPath: boolean;
  isNarrative: boolean;
  searchIntent?: ShoppingIntent;
}

export { PRODUCT_HINTS };

const SL_CITIES =
  /\b(colombo|kandy|galle|jaffna|negombo|matara|kurunegala|anuradhapura|ratnapura|badulla|trincomalee|batticaloa|nugegoda|dehiwala|moratuwa|panadura)\b/i;

const NEGATION =
  /\b(don'?t|do not|not|no|never|without)\s+(want|need|like|looking)\b/i;

const CHECKOUT =
  /\b(checkout|check out|pay|purchase|buy now|place order|create order|i want to pay)\b/i;

const TRACK =
  /\b(track|where is|status of)\s+(my\s+)?(order|package|delivery)\b/i;

const DELIVERY =
  /\b(deliver|delivery|ship)\s+(to|in)?\b|\bcan you deliver\b/i;

const FOLLOW_UP =
  /\b(that one|the first|first one|second one|add it|add that|yes please|yeah|yep|sure|include it|i want that|this one)\b/i;

const ADD_CART =
  /\b(add|put)\s+(the\s+)?(first|second|third|that|this|it)\b/i;

const CLARIFY =
  /\b(what do you mean|which one|tell me more|explain|clarify)\b/i;

const CHIT =
  /^(hi|hello|hey|thanks|thank you|ok|okay|bye|goodbye)[\s!.?]*$/i;

const BUDGET_SIGNAL =
  /(?:rs\.?\s*|lkr\s*)?(\d{1,3}(?:,\d{3})+|\d{4,7})(?:\s*(?:lkr|rs\.?))?|(?:under|around|about|budget|max)\s*(?:rs\.?\s*)?(\d+)/i;

const GENERIC_TERMS = new Set([
  "gift",
  "gifts",
  "present",
  "presents",
  "something",
  "item",
]);

function parseBudgetLkr(text: string): number | undefined {
  const m = text.match(BUDGET_SIGNAL);
  if (!m) return undefined;
  const raw = (m[1] ?? m[2] ?? "").replace(/,/g, "");
  const n = parseInt(raw, 10);
  return n >= 500 && n <= 5_000_000 ? n : undefined;
}

function extractKeywords(text: string): string[] {
  return extractProductTerms(text);
}

function extractCity(text: string): string | undefined {
  const m = text.match(SL_CITIES);
  return m ? m[1] : undefined;
}

function recentUserText(session: Session, current: string): string {
  return session.messages
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.content)
    .concat(current)
    .join(" ");
}

function lastAssistantAskedQuestion(session: Session): boolean {
  const last = [...session.messages].reverse().find((m) => m.role === "model");
  if (!last) return false;
  return /\?/.test(last.content);
}

export function classifyIntent(
  session: Session,
  userMessage: string
): Intent {
  const msg = userMessage.trim();
  const context = recentUserText(session, msg);
  const keywords = extractKeywords(context);
  const budget = parseBudgetLkr(context) ?? parseBudgetLkr(msg);
  const city = extractCity(msg) ?? extractCity(context);
  const category = parseCategoryBrowse(msg);
  const narrative = isNarrativeMessage(msg);
  const isNegation = NEGATION.test(msg) || /\bno\s+(flowers|cake|gift)/i.test(msg);
  const isFollowUp =
    FOLLOW_UP.test(msg) ||
    ADD_CART.test(msg) ||
    (lastAssistantAskedQuestion(session) &&
      /^(yes|yeah|yep|sure|ok|okay|please)[\s!.?]*$/i.test(msg));

  let type: IntentType = "chit_chat";
  let confidence = 0.3;

  if (category) {
    type = "category_browse";
    confidence = 0.88;
  } else if (CHIT.test(msg) && keywords.length === 0) {
    return {
      type: "chit_chat",
      confidence: 0.85,
      extractedKeywords: [],
      isNegation,
      isFollowUp,
      requiresCheckout: false,
      skipFastPath: narrative,
      isNarrative: narrative,
    };
  }

  if (TRACK.test(msg)) {
    type = "track";
    confidence = 0.9;
  } else if (CHECKOUT.test(msg)) {
    type = "checkout";
    confidence = 0.92;
  } else if (DELIVERY.test(msg) || (city && /\bdeliver/i.test(msg))) {
    type = "delivery_query";
    confidence = 0.8;
  } else if (ADD_CART.test(msg)) {
    type = "add_to_cart";
    confidence = 0.75;
  } else if (CLARIFY.test(msg)) {
    type = "clarify";
    confidence = 0.7;
  } else if (keywords.length > 0 && (budget || /\bgift\b/i.test(context))) {
    type = budget ? "gift_search" : "browse";
    confidence = budget ? 0.82 : 0.72;
    if (keywords.length >= 2) confidence += 0.08;
  } else if (keywords.length > 0) {
    type = "browse";
    confidence = 0.65 + Math.min(keywords.length * 0.05, 0.15);
  }

  if (isFollowUp) {
    confidence = Math.min(confidence, 0.55);
    type = type === "browse" ? "clarify" : type;
  }

  if (isNegation) confidence = 0.2;

  const requiresCheckout = type === "checkout";
  const skipFastPath = narrative;

  let searchIntent: ShoppingIntent | undefined;
  if (
    !isNegation &&
    !isFollowUp &&
    (keywords.length > 0 || category) &&
    confidence >= 0.65 &&
    (type === "browse" || type === "gift_search" || type === "category_browse") &&
    (budget !== undefined || hasSpecificKeyword(keywords) || category)
  ) {
    searchIntent = {
      query: category ?? keywords.slice(0, 4).join(" "),
      budgetLkr: budget,
      labels: category ? [category, ...keywords] : keywords,
      category,
    };
  }

  if (
    searchIntent &&
    searchIntent.labels.every((k) => GENERIC_TERMS.has(k)) &&
    !searchIntent.budgetLkr &&
    !category
  ) {
    searchIntent = undefined;
  }

  return {
    type,
    confidence: Math.min(confidence, 1),
    extractedBudget: budget,
    extractedCity: city,
    extractedKeywords: keywords,
    extractedCategory: category,
    isNegation,
    isFollowUp,
    requiresCheckout,
    skipFastPath,
    isNarrative: narrative,
    searchIntent,
  };
}

export function shouldFastPathSearch(intent: Intent): boolean {
  if (intent.skipFastPath) return false;
  if (!intent.searchIntent) return false;
  const si = intent.searchIntent;
  const canSearch =
    si.budgetLkr !== undefined ||
    hasSpecificKeyword(si.labels) ||
    Boolean(si.category);
  return (
    canSearch &&
    intent.confidence >= 0.65 &&
    !intent.isNegation &&
    !intent.isFollowUp &&
    !intent.requiresCheckout &&
    intent.type !== "track" &&
    intent.type !== "checkout"
  );
}

export { buildSearchParams, buildIntentReply, runIntentSearch };
