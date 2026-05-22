# Market Plain — API Research

Tracks every external API and internal route used or evaluated throughout the build.

→ Open questions live in [research.md](research.md)

---

## Internal API Routes

| Route | Method | Purpose | Status | Notes |
| --- | --- | --- | --- | --- |
| `/api/quote` | GET | Single ticker quote | Live | Retry on failure |
| `/api/history` | GET | Price history for chart | Live | 1d blank-after-midnight fix shipped |
| `/api/search` | GET | Ticker autocomplete | Live | |
| `/api/movers` | GET | Top gainers/losers | Live | 30-min server-side TTL cache |
| `/api/news` | GET | Ticker news feed | Live | |
| `/api/earnings` | GET | Last 4 quarters EPS + revenue | Live | Uses `quoteSummary`; includes reported date, beat/miss, surprise % |
| `/api/explain` | GET | AI ticker explanation | Live | HMAC auth + Pro token required |
| `/api/summarize` | POST | AI news summary | Live | HMAC auth + Pro token required |
| `/api/earnings-explain` | POST | AI earnings analysis | Live | HMAC auth + Pro token required |
| `/api/portfolio-summary` | POST | AI portfolio analysis | Live | HMAC auth + Pro token required |
| `/api/checkout` | POST | Stripe checkout session | Planned | Step 17 |
| `/api/webhook` | POST | Stripe webhook handler | Planned | Step 17 |

---

## External APIs

### yahoo-finance2 (current data source)
- **Status:** In use — unofficial npm wrapper around Yahoo Finance
- **Used for:** quotes, price history, search, news, sector ETF data
- **Rate limits:** Unknown — needs audit before production (→ [research.md](research.md))
- **Risk:** Unofficial; can break without warning. Fallback abstraction planned in Step 18.
- **`marketState` field for crypto:** Reliability unconfirmed — needed for Step 20 delay notice (→ [research.md](research.md))

### Anthropic Claude API
- **Status:** In use
- **Used for:** `/api/explain`, `/api/summarize`, `/api/earnings-explain`, `/api/portfolio-summary`
- **Model:** `claude-haiku-4-5-20251001`
- **Auth:** `ANTHROPIC_API_KEY` in `.env.local`
- **Gating:** HMAC-SHA256 signed token (`NEXT_PUBLIC_MARKET_PLAIN_API_SECRET`) + `PRO_BYPASS_TOKENS` server-side check on all AI routes

### Stripe
- **Status:** Not integrated
- **Needed for:** Step 17 — real Pro payments
- **Decisions pending:** Checkout vs Payment Links, pricing model (→ [research.md](research.md))
- **Env vars needed:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Candidate Fallback Data Sources
*Evaluated for Step 18 — pick one as a backup when yahoo-finance2 fails*

| Provider | Free Tier | Crypto | Real-time | Notes |
| --- | --- | --- | --- | --- |
| Alpha Vantage | 25 req/day | Yes | 15-min delay | Very limited free tier |
| Polygon.io | 5 req/min | Yes | Delayed on free | Good docs, reliable |
| Financial Modeling Prep | 250 req/day | Partial | Delayed | Easy REST API |
| Finnhub | 60 req/min | Yes | Real-time | Websocket support |

- **Pending decision:** Which provider to use as fallback → [research.md](research.md)

---

## Browser APIs

| API | Used for | Step | Safari Support |
| --- | --- | --- | --- |
| `localStorage` | Portfolio, watchlist, history, Pro flag | Current | Yes |
| `Notification` | Price alerts | Step 14 | Partial — needs fallback (→ [research.md](research.md)) |
| `Web Crypto` (`SubtleCrypto`) | HMAC token signing | Step 6 | Yes (modern Safari) |
| `document.visibilityState` | Pause intervals when tab hidden | Step 22 | Yes |

---

## Environment Variables

| Variable | Used in | Required | Notes |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | AI routes | Yes | |
| `NEXT_PUBLIC_MARKET_PLAIN_API_SECRET` | HMAC token signing (client + server) | Yes | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PRO_BYPASS_TOKENS` | AI route Pro gate | Yes | Comma-separated tokens until Stripe is live |
| `REDIS_URL` | Rate limiter | Prod only | In-memory fallback used if not set |
| `STRIPE_SECRET_KEY` | `/api/checkout`, `/api/webhook` | Planned | Step 17 |
| `STRIPE_WEBHOOK_SECRET` | `/api/webhook` | Planned | Step 17 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Planned | Step 17 |
