import Groq from "groq-sdk";
import { z } from "zod";
import { CONCIERGE_PLANNER_PROMPT } from "../config/concierge-prompt";
import {
  buildRefinedQuery,
  buildCartChips,
  DEFAULT_PRODUCT_CHIPS,
  matchScenario,
} from "../config/product-keywords";
import type { Product, Session } from "../types";

const MODEL_FAST =
  process.env.GROQ_MODEL_FAST ??
  process.env.GROQ_MODEL ??
  "llama-3.1-8b-instant";

const conciergePlanSchema = z.object({
  searchQuery: z.string().optional(),
  budgetLkr: z.number().nullable().optional(),
  occasion: z.string().nullable().optional(),
  replyOpener: z.string().optional(),
  advice: z.string().nullable().optional(),
  chips: z.array(z.string()).optional(),
  suggestedAdds: z.array(z.number()).nullable().optional(),
  cartNudge: z.string().nullable().optional(),
  giftMessageEn: z.string().nullable().optional(),
  giftMessageSi: z.string().nullable().optional(),
  skipSearch: z.boolean().optional(),
  needsDeliveryDate: z.boolean().optional(),
});

export type ConciergePlan = z.infer<typeof conciergePlanSchema>;

function getGroq(): Groq | null {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("your_groq_api_key")) return null;
  return new Groq({ apiKey: key });
}

function fallbackPlan(session: Session, message: string): ConciergePlan {
  const scenario = matchScenario(message);
  const labels = message
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const query = buildRefinedQuery(message, labels);

  const budgetMatch = message.match(
    /(?:rs\.?\s*|lkr\s*)?(\d{1,3}(?:,\d{3})+|\d{4,7})/i
  );
  const budgetLkr = budgetMatch
    ? parseInt(budgetMatch[1].replace(/,/g, ""), 10)
    : undefined;

  let replyOpener = "Aiyo — let me find something good for you.";
  if (scenario?.occasion === "apology") {
    replyOpener =
      "Aiyo! Rough one — let's pick something she'd actually appreciate.";
  } else if (scenario?.occasion === "birthday") {
    replyOpener = "Love that! Birthday vibes — great picks coming up.";
  } else if (scenario?.occasion === "romantic") {
    replyOpener = "Nice — let's make it romantic without going overboard.";
  }

  const cartCount = session.cart.reduce((s, i) => s + i.quantity, 0);

  return {
    searchQuery: query,
    budgetLkr: budgetLkr && budgetLkr >= 500 ? budgetLkr : null,
    occasion: scenario?.occasion ?? null,
    replyOpener,
    advice: scenario?.advice ?? null,
    chips: buildCartChips(cartCount),
    skipSearch: false,
  };
}

export async function planConciergeTurn(
  session: Session,
  message: string
): Promise<ConciergePlan> {
  const groq = getGroq();
  if (!groq) return fallbackPlan(session, message);

  const cartSummary =
    session.cart.length > 0
      ? session.cart
          .map((c) => `${c.product.name} x${c.quantity}`)
          .join(", ")
      : "empty";

  const contextBits: string[] = [];
  if (session.context?.deliveryCity)
    contextBits.push(`city: ${session.context.deliveryCity}`);
  if (session.context?.pendingDeliveryDate)
    contextBits.push(`date: ${session.context.pendingDeliveryDate}`);

  const userContent = [
    `User message: ${message}`,
    `Cart: ${cartSummary}`,
    contextBits.length ? `Context: ${contextBits.join("; ")}` : "",
    `Mode: ${session.mode}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_FAST,
      messages: [
        { role: "system", content: CONCIERGE_PLANNER_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = conciergePlanSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      const plan = parsed.data;
      if (!plan.chips?.length) {
        plan.chips = buildCartChips(
          session.cart.reduce((s, i) => s + i.quantity, 0)
        );
      }
      if (!plan.searchQuery) {
        plan.searchQuery = buildRefinedQuery(message, []);
      }
      return plan;
    }
  } catch {
    // fall through
  }

  return fallbackPlan(session, message);
}

export function buildConciergeReply(
  plan: ConciergePlan,
  productCount: number,
  cartItemCount: number,
  cartTotalLkr: number
): string {
  if (plan.skipSearch) {
    return (
      plan.replyOpener ??
      "What kind of gift are you thinking — flowers, cake, hamper, electronics? And a rough budget in LKR?"
    );
  }

  const parts: string[] = [];
  if (plan.replyOpener) parts.push(plan.replyOpener);
  if (plan.advice) parts.push(plan.advice);
  if (plan.cartNudge) parts.push(plan.cartNudge);

  if (productCount === 0) {
    parts.push(
      "Hmm, nothing exact on Kapruka right now — want me to widen the budget or try something else?"
    );
  } else {
    parts.push(
      `Found ${productCount} pick${productCount === 1 ? "" : "s"} — tap Add on anything you like.`
    );
  }

  if (cartItemCount > 0) {
    parts.push(
      `Your cart has ${cartItemCount} item${cartItemCount === 1 ? "" : "s"} (Rs ${cartTotalLkr.toLocaleString("en-LK")} so far).`
    );
  }

  if (plan.giftMessageEn) {
    parts.push(
      `Want this on the card? "${plan.giftMessageEn}"`
    );
  }

  if (plan.needsDeliveryDate) {
    parts.push("When do you need this delivered — today, tomorrow, or a specific date?");
  }

  return parts.join(" ");
}

export function planToSearchIntent(
  plan: ConciergePlan,
  message: string,
  labels: string[]
): { query: string; budgetLkr?: number; labels: string[] } {
  return {
    query: plan.searchQuery ?? buildRefinedQuery(message, labels),
    budgetLkr: plan.budgetLkr ?? undefined,
    labels,
  };
}

export { DEFAULT_PRODUCT_CHIPS, buildCartChips };
