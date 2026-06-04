# Kapruka — Next.js (UI + API)

Single Next.js app: chat UI and `/api/*` routes (Groq + Kapruka MCP). Deploy to **Vercel** with root directory `frontend`.

## Local development

```bash
pnpm install
cp .env.example .env.local
# Add GROQ_API_KEY to .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). API routes are same-origin (`/api/chat`, `/api/health`, etc.).

Do **not** set `NEXT_PUBLIC_BACKEND_URL` unless you still run the legacy Express server on port 3001.

## Deploy to Vercel (Hobby)

1. Import repo; set **Root Directory** to `frontend`.
2. Environment variables:
   - `GROQ_API_KEY` (required)
   - `GROQ_MODEL_FAST`, `GROQ_MODEL_STRONG` (optional)
   - `MCP_ENDPOINT` (optional)
3. Deploy.

**Hobby limits:** `/api/chat` has `maxDuration: 10` seconds. Browse/search uses a fast-path without Groq when possible. Complex checkout flows may timeout on free tier.

## API routes

| Method | Path |
|--------|------|
| GET | `/api/health` |
| POST | `/api/chat` (SSE) |
| POST | `/api/search` |
| POST | `/api/categories` |
| POST | `/api/delivery/quote` |
| POST | `/api/order/track` |

## Legacy Express backend

The `backend/` folder is deprecated. Use this Next.js app instead.
