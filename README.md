# Kapruka — Next.js (UI + API)

Single Next.js app: full-screen chat UI with optional ElevenLabs voice, plus `/api/*` routes (Groq + Kapruka MCP). Deploy to **Vercel** with root directory `frontend`.

## Local development

```bash
pnpm install
cp .env.example .env.local
# Add GROQ_API_KEY and ElevenLabs keys to .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). API routes are same-origin (`/api/chat`, `/api/health`, etc.).

**Chat history:** Each browser gets a stable `kapruka-user-id`; sessions are saved under that id in localStorage and synced to `frontend/.data/chat-history/` via `/api/users/chat-history` (for local dev; use a durable store on serverless production).

Do **not** set `NEXT_PUBLIC_BACKEND_URL` unless you still run the legacy Express server on port 3001.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |
| `pnpm test` | Run Vitest test suite |
| `pnpm test:watch` | Vitest in watch mode |

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `GROQ_API_KEY` | Yes | Groq API key for chat |
| `GROQ_MODEL_FAST` | No | Fast model override |
| `GROQ_MODEL_STRONG` | No | Strong model override |
| `MCP_ENDPOINT` | No | Kapruka MCP endpoint |
| `ELEVENLABS_API_KEY` | For voice | ElevenLabs API key (server-only) |
| `ELEVENLABS_VOICE_ID` | For voice | Voice ID for spoken assistant replies |
| `ELEVENLABS_MODEL_ID` | No | TTS model (default `eleven_multilingual_v2`) |
| `NEXT_PUBLIC_BACKEND_URL` | No | Only for legacy Express backend |

## Voice

- **Mic button** — tap to start listening, tap again to stop and send (uses browser speech recognition in Chrome/Edge/Safari; no ElevenLabs key needed for input)
- **Speaker toggle** — when on, assistant replies are spoken aloud (ElevenLabs TTS when configured; falls back to browser speech if ElevenLabs is unavailable)
- Text input always works alongside voice
- Mic requires HTTPS or `localhost` and browser microphone permission
- If ElevenLabs returns a 401 (e.g. free tier disabled), voice input still works via the browser; only spoken replies may use the browser voice instead

## Deploy to Vercel (Hobby)

1. Import repo; set **Root Directory** to `frontend`.
2. Environment variables:
   - `GROQ_API_KEY` (required)
   - `GROQ_MODEL_FAST`, `GROQ_MODEL_STRONG` (optional)
   - `MCP_ENDPOINT` (optional)
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (for voice)
3. Deploy.

**Hobby limits:** `/api/chat` has `maxDuration: 10` seconds. Browse/search uses a fast-path without Groq when possible. Complex checkout flows may timeout on free tier — use the in-app **Checkout wizard** (`/api/order/create`) for reliable pay links without the full Groq tool loop.

## Architecture highlights

- **Chat hooks:** `useBackendHealth`, `useCategories`, `useChatSession`, `useChatStreaming`
- **Validation:** Zod schemas in `lib/schemas.ts` and `lib/checkout/checkout-schema.ts`
- **Errors:** Centralized in `lib/errors.ts`
- **UI primitives:** `ProductImage`, `LoadingState`, `AccessibleDialog`
- **Tests:** Vitest + Testing Library in `tests/`

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
| POST | `/api/voice/stt` |
| POST | `/api/voice/tts` |

## Legacy Express backend

The `backend/` folder is deprecated. Use this Next.js app instead.
