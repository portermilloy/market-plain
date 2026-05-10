# Market Plain — Project Overview

A full-stack financial dashboard built with Next.js 16, React 19, TypeScript, and Tailwind CSS. Displays real-time stock and crypto market data, portfolio tracking, and AI-powered plain-English explanations powered by Claude.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| UI | React 19.2.4 + Tailwind CSS v4 |
| Language | TypeScript 5 (strict mode) |
| Charts | Recharts 3.8.1 |
| Market Data | yahoo-finance2 3.14.0 |
| AI | @anthropic-ai/sdk 0.92.0 (Claude Haiku) |
| Rate Limiting | rate-limiter-flexible 11.1.0 |
| Fonts | Geist Sans + Geist Mono (next/font/google) |

---

## Project Structure

```
market-plain/
├── app/
│   ├── layout.tsx               # Root layout: header, nav, market status
│   ├── page.tsx                 # Main dashboard page
│   ├── globals.css              # Tailwind import + CSS variables (dark theme)
│   ├── crypto/
│   │   └── page.tsx             # Crypto dashboard page
│   ├── upgrade/
│   │   └── page.tsx             # Pro upgrade landing page
│   ├── api/
│   │   ├── quote/route.ts       # GET stock/crypto quote
│   │   ├── history/route.ts     # GET OHLCV price history
│   │   ├── search/route.ts      # GET ticker autocomplete
│   │   ├── news/route.ts        # GET top 10 headlines per ticker
│   │   ├── movers/route.ts      # GET top 5 gainers + losers
│   │   ├── explain/route.ts     # GET AI explanation of a daily move (Pro)
│   │   ├── summarize/route.ts   # POST AI summary of news headlines (Pro)
│   │   └── portfolio-summary/
│   │       └── route.ts         # POST AI summary of full portfolio (Pro)
│   ├── components/
│   │   ├── NavLinks.tsx         # Dashboard / Crypto nav tabs
│   │   ├── MarketStatus.tsx     # Live market open/closed indicator
│   │   ├── StockSearch.tsx      # Full-width search + quote + chart
│   │   ├── TickerAutocomplete.tsx # Debounced autocomplete input
│   │   ├── TopMovers.tsx        # Top 5 gainers and losers
│   │   ├── SectorHeatmap.tsx    # 11-sector ETF performance grid
│   │   ├── EarningsCalendar.tsx # Upcoming earnings for watchlist tickers
│   │   ├── Watchlist.tsx        # Persistent watchlist with expandable rows
│   │   ├── Portfolio.tsx        # Holdings tracker with charts + AI summary
│   │   ├── NewsSection.tsx      # Latest headlines per ticker + AI summary
│   │   └── ArticlePanel.tsx     # Slide-out article detail drawer
│   └── lib/
│       └── rateLimit.ts         # In-memory IP rate limiters (AI + data)
├── PROGRESS.md
├── CLAUDE.md → AGENTS.md
├── AGENTS.md                    # Agent instructions: read next docs before coding
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Pages

### `/` — Dashboard (`app/page.tsx`)
Client component. Manages three pieces of shared state across all sections:
- `selectedTicker` — which ticker's news to show (set by clicking a watchlist row)
- `selectedArticle` — which article to open in the ArticlePanel drawer
- `isPro` — read from localStorage on mount; defaults to `true` to avoid upgrade banner flash

Renders, top to bottom:
1. **Upgrade banner** — shown to free users, dismissible, links to `/upgrade`
2. **Page heading** — "Dashboard / The market, explained in plain English."
3. `<StockSearch />`
4. `<TopMovers />`
5. `<SectorHeatmap />`
6. `<EarningsCalendar />`
7. Three-column grid: `<Portfolio />` · `<Watchlist />` · `<NewsSection />` (NewsSection only renders when a ticker is selected)
8. `<ArticlePanel />` slide-out drawer (renders portal-style over the page)

### `/crypto` — Crypto Dashboard (`app/crypto/page.tsx`)
Client component tracking 10 major cryptocurrencies: BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, LINK, DOT.

Features:
- Coin list with live prices, 24h change, and 7-day sparkline
- Click to expand any coin into a full chart with volume bars
- Range selector: 1d / 7d / 30d / 90d / 180d / 1y
- 60-second auto-refresh (all coins simultaneously)
- 1D chart filters to market-hours candles (9:30 AM ET onward)
- Extended-hours candles rendered in amber
- Dynamic number formatting (handles prices from $0.0001 to $100k+)
- Chevron toggle indicator per row

### `/upgrade` — Pro Upgrade Page (`app/upgrade/page.tsx`)
Static page listing three Pro features:
- Unlimited watchlist
- AI stock explanations
- One-click news summaries

Shows a "Payments coming soon" notice (Stripe not yet integrated). Links back to dashboard.

---

## Layout (`app/layout.tsx`)

Wraps every page. Sets:
- `<html>` with Geist Sans + Geist Mono font variables, `h-full antialiased`
- `<body>` with dark background (`bg-zinc-950 text-zinc-100`), flex column, no horizontal overflow
- `<header>`: 14px tall, border-bottom, contains:
  - "Market Plain" wordmark (left)
  - `<NavLinks />` (center)
  - `<MarketStatus />` (right)
- `<main>`: flex-1, max-w-7xl, horizontal padding, 8 units vertical padding

Metadata: `title: "Market Plain"`, `description: "The stock market, explained in plain English."`

---

## Components

### `NavLinks`
Two links: **Dashboard** (`/`) and **Crypto** (`/crypto`). Uses `usePathname` to apply active styling (white text + bottom border) vs inactive (zinc-400).

### `MarketStatus`
Polls every 30 seconds. Computes current Eastern Time and determines one of four states:
- **Pre-Market** (4:00–9:29 AM ET) — amber dot
- **Market Open** (9:30 AM–4:00 PM ET, weekdays) — green pulsing dot
- **After Hours** (4:00–8:00 PM ET) — amber dot
- **Market Closed** (all other times) — zinc dot

### `StockSearch`
Full-width search bar at the top of the dashboard. Orchestrates:
- `<TickerAutocomplete />` for symbol selection
- Quote fetch on selection, then auto-refreshes every 30 seconds
- Loading skeleton while fetching
- Retry button on error
- Quote display: price, daily change $/, %, pre/after-hours price + change
- Stats row: P/E ratio, Market Cap, 52-week range, Dividend Yield, Earnings date
- Range selector: 1d / 7d / 30d / 90d / 1y — fetches from `/api/history`
- Recharts `AreaChart` — line color is green/red based on selected range performance (not just today)
- `<Explain />` AI button (Pro feature, lock icon for free users)

### `TickerAutocomplete`
Reusable controlled input. Behavior:
- 250ms debounce before calling `/api/search`
- Dropdown with up to 6 results (symbol, name, type badge)
- Keyboard navigation: ArrowUp/ArrowDown to move, Enter to select, Escape to close
- Click-outside ref detection closes dropdown
- "CRYPTO" badge shown for cryptocurrency results

### `TopMovers`
Fetches `/api/movers` on mount. Displays two horizontal scrolling rows:
- **Gainers** (top 5, sorted descending by % change, green)
- **Losers** (bottom 5, sorted ascending, red)

Each tile shows: symbol, company name, price, and % change.

### `SectorHeatmap`
Fetches a single quote for each of 11 sector ETFs on mount: XLK (Tech), XLF (Financials), XLV (Health Care), XLY (Consumer Disc.), XLI (Industrials), XLE (Energy), XLP (Consumer Staples), XLU (Utilities), XLRE (Real Estate), XLB (Materials), XLC (Communication).

Color intensity scales in 5 levels based on % change magnitude:
- >2%: dark green / dark red
- 1–2%: medium green / red
- 0.5–1%: light green / red
- 0–0.5%: faint tint
- 0%: neutral zinc

Responsive grid: 4 cols (mobile) → 6 cols (tablet) → 11 cols (desktop, all in one row).

### `EarningsCalendar`
Reads the current watchlist from localStorage. For each ticker with a known `earningsDate` within the next 90 days, renders a card showing:
- Ticker symbol and company name
- Earnings date (formatted)
- Badge: **Today** (same day), **Soon** (within 7 days), or the date itself
- Sorted by proximity (soonest first)

Only renders the section if at least one upcoming earnings event exists.

### `Watchlist`
State: loaded from localStorage key `watchlist` (defaults: AAPL, MSFT, NVDA, TSLA, VOO). Refreshes all quotes every 60 seconds silently.

Free tier enforcement: 5-ticker cap. Error message shown if a free user tries to add a 6th.

Per-ticker row displays:
- Symbol, company name
- Current price + daily $/ % change (green/red)
- 7-day sparkline (Recharts `LineChart`, no axes)
- **EARNS** badge if earnings are within 7 days
- Pre/after-hours price + change (amber)
- Expand/collapse chevron

Expanded row shows:
- Stats strip: 52W range, P/E, Market Cap, Dividend Yield
- Range selector: 1D / 7D / 30D / 90D / 1Y
- `AreaChart` with volume bars (`ComposedChart`)
- **Explain** AI button (Pro feature, lock icon for free)

Selecting a watchlist row fires `onSelect(ticker)` up to the parent (page.tsx) to show that ticker's news.

### `Portfolio`
State: positions stored in localStorage key `portfolio`. Each position: `{ ticker, shares }`. Quotes fetched on load, refreshed every 60 seconds.

Form: TickerAutocomplete + share count input (validates > 0 and ≤ 1,000,000). Adds position on submit.

Summary card shows:
- Total portfolio value
- Total daily $ and % change
- **Export CSV** button (downloads positions as a CSV file)
- **"What's happening with my portfolio today?"** AI button (Pro feature) — calls `/api/portfolio-summary`

Positions table per holding:
- Ticker, shares, current price, total value, daily $ and % change
- Remove button

Allocation donut chart: `PieChart` from Recharts, each slice proportional to position value.

90-day value history chart: one snapshot per day stored in localStorage, rendered as a `LineChart`. Green/red line based on whether current total is above the first snapshot.

Empty state message shown when no positions are added.

### `NewsSection`
Fetches top 10 articles from `/api/news?ticker=X`. Displays the 5 most recent with:
- Headline (clickable — fires `onArticleClick` to open the ArticlePanel)
- Publisher name + time ago (e.g. "3h ago")
- **Summarize** AI button at the top (Pro feature) — calls `/api/summarize` with all headline strings

### `ArticlePanel`
Slide-out drawer from the right edge. Renders when `article` prop is non-null:
- Semi-transparent backdrop (click to close)
- White panel: article title, source, formatted publish date, link to original URL
- Close button (✕) in top-right corner

---

## API Routes

All routes live under `app/api/` and are Next.js Route Handlers.

### `GET /api/quote?ticker=AAPL`
Returns: `symbol`, `name`, `price`, `change`, `changePercent`, `volume`, `marketState`, `preMarketPrice/Change/ChangePercent`, `postMarketPrice/Change/ChangePercent`, `pe`, `marketCap`, `high52w`, `low52w`, `dividendYield`, `earningsDate`.

Rate limited: 200 req/IP/hr (data limiter).

### `GET /api/history?ticker=AAPL&range=30d`
Valid ranges: `1d`, `7d`, `30d`, `90d`, `180d`, `1y`.

Interval mapping:
- 1d → 5-minute candles (filtered to current trading day, ET 9:30 AM+)
- 7d → 1-hour candles
- 30d / 90d / 180d / 1y → daily candles

Returns array of `{ date, close, volume?, session? }`. For 1d, each point includes `session: "regular" | "extended"`.

Not rate-limited (called frequently for charts).

### `GET /api/search?q=apple`
Returns up to 6 autocomplete results: `{ symbol, name, type }`. Filters to EQUITY, ETF, INDEX, CRYPTOCURRENCY types only.

Rate limited: 200 req/IP/hr (data limiter).

### `GET /api/news?ticker=AAPL`
Returns up to 10 news articles: `{ title, source, url, publishedAt }`. Uses `yahooFinance.search` with `newsCount: 10, quotesCount: 0`.

Rate limited: 200 req/IP/hr (data limiter).

### `GET /api/movers`
Returns `{ gainers: MoverItem[], losers: MoverItem[] }`. Each item: `{ symbol, name, price, changePercent }`.

Universe: 25 large-cap stocks — AAPL, MSFT, NVDA, TSLA, GOOGL, AMZN, META, JPM, V, UNH, XOM, WMT, LLY, AVGO, PG, MA, COST, AMD, NFLX, DIS, BA, GS, UBER, SPOT, INTC.

Server-side in-memory cache: 5-minute TTL. Not rate-limited.

### `GET /api/explain?ticker=AAPL&price=213.50&changePercent=-2.3`
**Pro feature.** Requires `x-app-client: market-plain` header (401 if missing).

Calls Claude Haiku (`claude-haiku-4-5-20251001`), `max_tokens: 300`. System prompt cached with `cache_control: ephemeral`. Returns `{ explanation }`.

Rate limited: 20 req/IP/hr (AI limiter).

### `POST /api/summarize`
**Pro feature.** Body: `{ ticker: string, headlines: string[] }`. Requires `x-app-client: market-plain` header.

Calls Claude Haiku, `max_tokens: 400`. System prompt cached. Returns `{ summary }`.

Rate limited: 20 req/IP/hr (AI limiter).

### `POST /api/portfolio-summary`
**Pro feature.** Body: `{ positions: PositionInput[], totalValue, totalChange, totalChangePct }`. Requires `x-app-client: market-plain` header.

Positions sorted by absolute % change before being sent to Claude. Calls Claude Haiku, `max_tokens: 400`. System prompt cached. Returns `{ summary }`.

Rate limited: 20 req/IP/hr (AI limiter).

---

## Utilities

### `app/lib/rateLimit.ts`
Two `RateLimiterMemory` instances:
- **`aiLimiter`** — 20 points / 3600 seconds per IP
- **`dataLimiter`** — 200 points / 3600 seconds per IP

`getIp(request)` — reads `x-forwarded-for` (first value), falls back to `x-real-ip`, then `"unknown"`.

`checkRateLimit(ip)` — consumes 1 point from `aiLimiter`, returns `{ allowed, remaining }`. If IP is `"unknown"`, always allows.

`checkDataRateLimit(ip)` — consumes 1 point from `dataLimiter`, returns `{ allowed }`. If IP is `"unknown"`, always allows.

---

## AI Integration

All three AI routes use the same pattern:
- Model: `claude-haiku-4-5-20251001`
- Prompt caching: `cache_control: { type: "ephemeral" }` on system prompts, sent with `anthropic-beta: prompt-caching-2024-07-31` header
- Client header guard: `x-app-client: market-plain` (401 if absent)
- Rate limit: 20 req/IP/hr

**System prompt styles:**
- `/explain` — financial analyst explaining a single stock's daily move (2-3 sentences, no bullets)
- `/summarize` — news analyst summarizing headlines for a ticker (3-4 sentences, no bullets)
- `/portfolio-summary` — portfolio analyst summarizing cross-portfolio activity (3-4 sentences, no bullets)

**Frontend guard:** AI buttons show a lock icon for free users and display an "upgrade" message instead of calling the API.

---

## Free vs. Pro

| Feature | Free | Pro |
|---|---|---|
| Watchlist tickers | 5 max | Unlimited |
| AI stock explanations | Locked (lock icon) | Unlocked |
| AI news summaries | Locked (lock icon) | Unlocked |
| AI portfolio summary | Locked (lock icon) | Unlocked |

`isPro` is currently stored as a localStorage flag (`"true"`/`"false"`). The AI routes do **not** verify Pro status server-side — the `x-app-client` header is the only server-side guard. Stripe integration and real auth are not yet implemented.

---

## Data Refresh Intervals

| Component | Refresh Interval |
|---|---|
| MarketStatus | 30 seconds |
| StockSearch (active ticker) | 30 seconds |
| Watchlist quotes | 60 seconds |
| Portfolio quotes | 60 seconds |
| Crypto page | 60 seconds |
| TopMovers (client) | On mount only |
| SectorHeatmap | On mount only |
| TopMovers (server cache) | 5-minute TTL |

---

## Known Issues

- **isPro flash** — `isPro` defaults to `true` in `page.tsx` to prevent the upgrade banner from flashing in. Portfolio and Watchlist default to `false`, so lock icons flash for one frame. Needs a unified client-side `isPro` context.
- **Watchlist explanation reset** — AI explanation state is not per-ticker; collapsing and re-expanding a row clears the explanation text.
- **In-memory rate limiter** — does not survive server restarts. Needs Redis for production.
- **`"unknown"` IP bucket** — all requests without IP headers share one rate limit bucket. Needs proper reverse proxy config in production.
- **No error boundaries** — a runtime error in any component crashes the full page. Each major section should be wrapped in a React `ErrorBoundary`.
- **Quote refresh when market is closed** — all components refresh on a fixed interval regardless of market hours. Should pause or extend interval outside trading hours.
- **SectorHeatmap never refreshes** — fetches once on mount only.

---

## Not Yet Built

- **Stripe payments** — `/upgrade` page exists, no checkout, no webhook, no session
- **Real authentication** — `isPro` is a trivially bypassable localStorage flag
- **Database persistence** — watchlist and portfolio live in localStorage only; cleared on browser wipe
- **Per-user rate limiting** — currently IP-based; shared IPs (offices, VPNs) share limits
- **Server-side Pro gating** — AI routes don't verify Pro status; needs real session/token check
- **Ticker comparison** — side-by-side chart with correlation score
- **Cost basis and P&L tracking** — removed in a prior session; would need avg buy price field and unrealized gain/loss calculation
