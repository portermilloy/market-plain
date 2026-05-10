# Market Plain — Progress & Feature Log

## Implemented

### AI Features
- [x] `/api/explain` — explains a stock's daily move in 2-3 sentences (Claude Haiku, Pro-gated, rate limited, prompt cached)
- [x] `/api/summarize` — summarizes news headlines for a ticker in 3-4 sentences (Claude Haiku, Pro-gated, rate limited, prompt cached)
- [x] `/api/portfolio-summary` — narrates what's happening across the whole portfolio today (Claude Haiku, Pro-gated, rate limited, prompt cached)
- [x] Explain button in Watchlist expanded view (lock icon for free users)
- [x] Explain button in StockSearch (lock icon for free users)
- [x] Summarize button in NewsSection (lock icon for free users)
- [x] "What's happening with my portfolio today?" button in Portfolio summary card (lock icon for free users)
- [x] Prompt caching (`cache_control: ephemeral`) on system prompts for all three AI routes
- [x] `max_tokens` caps: 300 (explain), 400 (summarize), 400 (portfolio-summary)

### Rate Limiting & Security
- [x] AI routes: 20 requests/IP/hour via `rate-limiter-flexible` (RateLimiterMemory)
- [x] Data routes (/api/quote, /api/news, /api/search): 200 requests/IP/hour
- [x] `x-app-client: market-plain` header guard on all AI routes (401 if missing)
- [x] Header sent from all three frontend callers (Watchlist, StockSearch, NewsSection)

### Portfolio
- [x] Holdings tracker: ticker + share count, current value, daily change
- [x] Total value summary card with donut allocation chart
- [x] 90-day portfolio value history chart (one snapshot per day)
- [x] Export to CSV button (appears when positions loaded)
- [x] Empty state message when no positions added
- [x] Share count validation: must be > 0 and ≤ 1,000,000
- [x] Auto-refresh quotes every 60 seconds (silent, no loading flash)
- [x] Retry button on failed quote loads

### Watchlist
- [x] Persistent watchlist with localStorage (defaults: AAPL, MSFT, NVDA, TSLA, VOO)
- [x] Real-time quotes with 7-day sparklines
- [x] Expandable rows: stats strip, range selector (1D/7D/30D/90D/1Y), full chart with volume
- [x] Pre-market / after-hours price + dollar change + % (amber color)
- [x] Free tier cap: 5 tickers max (error shown when exceeded)
- [x] Auto-refresh quotes every 60 seconds (silent)
- [x] Retry button on failed quote loads
- [x] Earnings badge ("EARNS") on ticker row when earnings are within 7 days

### StockSearch
- [x] Full-width search bar with autocomplete
- [x] Quote detail: price, daily change, pre/after-hours, stats, range chart
- [x] Chart color follows selected range performance (not just daily)
- [x] Loading skeleton while fetching
- [x] Auto-refresh quote every 30 seconds when ticker selected
- [x] Retry button on failed quote loads
- [x] Explain button (Pro-gated)

### Sector Heatmap
- [x] 11 S&P sector ETF tiles (XLK, XLF, XLV, XLY, XLI, XLE, XLP, XLU, XLRE, XLB, XLC)
- [x] Color intensity scales with % change (dark green → dark red, 5 levels)
- [x] Responsive grid: 4 cols mobile → 6 cols tablet → 11 cols desktop

### News
- [x] Top 10 headlines per ticker from Yahoo Finance
- [x] Clickable articles (open URL or populate ArticlePanel)
- [x] Summarize button (Pro-gated)
- [x] ArticlePanel side drawer for reading articles

### Top Movers
- [x] Already existed before this session (TopMovers component)

### Infrastructure
- [x] Rate limiter utility (`app/lib/rateLimit.ts`) with separate AI and data limiters
- [x] Mobile responsive layout (stacked on small screens)
- [x] `x-forwarded-for` IP extraction for rate limiting behind proxies
- [x] Upgrade banner for free users (dismissible, links to /upgrade)
- [x] `/upgrade` placeholder page listing Pro features

---

## Needs Work / Not Yet Implemented

### Blocked by external services
- [ ] **Stripe payments** — upgrade page exists but no checkout, no webhook, no payment flow. Needs Stripe account + server-side session + webhook handler.
- [ ] **Real authentication** — `isPro` is a localStorage flag, trivially bypassable via DevTools. Needs a real auth provider (Clerk, NextAuth, Supabase Auth, etc.)
- [ ] **Backend persistence** — watchlist and portfolio live in localStorage only. Clear your browser = lose everything. Needs a database (Postgres, Supabase, PlanetScale, etc.)
- [ ] **Per-user rate limiting** — currently IP-based. Shared IPs (offices, VPNs, schools) share a limit. Needs user identity in the database first.
- [ ] **Server-side Pro gating** — the AI routes don't actually check if the user is Pro; the `x-app-client` header is cosmetic. A real session/token check is needed before launch.

### Features to build
- [ ] **Compare two tickers** — side-by-side chart with a correlation score. Requires a new layout mode and second search context. Medium-to-large effort.
- [ ] **Earnings calendar** — weekly calendar showing upcoming earnings for your watchlist tickers. Data is available (earningsDate from quote), just needs a calendar UI widget.
- [ ] **Cost basis + gain/loss tracking** — removed from Portfolio in a previous session. Many users want to see unrealized P&L. Would need to re-add avg buy price to the form and calculate gain/loss vs. current price.
- [ ] **Quote auto-refresh when market is closed** — currently refreshes every 30–60s regardless. Should pause (or extend interval to 5 min) outside market hours to avoid wasted API calls.
- [ ] **Sector heatmap auto-refresh** — SectorHeatmap fetches once on mount and never updates. Should refresh on the same schedule as other quotes.

### Known issues / rough edges
- [ ] **isPro flash on page load** — `isPro` defaults to `true` in `page.tsx` to avoid flashing the upgrade banner, but it means Portfolio and Watchlist (which default to `false`) flash the lock icon for a frame before localStorage loads. Needs a unified client-side isPro context.
- [ ] **Watchlist explanation resets when ticker is toggled** — explanation state lives in the Watchlist component, not per-ticker, so collapsing and re-expanding a row clears the explanation.
- [ ] **In-memory rate limiter doesn't survive server restarts** — fine for development; needs Redis or a persistent store for production.
- [ ] **`unknown` IP fallback** — if neither `x-forwarded-for` nor `x-real-ip` is set, all requests share one "unknown" bucket. Fine locally; needs proper reverse proxy config in production.
- [ ] **No TypeScript strict mode** — several `as Record<string, unknown>` casts and loose Recharts formatter types. Would benefit from a stricter tsconfig and proper typing pass.
- [ ] **No error boundaries** — a runtime error inside any component will crash the full page in production. Should wrap each major section in a React ErrorBoundary.
