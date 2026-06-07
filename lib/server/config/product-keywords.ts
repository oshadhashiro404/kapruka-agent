export interface ProductHint {
  pattern: RegExp;
  term: string;
}

export interface ScenarioMapping {
  patterns: RegExp[];
  query: string;
  advice?: string;
  occasion?: string;
}

export const PRODUCT_HINTS: ProductHint[] = [
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
  { pattern: /\bhamper\b/i, term: "hamper" },
  { pattern: /\bphone\b/i, term: "phone" },
  { pattern: /\blaptop\b/i, term: "laptop" },
  { pattern: /\bfruit\b/i, term: "fruit basket" },
];

export const GENERIC_TERMS = new Set([
  "gift",
  "gifts",
  "present",
  "presents",
  "something",
  "item",
]);

export const SCENARIO_PATTERNS: ScenarioMapping[] = [
  {
    patterns: [
      /\bbroke up\b/i,
      /\bex girlfriend\b/i,
      /\bex boyfriend\b/i,
      /\bapolog/i,
      /\bsorry\b/i,
      /\bmake up\b/i,
    ],
    query: "roses bouquet flowers apology",
    advice: "Hand-deliver it yourself — lands way better than a courier.",
    occasion: "apology",
  },
  {
    patterns: [/\bbirthday\b/i, /\bbday\b/i],
    query: "birthday cake gift",
    occasion: "birthday",
  },
  {
    patterns: [/\bwedding\b/i, /\bmarriage\b/i, /\banniversary\b/i],
    query: "wedding gift hamper",
    occasion: "wedding",
  },
  {
    patterns: [/\bbaby\b/i, /\bnewborn\b/i],
    query: "new baby gift",
    occasion: "baby",
  },
  {
    patterns: [/\bavurudu\b/i, /\bnew year\b/i],
    query: "avurudu gift hamper",
    occasion: "avurudu",
  },
  {
    patterns: [/\bexam\b/i, /\bpassed\b/i, /\bgraduat/i],
    query: "congratulations gift",
    occasion: "exams",
  },
  {
    patterns: [/\bvalentine\b/i, /\blove\b/i, /\bromantic\b/i],
    query: "romantic roses chocolate gift",
    occasion: "romantic",
  },
];

const CATEGORY_BROWSE =
  /(?:show me\s+)?(?:products in|items in)\s+(.+?)(?:\s+category)?$/i;

export function extractProductTerms(text: string): string[] {
  const terms = new Set<string>();
  for (const { pattern, term } of PRODUCT_HINTS) {
    if (pattern.test(text)) terms.add(term);
  }
  return Array.from(terms);
}

export function hasSpecificKeyword(keywords: string[]): boolean {
  return keywords.some((k) => !GENERIC_TERMS.has(k));
}

export function matchScenario(text: string): ScenarioMapping | undefined {
  return SCENARIO_PATTERNS.find((s) => s.patterns.some((p) => p.test(text)));
}

export function isNarrativeMessage(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.split(/\s+/).length >= 12) return true;
  if (matchScenario(trimmed)) return true;
  return /\b(i need|i want|looking for|help me|my (mom|dad|wife|husband|girlfriend|boyfriend|friend))\b/i.test(
    trimmed
  );
}

export function parseCategoryBrowse(text: string): string | undefined {
  const m = text.match(CATEGORY_BROWSE);
  if (!m) return undefined;
  const cat = m[1].trim().replace(/\s+category$/i, "");
  return cat.length > 1 ? cat : undefined;
}

export function buildRefinedQuery(text: string, labels: string[]): string {
  const scenario = matchScenario(text);
  if (scenario) return scenario.query;

  const specific = labels.filter((l) => !GENERIC_TERMS.has(l));
  if (specific.length >= 2) {
    if (specific.includes("roses") || specific.includes("bouquet")) {
      return "roses bouquet flowers";
    }
    if (specific.includes("cake") && specific.includes("gift")) {
      return "birthday cake gift";
    }
    if (specific.includes("chocolate") && specific.includes("flowers")) {
      return "flowers chocolate gift combo";
    }
    return specific.slice(0, 3).join(" ");
  }
  if (specific.length === 1) {
    const term = specific[0];
    if (term === "flowers" || term === "roses") return "roses bouquet flowers";
    if (term === "cake") return "birthday cake";
    if (term === "gift") return "gift hamper";
    return term;
  }
  return labels.slice(0, 3).join(" ") || "gift";
}

export const DEFAULT_PRODUCT_CHIPS = [
  "Add first",
  "See more",
  "Check delivery",
  "Different budget",
];

export function buildCartChips(itemCount: number): string[] {
  if (itemCount > 0) {
    return [
      `Review cart (${itemCount} item${itemCount === 1 ? "" : "s"})`,
      "Check delivery",
      "Checkout",
    ];
  }
  return DEFAULT_PRODUCT_CHIPS;
}
