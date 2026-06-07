import Groq from "groq-sdk";
import { KAPRUKA_SYSTEM_PROMPT } from "../config/system-prompt";
import { buildCartChips } from "../config/product-keywords";
import { KAPRUKA_GROQ_TOOLS } from "../config/kapruka-tools";
import {
  buildConciergeReply,
  planConciergeTurn,
  planToSearchIntent,
  type ConciergePlan,
} from "./concierge";
import {
  buildIntentReply,
  classifyIntent,
  runIntentSearch,
  shouldFastPathSearch,
  type Intent,
} from "./intent-classifier";
import {
  fetchPerishableAlternatives,
  parseDeliveryDate,
  quoteCartDelivery,
  selectLeadProductForQuote,
} from "./logistics";
import {
  executeMcpToolCall,
  getProduct,
  isValidProduct,
  parseKaprukaSearchMarkdown,
} from "./mcp";
import { patchSessionContext } from "./session";
import {
  ALLOW_STRONG_MODEL_RETRY,
  ENRICH_TOP_N,
  IS_SERVERLESS,
  MAX_HISTORY_MESSAGES,
  MAX_TOOL_ITERATIONS,
} from "../vercel-config";
import type {
  DeliveryQuote,
  Product,
  Session,
  SseEvent,
} from "../types";

const MODEL_FAST =
  process.env.GROQ_MODEL_FAST ??
  process.env.GROQ_MODEL ??
  "llama-3.1-8b-instant";
const MODEL_STRONG =
  process.env.GROQ_MODEL_STRONG ?? "llama-3.3-70b-versatile";

export type SseEmitter = (event: SseEvent) => void;

let groqClient: Groq | null = null;

function getGroq(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("your_groq_api_key")) {
    throw new Error(
      "Groq API key not configured. Set GROQ_API_KEY in .env (free at https://console.groq.com)."
    );
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: key });
  }
  return groqClient;
}

function selectModel(intent: Intent): string {
  if (intent.requiresCheckout) return MODEL_STRONG;
  if (intent.type === "track") return MODEL_STRONG;
  if (intent.isNarrative) return MODEL_STRONG;
  if (intent.confidence > 0.75 && intent.type === "browse") return MODEL_FAST;
  return MODEL_FAST;
}

function sessionToGroqMessages(
  session: Session
): Groq.Chat.Completions.ChatCompletionMessageParam[] {
  const recent = session.messages.slice(-MAX_HISTORY_MESSAGES);
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
  for (const msg of recent) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }
  return messages;
}

function buildUserContext(session: Session, message: string): string {
  const parts: string[] = [message];
  const ctx = session.context ?? {};

  const known: string[] = [];
  if (ctx.deliveryCity) known.push(`delivery city: ${ctx.deliveryCity}`);
  if (ctx.pendingDeliveryDate)
    known.push(`delivery date: ${ctx.pendingDeliveryDate}`);
  if (ctx.recipientName) known.push(`recipient: ${ctx.recipientName}`);
  if (ctx.recipientPhone) known.push(`phone: ${ctx.recipientPhone}`);
  if (ctx.recipientAddress) known.push(`address: ${ctx.recipientAddress}`);
  if (ctx.lastSearchQuery) known.push(`last search: ${ctx.lastSearchQuery}`);
  if (ctx.lastProducts?.length)
    known.push(`recent product IDs: ${ctx.lastProducts.join(", ")}`);

  if (known.length > 0) {
    parts.push(`\n[Known context: ${known.join("; ")}]`);
  }

  if (session.cart.length > 0) {
    parts.push(
      `\n[Current cart: ${JSON.stringify(
        session.cart.map((c) => ({
          id: c.product.id,
          name: c.product.name,
          qty: c.quantity,
          variant: c.selected_variant,
          is_gift: c.is_gift,
        }))
      )}]`
    );
  }
  if (session.mode !== "auto") {
    parts.push(`\n[Session mode: ${session.mode}]`);
  }
  return parts.join("");
}

function mergeProductRecord(prev: Product, next: Product): Product {
  const imageCandidates = [
    prev.image_url,
    next.image_url,
    prev.images?.[0],
    next.images?.[0],
  ].filter((u): u is string => Boolean(u?.startsWith("http")));
  const images = [
    ...new Set([...(next.images ?? []), ...(prev.images ?? [])].filter((u) =>
      u?.startsWith("http")
    )),
  ];
  return {
    ...prev,
    ...next,
    id: (next.id || prev.id).trim(),
    name: next.name && next.name !== "undefined" ? next.name : prev.name,
    price_lkr: next.price_lkr > 0 ? next.price_lkr : prev.price_lkr,
    image_url: imageCandidates[0] ?? "",
    images: images.length ? images : prev.images?.length ? prev.images : next.images,
    url:
      next.url && next.url !== "https://www.kapruka.com" ? next.url : prev.url,
  };
}

function dedupeProductsById(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) {
    if (!p.id) continue;
    const prev = map.get(p.id);
    map.set(p.id, prev ? mergeProductRecord(prev, p) : p);
  }
  return Array.from(map.values());
}

const CHIPS_REGEX = /\[CHIPS:\s*([^\]]+)\]/i;

export function parseChipsFromText(text: string): {
  displayText: string;
  chips: string[];
} {
  const match = text.match(CHIPS_REGEX);
  if (!match) {
    return { displayText: text, chips: [] };
  }
  const chips = match[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 80);
  const displayText = text.replace(CHIPS_REGEX, "").trim();
  return { displayText, chips };
}

async function enrichAndEmitProducts(
  products: Product[],
  emit: SseEmitter,
  session: Session
): Promise<void> {
  if (products.length === 0) return;

  emit({ type: "status", message: "Loading product images..." });

  const toEnrich = products.slice(0, ENRICH_TOP_N);
  const rest = products.slice(ENRICH_TOP_N);
  const CONCURRENCY = 4;

  const enriched: Product[] = [];
  for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
    const batch = toEnrich.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (p) => {
        try {
          const full = await getProduct(p.id);
          return mergeProductRecord(p, full);
        } catch {
          return p;
        }
      })
    );
    enriched.push(...batchResults);
  }

  const items = dedupeProductsById([...enriched, ...rest]);
  patchSessionContext(session, {
    lastProducts: items.map((p) => p.id).slice(0, 12),
  });
  emit({
    type: "products",
    items,
  });
  emit({
    type: "status",
    message: `Found ${items.length} product${items.length === 1 ? "" : "s"}`,
  });
}

function updateContextFromTool(
  session: Session,
  toolName: string,
  args: Record<string, unknown>,
  result: unknown
): void {
  if (toolName === "kapruka_search_products" && typeof args.q === "string") {
    patchSessionContext(session, { lastSearchQuery: args.q });
  }

  if (
    toolName === "kapruka_list_delivery_cities" ||
    toolName === "kapruka_search_cities"
  ) {
    const cities = (result as { cities?: { name: string; city_code: string }[] })
      ?.cities;
    if (!cities && Array.isArray(result) && result[0]) {
      const c = result[0] as { name: string; city_code: string };
      patchSessionContext(session, {
        deliveryCity: c.name,
        deliveryCityCode: c.city_code,
      });
    } else if (cities?.[0]) {
      patchSessionContext(session, {
        deliveryCity: cities[0].name,
        deliveryCityCode: cities[0].city_code,
      });
    }
    const query = String(args.query ?? args.q ?? "");
    if (query) patchSessionContext(session, { deliveryCity: query });
  }

  if (
    toolName === "kapruka_check_delivery" ||
    toolName === "kapruka_quote_delivery"
  ) {
    patchSessionContext(session, {
      deliveryCity: String(args.city ?? args.city_code ?? ""),
      pendingDeliveryDate: String(args.delivery_date ?? ""),
    });
  }

  if (toolName === "kapruka_create_order") {
    const r = args.recipient as { name?: string; phone?: string } | undefined;
    const d = args.delivery as { address?: string; date?: string; city?: string } | undefined;
    patchSessionContext(session, {
      recipientName: r?.name ?? (args.recipient_name as string),
      recipientPhone: r?.phone ?? (args.recipient_phone as string),
      recipientAddress:
        d?.address ?? (args.delivery_address as string),
      deliveryCity: d?.city ?? (args.city_code as string),
      pendingDeliveryDate: d?.date ?? (args.delivery_date as string),
    });
  }
}

async function emitStructuredSideEffects(
  toolName: string,
  result: unknown,
  emit: SseEmitter,
  session: Session,
  args: Record<string, unknown>
): Promise<void> {
  updateContextFromTool(session, toolName, args, result);

  if (toolName === "kapruka_search_products") {
    let products: Product[] = [];
    if (typeof result === "string") {
      products = parseKaprukaSearchMarkdown(result);
    } else {
      const raw = (result as { products?: Product[] })?.products ?? [];
      products = raw.filter((p) => p && isValidProduct(p));
    }
    if (products.length > 0) {
      await enrichAndEmitProducts(products, emit, session);
    }
    return;
  }

  if (toolName === "kapruka_get_product") {
    const product = result as Product;
    if (product?.id && product?.name && product.name !== "undefined") {
      emit({ type: "products", items: [product] });
    }
    return;
  }

  if (
    toolName === "kapruka_check_delivery" ||
    toolName === "kapruka_quote_delivery"
  ) {
    const q = result as {
      deliverable: boolean;
      delivery_cost_lkr: number;
      estimated_arrival: string;
      is_perishable: boolean;
      perishable_warning?: string;
    };
    const quote: DeliveryQuote = {
      deliverable: q.deliverable,
      city: String(args.city ?? ""),
      city_code: String(args.city_code ?? ""),
      delivery_date: String(args.delivery_date ?? ""),
      delivery_cost_lkr: q.delivery_cost_lkr,
      estimated_arrival: q.estimated_arrival,
      is_perishable: q.is_perishable,
      perishable_warning: q.perishable_warning,
    };
    emit({ type: "delivery_quote", quote });

    if (q.is_perishable && q.perishable_warning) {
      const budget = session.cart[0]?.product.price_lkr;
      const alternatives = await fetchPerishableAlternatives(
        "gift",
        budget
      );
      emit({
        type: "perishable_warning",
        message: q.perishable_warning,
        alternatives,
      });
    }
    return;
  }

  if (toolName === "kapruka_create_order") {
    const order = result as { order_id: string; pay_url: string };
    if (order?.pay_url && order?.order_id) {
      emit({
        type: "order_created",
        pay_url: order.pay_url,
        order_id: order.order_id,
        expires_in: 3600,
      });
    }
  }
}

/** Parse ```json {"kapruka_products":[...]} ``` blocks from model text */
export function extractProductsFromText(text: string): Product[] {
  const products: Product[] = [];
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as {
        kapruwa_products?: Product[];
        kapruka_products?: Product[];
        products?: Product[];
      };
      const list =
        parsed.kapruka_products ??
        parsed.kapruwa_products ??
        parsed.products ??
        [];
      if (Array.isArray(list)) {
        products.push(...list);
      }
    } catch {
      // ignore invalid JSON blocks
    }
  }

  return products;
}

/** Remove fenced JSON product blocks from assistant text shown in the UI */
export function stripJsonFromDisplay(text: string): string {
  return text
    .replace(/```(?:json)?\s*\{[\s\S]*?\}```/gi, "")
    .replace(/<function[^>]*>[\s\S]*?(<\/function>|$)/gi, "")
    .replace(/^\s*\{[\s\S]*"error"[\s\S]*\}\s*$/gim, "")
    .replace(CHIPS_REGEX, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface GroqErrorBody {
  error?: {
    message?: string;
    code?: string;
    failed_generation?: string;
  };
}

function extractFailedGenerationText(failed: string): string {
  return failed
    .replace(/<function[^>]*>[\s\S]*?(<\/function>|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isToolUseFailed(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const raw = err.message;
  return (
    raw.includes("tool_use_failed") ||
    raw.includes("invalid_request_error")
  );
}

/** Turn Groq SDK / API errors into safe user-facing copy (never raw JSON). */
export function toUserFriendlyGroqError(err: unknown): {
  message: string;
  partialReply?: string;
} {
  const fallback =
    "Hmm, I hit a snag on that one. Could you try again or rephrase what you're looking for?";

  if (!(err instanceof Error)) {
    return { message: fallback };
  }

  const raw = err.message;
  if (!raw.startsWith("{") && raw.length < 180 && !raw.includes('"error"')) {
    return { message: raw };
  }

  let body: GroqErrorBody | null = null;
  try {
    body = JSON.parse(raw) as GroqErrorBody;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        body = JSON.parse(match[0]) as GroqErrorBody;
      } catch {
        body = null;
      }
    }
  }

  const apiErr = body?.error;
  if (apiErr?.failed_generation) {
    const partial = extractFailedGenerationText(apiErr.failed_generation);
    if (partial.length > 15) {
      return {
        message: fallback,
        partialReply: partial,
      };
    }
  }

  if (isToolUseFailed(err)) {
    return {
      message:
        "Let me try another way to search Kapruka for you — one moment.",
    };
  }

  return { message: fallback };
}

function emitProductChips(
  session: Session,
  emit: SseEmitter,
  customChips?: string[]
): void {
  const cartCount = session.cart.reduce((s, c) => s + c.quantity, 0);
  const chips = customChips?.length ? customChips : buildCartChips(cartCount);
  emit({ type: "chips", items: chips });
}

function emitGiftSuggestion(
  plan: ConciergePlan,
  emit: SseEmitter,
  productId?: string
): void {
  if (!plan.giftMessageEn || !productId) return;
  emit({
    type: "gift_message_suggestion",
    productId,
    messageEn: plan.giftMessageEn,
    messageSi: plan.giftMessageSi ?? undefined,
  });
}

function cartTotals(session: Session): { count: number; total: number } {
  const count = session.cart.reduce((s, c) => s + c.quantity, 0);
  const total = session.cart.reduce(
    (s, c) => s + c.product.price_lkr * c.quantity,
    0
  );
  return { count, total };
}

/** Concierge path for narrative / emotional messages */
async function tryConciergePath(
  session: Session,
  userMessage: string,
  intent: Intent,
  emit: SseEmitter
): Promise<string | null> {
  if (!intent.isNarrative) return null;

  try {
    emit({ type: "status", message: "Reading your story..." });
    const plan = await planConciergeTurn(session, userMessage);

    if (plan.skipSearch) {
      const reply =
        plan.replyOpener ??
        "What kind of gift — flowers, cake, hamper? And a rough budget in LKR?";
      emitProductChips(session, emit, plan.chips);
      return reply;
    }

    const searchIntent = planToSearchIntent(
      plan,
      userMessage,
      intent.extractedKeywords
    );
    emit({ type: "status", message: "Searching Kapruka..." });
    const products = await runIntentSearch(searchIntent);
    patchSessionContext(session, { lastSearchQuery: searchIntent.query });

    if (products.length > 0) {
      await enrichAndEmitProducts(products, emit, session);
      emitGiftSuggestion(plan, emit, products[0]?.id);
    }

    const { count, total } = cartTotals(session);
    const reply = buildConciergeReply(plan, products.length, count, total);
    emitProductChips(session, emit, plan.chips);
    return reply;
  } catch {
    return null;
  }
}

/** Direct Kapruka search when intent classifier allows fast-path */
async function tryFastPathSearch(
  session: Session,
  intent: Intent,
  emit: SseEmitter
): Promise<string | null> {
  if (!shouldFastPathSearch(intent) || !intent.searchIntent) return null;

  try {
    emit({ type: "status", message: "Searching Kapruka..." });
    const products = await runIntentSearch(intent.searchIntent);
    patchSessionContext(session, {
      lastSearchQuery: intent.searchIntent.query,
    });
    if (products.length > 0) {
      await enrichAndEmitProducts(products, emit, session);
    }
    emitProductChips(session, emit);
    return buildIntentReply(intent.searchIntent, products.length);
  } catch {
    return null;
  }
}

/** Quote delivery for cart when user asks about delivery */
async function tryDeliveryQuote(
  session: Session,
  userMessage: string,
  intent: Intent,
  emit: SseEmitter
): Promise<string | null> {
  if (intent.type !== "delivery_query") return null;

  const city = intent.extractedCity ?? session.context?.deliveryCity;
  const date =
    parseDeliveryDate(userMessage) ?? session.context?.pendingDeliveryDate;
  const lead = selectLeadProductForQuote(session.cart);

  if (!city) {
    return "Which city should I check delivery for?";
  }
  if (!date) {
    return "When do you need it — today, tomorrow, or a specific date?";
  }
  if (!lead) {
    return "Add something to your cart first, then I can check delivery.";
  }

  try {
    emit({ type: "status", message: "Checking delivery..." });
    const q = await quoteCartDelivery(city, date, lead.id);
    patchSessionContext(session, {
      deliveryCity: q.city,
      deliveryCityCode: q.city_code,
      pendingDeliveryDate: date,
    });
    emit({ type: "delivery_quote", quote: q });
    if (!q.deliverable && q.is_perishable) {
      const alternatives = await fetchPerishableAlternatives(
        lead.category,
        lead.price_lkr
      );
      emit({
        type: "perishable_warning",
        message:
          q.perishable_warning ??
          "That date may not work for this perishable item.",
        alternatives,
      });
    }
    const cost = q.delivery_cost_lkr;
    return q.deliverable
      ? `Delivery to ${q.city} on ${date} is Rs ${cost.toLocaleString("en-LK")} — estimated ${q.estimated_arrival}.`
      : `Hmm, delivery to ${q.city} on ${date} isn't available for this item. Want to try another date?`;
  } catch {
    return "Couldn't check delivery right now — try the checkout wizard.";
  }
}

/** MCP search fallback without Groq */
async function directMcpSearchFallback(
  session: Session,
  intent: Intent,
  emit: SseEmitter
): Promise<string | null> {
  const si = intent.searchIntent;
  if (!si || si.labels.length === 0) return null;

  try {
    emit({ type: "status", message: "Searching Kapruka..." });
    const products = await runIntentSearch(si);
    if (products.length > 0) {
      await enrichAndEmitProducts(products, emit, session);
    }
    emitProductChips(session, emit);
    return buildIntentReply(si, products.length);
  } catch {
    return null;
  }
}

/** Coerce tool args from small models (string numbers, bad price ranges). */
function normalizeToolArgs(
  toolName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...args };

  for (const key of ["min_price", "max_price", "limit"]) {
    if (out[key] !== undefined && out[key] !== null) {
      const n = Number(out[key]);
      if (!Number.isNaN(n)) out[key] = n;
      else delete out[key];
    }
  }

  if (toolName === "kapruka_get_product") {
    if (!out.product_id && out.id) out.product_id = out.id;
  }

  if (
    toolName === "kapruka_list_delivery_cities" ||
    toolName === "kapruka_search_cities"
  ) {
    if (!out.query && out.q) out.query = out.q;
  }

  if (
    toolName === "kapruka_check_delivery" ||
    toolName === "kapruka_quote_delivery"
  ) {
    if (!out.product_id && out.product_code)
      out.product_id = out.product_code;
    if (!out.city && out.city_code) out.city = out.city_code;
  }

  if (toolName === "kapruka_search_products") {
    const min = out.min_price as number | undefined;
    const max = out.max_price as number | undefined;
    if (
      min !== undefined &&
      max !== undefined &&
      min === max &&
      min > 0
    ) {
      out.min_price = Math.round(min * 0.7);
      out.max_price = Math.round(min * 1.15);
    } else if (
      min !== undefined &&
      max !== undefined &&
      min > max
    ) {
      out.min_price = max;
      out.max_price = min;
    }
    if (typeof out.q === "string") {
      out.q = out.q.slice(0, 120);
    }
  }

  return out;
}

async function runGroqToolLoop(
  session: Session,
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  emit: SseEmitter,
  model: string
): Promise<{
  finalText: string;
  toolUseFailed: boolean;
}> {
  const groq = getGroq();
  let iterations = 0;
  let finalText = "";
  let toolUseFailed = false;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    emit({ type: "status", message: iterations === 1 ? "Thinking..." : "Working..." });

    let completion: Awaited<
      ReturnType<typeof groq.chat.completions.create>
    >;
    try {
      completion = await groq.chat.completions.create({
        model,
        messages,
        tools: [...KAPRUKA_GROQ_TOOLS],
        tool_choice: "auto",
        temperature: 0.5,
      });
    } catch (err) {
      if (isToolUseFailed(err)) {
        toolUseFailed = true;
        break;
      }
      throw err;
    }

    const choice = completion.choices[0]?.message;
    if (!choice) {
      throw new Error("Empty response from Groq");
    }

    messages.push(choice);

    const toolCalls = choice.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      finalText = choice.content ?? "";
      break;
    }

    for (const tc of toolCalls) {
      if (tc.type !== "function") continue;

      const fnName = tc.function.name;
      let fnArgs: Record<string, unknown> = {};
      try {
        fnArgs = JSON.parse(tc.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        fnArgs = {};
      }

      try {
        const normalizedArgs = normalizeToolArgs(fnName, fnArgs);
        if (fnName === "kapruka_search_products") {
          emit({ type: "status", message: "Searching Kapruka..." });
        }
        const toolResult = await executeMcpToolCall(fnName, normalizedArgs);
        await emitStructuredSideEffects(
          fnName,
          toolResult,
          emit,
          session,
          normalizedArgs
        );

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Tool execution failed";
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: message }),
        });
        emit({
          type: "error",
          message: toUserFriendlyGroqError(new Error(message)).message,
        });
      }
    }
  }

  return { finalText, toolUseFailed };
}

/**
 * Groq tool-calling loop with intent routing, dual models, status/chips SSE.
 */
export async function runKapruwaChat(
  session: Session,
  userMessage: string,
  emit: SseEmitter
): Promise<{ reply: string; sessionId: string }> {
  if (!session.context) session.context = {};

  const intent = classifyIntent(session, userMessage);

  // On Vercel Hobby, long multi-tool checkout flows can exceed maxDuration.
  // Prefer the in-app checkout wizard unless the user explicitly asked to do it in chat.
  if (
    IS_SERVERLESS &&
    intent.type === "checkout" &&
    !/via chat|in chat|here in chat/i.test(userMessage)
  ) {
    const msg =
      "Opening the checkout wizard for a faster, more reliable payment link.";
    emit({ type: "open_checkout_wizard" });
    emit({ type: "text", content: msg });
    if (session.cart.length > 0) {
      emit({ type: "cart_update", cart: session.cart });
    }
    emit({ type: "session_context", context: session.context });
    return { reply: msg, sessionId: session.id };
  }

  if (intent.extractedCity) {
    patchSessionContext(session, { deliveryCity: intent.extractedCity });
  }

  const deliveryDate = parseDeliveryDate(userMessage);
  if (deliveryDate) {
    patchSessionContext(session, { pendingDeliveryDate: deliveryDate });
  }

  const deliveryReply = await tryDeliveryQuote(
    session,
    userMessage,
    intent,
    emit
  );
  if (deliveryReply) {
    emit({ type: "text", content: deliveryReply });
    emitProductChips(session, emit);
    if (session.cart.length > 0) {
      emit({ type: "cart_update", cart: session.cart });
    }
    emit({ type: "session_context", context: session.context });
    return { reply: deliveryReply, sessionId: session.id };
  }

  const conciergeReply = await tryConciergePath(
    session,
    userMessage,
    intent,
    emit
  );
  if (conciergeReply) {
    emit({ type: "text", content: conciergeReply });
    if (session.cart.length > 0) {
      emit({ type: "cart_update", cart: session.cart });
    }
    emit({ type: "session_context", context: session.context });
    return { reply: conciergeReply, sessionId: session.id };
  }

  const fastReply = await tryFastPathSearch(session, intent, emit);
  if (fastReply) {
    emit({ type: "text", content: fastReply });
    if (session.cart.length > 0) {
      emit({ type: "cart_update", cart: session.cart });
    }
    emit({ type: "session_context", context: session.context });
    return { reply: fastReply, sessionId: session.id };
  }

  const contextualMessage = buildUserContext(session, userMessage);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: KAPRUKA_SYSTEM_PROMPT },
    ...sessionToGroqMessages(session),
    { role: "user", content: contextualMessage },
  ];

  const model = selectModel(intent);
  let finalText = "";
  let textEmitted = false;

  try {
    let loop = await runGroqToolLoop(
      session,
      messages,
      emit,
      model
    );
    finalText = loop.finalText;

    if (
      ALLOW_STRONG_MODEL_RETRY &&
      loop.toolUseFailed &&
      model === MODEL_FAST &&
      model !== MODEL_STRONG
    ) {
      emit({ type: "status", message: "Trying a more capable model..." });
      loop = await runGroqToolLoop(
        session,
        messages,
        emit,
        MODEL_STRONG
      );
      finalText = loop.finalText || finalText;
      if (loop.toolUseFailed) {
        const recovered = await directMcpSearchFallback(
          session,
          intent,
          emit
        );
        if (recovered) {
          finalText = recovered;
          emit({ type: "text", content: recovered });
          textEmitted = true;
        }
      }
    } else if (loop.toolUseFailed) {
      const recovered = await directMcpSearchFallback(session, intent, emit);
      if (recovered) {
        finalText = recovered;
        emit({ type: "text", content: recovered });
        textEmitted = true;
      }
    }
  } catch (err) {
    const recovered =
      (await tryFastPathSearch(session, intent, emit)) ??
      (await directMcpSearchFallback(session, intent, emit));

    if (recovered) {
      finalText = recovered;
      emit({ type: "text", content: recovered });
      textEmitted = true;
    } else {
      const { message, partialReply } = toUserFriendlyGroqError(err);
      if (partialReply) {
        finalText = partialReply;
        const { displayText, chips } = parseChipsFromText(
          stripJsonFromDisplay(partialReply)
        );
        if (displayText) {
          emit({ type: "text", content: displayText });
          textEmitted = true;
        }
        if (chips.length) emit({ type: "chips", items: chips });
      } else {
        finalText = message;
        emit({ type: "text", content: message });
        textEmitted = true;
      }
    }
  }

  if (finalText && !textEmitted) {
    const { displayText, chips } = parseChipsFromText(
      stripJsonFromDisplay(finalText)
    );
    if (displayText) {
      emit({ type: "text", content: displayText });
    }
    if (chips.length) emit({ type: "chips", items: chips });

    const embedded = extractProductsFromText(finalText);
    if (embedded.length > 0) {
      await enrichAndEmitProducts(embedded, emit, session);
    }
  } else if (finalText) {
    const { chips } = parseChipsFromText(finalText);
    if (chips.length) emit({ type: "chips", items: chips });

    const embedded = extractProductsFromText(finalText);
    if (embedded.length > 0) {
      await enrichAndEmitProducts(embedded, emit, session);
    }
  }

  if (session.cart.length > 0) {
    emit({ type: "cart_update", cart: session.cart });
  }

  emit({ type: "session_context", context: session.context });

  const reply = stripJsonFromDisplay(finalText);
  return { reply, sessionId: session.id };
}

export async function checkGroqHealth(): Promise<boolean> {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && !key.includes("your_groq_api_key"));
}
