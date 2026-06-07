import Groq from "groq-sdk";
import { getOccasionProfile } from "../config/occasion-profiles";
import { rankProductsByRelevance, type RelevanceContext } from "./product-relevance";
import type { Product } from "../types";

const MODEL_FAST =
  process.env.GROQ_MODEL_FAST ??
  process.env.GROQ_MODEL ??
  "llama-3.1-8b-instant";

const CURATOR_PROMPT = `
You are Kapruka's emotional gift curator for Sri Lanka. Pick products that match the human situation — not just keywords.

Read the user's story, occasion, and emotional tone. From the candidate product list, return ONLY valid JSON:
{
  "pickedIds": ["id1", "id2", ...],
  "topPickReason": "one warm sentence why #1 fits emotionally (English, local flavor OK, no Sinhala script)",
  "pairingTip": "optional short tip to pair items or add a card" or null
}

Rules:
- pickedIds: 4-8 best matches, ordered best-first. Use exact IDs from the list.
- Reject items that feel wrong for the emotion (e.g. electronics for apology flowers).
- Prefer in-stock, occasion-appropriate, budget-sensible items.
- For apology/romantic → roses, bouquets, thoughtful combos — not random gadgets.
- For birthday → cake, celebration gifts.
- topPickReason: sound human ("This bouquet says sorry without overdoing it").
`.trim();

export interface CurationResult {
  products: Product[];
  topPickReason?: string;
  pairingTip?: string;
}

function getGroq(): Groq | null {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("your_groq_api_key")) return null;
  return new Groq({ apiKey: key });
}

export async function curateProductsEmotionally(
  candidates: Product[],
  userMessage: string,
  ctx: RelevanceContext
): Promise<CurationResult> {
  const preRanked = rankProductsByRelevance(candidates, ctx, {
    minScore: 0.12,
    limit: 14,
  });

  if (preRanked.length <= 3) {
    return { products: preRanked };
  }

  const groq = getGroq();
  if (!groq) {
    return { products: preRanked.slice(0, 8) };
  }

  const profile = getOccasionProfile(ctx.occasion);
  const compact = preRanked.map((p) => ({
    id: p.id,
    name: p.name.slice(0, 80),
    price_lkr: p.price_lkr,
    category: p.category,
    in_stock: p.in_stock,
  }));

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_FAST,
      messages: [
        { role: "system", content: CURATOR_PROMPT },
        {
          role: "user",
          content: [
            `User message: ${userMessage}`,
            `Occasion: ${ctx.occasion ?? "general"}`,
            `Emotional tone: ${profile.emotionalTone}`,
            `Search query: ${ctx.query}`,
            ctx.budgetLkr ? `Budget ~Rs ${ctx.budgetLkr}` : "",
            `Candidates: ${JSON.stringify(compact)}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
      pickedIds?: string[];
      topPickReason?: string;
      pairingTip?: string;
    };

    const ids = raw.pickedIds ?? [];
    const byId = new Map(preRanked.map((p) => [p.id, p]));
    const picked: Product[] = [];
    for (const id of ids) {
      const p = byId.get(id);
      if (p) picked.push(p);
    }

    if (picked.length >= 2) {
      return {
        products: picked.slice(0, 8),
        topPickReason: raw.topPickReason,
        pairingTip: raw.pairingTip ?? undefined,
      };
    }
  } catch {
    // fall through
  }

  return { products: preRanked.slice(0, 8) };
}
