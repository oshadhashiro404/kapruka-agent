/** Vercel Hobby / serverless tuning */
export const IS_SERVERLESS = Boolean(process.env.VERCEL);

export const MAX_TOOL_ITERATIONS = IS_SERVERLESS ? 3 : 6;
export const MAX_HISTORY_MESSAGES = 20;
/** How many search hits to fetch full details (images) for — each is one MCP call */
export const ENRICH_TOP_N = IS_SERVERLESS ? 6 : 10;
export const ALLOW_STRONG_MODEL_RETRY = !IS_SERVERLESS;
