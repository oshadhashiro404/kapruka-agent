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

**Chat history:** Each browser gets a stable `kapruka-user-id`; sessions are saved under that id in localStorage and synced to `frontend/.data/chat-history/` via `/api/users/chat-history` (for local dev; use a durable store on serverless production).

Do **not** set `NEXT_PUBLIC_BACKEND_URL` unless you still run the legacy Express server on port 3001.

## Deploy to Vercel (Hobby)

1. Import repo; set **Root Directory** to `frontend`.
2. Environment variables:
   - `GROQ_API_KEY` (required)
   - `GROQ_MODEL_FAST`, `GROQ_MODEL_STRONG` (optional)
   - `MCP_ENDPOINT` (optional)
3. Deploy.

**Hobby limits:** `/api/chat` has `maxDuration: 10` seconds. Browse/search uses a fast-path without Groq when possible. Complex checkout flows may timeout on free tier — use the in-app **Checkout wizard** (`/api/order/create`) for reliable pay links without the full Groq tool loop.

## API routes

| Method | Path |
|--------|------|
| GET | `/api/health` |
| POST | `/api/chat` (SSE) |
| POST | `/api/search` |
| POST | `/api/categories` |
| POST | `/api/delivery/quote` |
| POST | `/api/delivery/cities` |
| POST | `/api/order/create` |
| POST | `/api/order/track` |
| GET/POST | `/api/users/chat-history` |

## Legacy Express backend

The `backend/` folder is deprecated. Use this Next.js app instead.
