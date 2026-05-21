# Market Plain — Stack Research

Tracks every technology decision made throughout the build. Update this as choices are made or changed.

→ Open questions live in [research.md](research.md)

---

## Current Stack

| Layer | Choice | Status |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Locked |
| Language | TypeScript | Locked |
| Styling | Tailwind CSS | Locked |
| Charts | Recharts | Locked |
| Market Data | yahoo-finance2 | In use — unofficial, needs fallback (Step 18) |
| AI | Claude API (Anthropic) | In use |
| Payments | — | Not started (Step 17) |
| Auth | — | Not started (Step 1, 7, 17) |
| Rate Limiting | rate-limiter-flexible (in-memory) | In use — needs Redis in prod (Step 8) |
| Caching | In-memory Map (per-process) | Planned (Step 21) |
| Hosting | — | Not deployed (Step 31) |
| Domain | — | Not purchased (Step 31) |
| CI | — | Not set up (Step 30) |

---

## Decisions Log

*Record each decision here when made, with the reason.*

### Payments
- **Pending** — Stripe Checkout vs Stripe Payment Links. Checkout gives more control; Payment Links are faster to ship. → [research.md](research.md)

### Auth
- **Pending** — NextAuth.js vs Clerk vs custom JWT. Clerk is fastest for a solo project; NextAuth is more flexible with Stripe. Must decide before Step 17. → [research.md](research.md)

### Caching (server-side)
- **Pending** — Manual `Map` cache (Step 21) vs React Query / SWR vs Next.js route-level caching. Evaluate whether Next.js 16 built-in cache makes Step 21 redundant. → [research.md](research.md)

### Data Fetching (client)
- **Pending** — Raw `setInterval` vs `useVisibilityRefresh` (Step 22) vs React Query/SWR. React Query would replace Steps 4, 5, and 22 simultaneously. → [research.md](research.md)

### Redis
- **Pending** — Upstash (serverless, works on Vercel free tier) vs self-hosted. Needed for production rate limiting (Step 8) and optional server cache (Step 21). → [research.md](research.md)

### Hosting
- **Pending** — Vercel (most likely). Check free tier serverless invocation limits before committing. → [research.md](research.md)

### Domain
- **Pending** — `marketplain.app`, `marketplain.io`, or `getmarketplain.com`. Check availability before Step 31. → [research.md](research.md)

---

## Packages

| Package | Purpose | Added | Notes |
| --- | --- | --- | --- |
| next | Framework | Initial | v16 |
| react / react-dom | UI | Initial | |
| typescript | Types | Initial | |
| tailwindcss | Styling | Initial | |
| recharts | Charts | ba4386b | |
| yahoo-finance2 | Market data | ba4386b | Unofficial — add fallback |
| @anthropic-ai/sdk | Claude API | ba4386b | |
| rate-limiter-flexible | Rate limiting | ba4386b | In-memory only |
| stripe | Payments | — | Step 17 |
| @stripe/stripe-js | Stripe client | — | Step 17 |
