# Market Plain — Project Overview

A full-stack financial dashboard built with Next.js 16, React 19, TypeScript, and Tailwind CSS. Displays real-time stock and crypto market data, portfolio tracking, earnings reports, and AI-powered plain-English explanations powered by Claude.

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
│   ├── layout.tsx                   # Root layout: themed header, nav, market status
│   ├── page.tsx                     # Landing page (marketing / feature overview)
│   ├── globals.css                  # Tailwind import + CSS variables (dark/light theme)
│   ├── dashboard/
│   │   ├── page.tsx                 # Main dashboard page
│   │   └── loading.tsx              # Dashboard loading skeleton
│   ├── crypto/
│   │   └── page.tsx                 # Crypto dashboard page
│   ├── upgrade/
│   │   └── page.tsx                 # Pro upgrade landing page
│   ├── api/
│   │   ├── quote/route.ts           # GET stock/crypto quote
│   │   ├── history/route.ts         # GET OHLCV price history
│   │   ├── search/route.ts          # GET ticker autocomplete
│   │   ├── news/route.ts            # GET top 10 headlines per ticker
│   │   ├── movers/route.ts          # GET top 5 gainers + losers
│   │   ├── earnings/route.ts        # GET last 4 quarters EPS + revenue
│   │   ├── explain/route.ts         # GET AI explanation of a daily move (Pro)
│   │   ├── summarize/route.ts       # POST AI summary of news headlines (Pro)
│   │   ├── earnings-explain/route.ts # POST AI explanation of earnings (Pro)
│   │   └── portfolio-summary/
│   │       └── route.ts             # POST AI summary of full portfolio (Pro)
│   ├── components/
│   │   ├── NavLinks.tsx             # Dashboard / Crypto nav tabs
│   │   ├── MarketStatus.tsx         # Live market open/closed indicator
│   │   ├── ThemedHeader.tsx         # Header with theme-aware styling
│   │   ├── ThemeToggle.tsx          # Dark/light mode toggle button
│   │   ├── ErrorBoundary.tsx        # React error boundary wrapper
│   │   ├── OnboardingOverlay.tsx    # First-time 3-step onboarding card
│   │   ├── StockSearch.tsx          # Full-width search + quote + chart + earnings
│   │   ├── TickerAutocomplete.tsx   # Debounced autocomplete input
│   │   ├── TopMovers.tsx            # Top 5 gainers and losers
│   │   ├── SectorHeatmap.tsx        # 11-sector ETF performance grid
│   │   ├── EarningsCalendar.tsx     # Upcoming earnings for watchlist tickers
│   │   ├── Watchlist.tsx            # Persistent watchlist with expanded earnings view
│   │   ├── Portfolio.tsx            # Holdings tracker with charts + AI summary
│   │   ├── NewsSection.tsx          # Latest headlines per ticker + AI summary
│   │   ├── CryptoWidget.tsx         # Crypto price widget on dashboard
│   │   └── ArticlePanel.tsx         # Slide-out article detail drawer
│   ├── context/
│   │   ├── ProContext.tsx           # Unified Pro status context
│   │   └── ThemeContext.tsx         # Dark/light theme context
│   └── lib/
│       ├── rateLimit.ts             # In-memory IP rate limiters (AI + data)
│       ├── authToken.ts             # HMAC-SHA256 signed token generation/verification
│       ├── proToken.ts              # Server-side Pro token validation
│       └── marketHours.ts          # Market hours + refresh interval logic
├── PROGRESS.md
├── milestone.md
├── PLAN.md
├── CLAUDE.md → AGENTS.md
├── AGENTS.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Pages

### `/` — Landing Page (`app/page.tsx`)
Marketing page introducing Market Plain. Features overview, call-to-action to open the dashboard.

### `/dashboard` — Dashboard (`app/dashboard/page.tsx`)
Client component. Manages shared state across all sections:
- `selectedTicker` — which ticker's news to show (set by clicking a watchlist row)
- `selectedArticle` — which article to open in the ArticlePanel drawer
- `isPro` — read from `ProContext`

Renders, top to bottom:
1. **Upgrade banner** — shown to free users, dismissible, links to `/upgrade`
2. **Page heading** — "Dashboard / The market, explained in plain English."
3. `<StockSearch />`
4. `<TopMovers />`
5. `<SectorHeatmap />`
6. `<EarningsCalendar />`
7. `<CryptoWidget />`
8. Three-column grid: `<Portfolio />` · `<Watchlist />` · `<NewsSection />` (NewsSection only renders when a ticker is selected)
9. `<ArticlePanel />` slide-out drawer

### `/crypto` — Crypto Dashboard (`app/crypto/page.tsx`)
Tracks 10 major cryptocurrencies: BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, LINK, DOT.

### `/upgrade` — Pro Upgrade Page (`app/upgrade/page.tsx`)
Static page listing Pro features. "Payments coming soon" notice (Stripe not yet integrated).

---

## Layout (`app/layout.tsx`)

Wraps every page. Provides `ProContext` and `ThemeContext`. Sets:
- Geist Sans + Geist Mono font variables
- `<ThemedHeader>` with wordmark, `<NavLinks />`, `<MarketStatus />`, `<ThemeToggle />`
- `<main>`: flex-1, max-w-7xl, horizontal padding, 8 units vertical padding

---

## Components

### `ThemeToggle` / `ThemeContext`
Dark/light mode toggle in the header. `ThemeContext` stores current theme in localStorage; CSS variable overrides in `globals.css` handle color switching.

### `StockSearch`
Full-width search bar at the top of the dashboard. Features:
- `<TickerAutocomplete />` for symbol selection with last-5 search history
- Quote fetch on selection, 30-second auto-refresh
- Price, daily change, pre/after-hours price + change
- Stats row: P/E, Market Cap, 52W range, Dividend Yield, Earnings date
- Range selector: 1d / 7d / 30d / 90d / 1y
- Ticker comparison overlay with Pearson correlation score
- **Quarterly Earnings panel** — loads automatically on ticker select; shows last 4 quarters with reported date, EPS actual vs estimate, beat/miss in plain English, revenue
- AI earnings explanation button (Pro)
- AI move explanation button (Pro)

### `Watchlist`
State: loaded from localStorage (defaults: AAPL, MSFT, NVDA, TSLA, VOO). 60-second auto-refresh.

Free tier: 5-ticker cap.

Per-ticker row:
- Symbol, company name, price, daily change (green/red), 7-day sparkline
- **EARNS** badge within 7 days of report date; **EARNS ✓** within 2 days after report
- Pre/after-hours price (amber)
- Bell icon for price alerts (popover, toast notification + browser Notification API)

Expanded row:
- Stats strip: P/E, Market Cap, 52W range, Dividend Yield, Earnings date
- Range selector: 1D / 7D / 30D / 90D / 1Y with range-change label
- `ComposedChart` with volume bars; 1D splits regular/extended session
- **Quarterly Earnings panel** — same as StockSearch; loads on first expand
- AI earnings explanation button (Pro)
- AI move explanation button (Pro)

### `Portfolio`
Positions in localStorage. Each position: `{ ticker, shares, avgBuyPrice }`.

Summary card: total value, daily change, unrealized P&L, Export CSV, AI portfolio summary (Pro).

Positions table: ticker, shares, avg buy price, cost basis, current price, total value, daily change, unrealized gain/loss.

Allocation donut chart + 90-day portfolio value history line chart.

### `EarningsCalendar`
Reads watchlist from localStorage. Shows upcoming earnings within 90 days sorted by proximity. Badges: **Today**, **Soon** (≤7 days), or formatted date.

### `TopMovers`
Fetches `/api/movers` on mount. Two rows: gainers (green) and losers (red). 30-minute server-side cache.

### `SectorHeatmap`
11 sector ETFs. Color intensity in 5 levels by % change magnitude. Auto-refreshes. Responsive: 4→6→11 columns.

### `CryptoWidget`
Live prices for major crypto assets on the dashboard.

### `NewsSection`
Top 10 articles from `/api/news?ticker=X`. 5 most recent shown. AI Summarize button (Pro).

### `ArticlePanel`
Slide-out drawer. Title, source, date, link to original article.

### `OnboardingOverlay`
3-step first-time onboarding card, dismissed to localStorage.

### `ErrorBoundary`
Wraps every major dashboard section to prevent one component failure from crashing the page.

---

## API Routes

### `GET /api/quote?ticker=AAPL`
Returns: `symbol`, `name`, `price`, `change`, `changePercent`, `volume`, `marketState`, pre/post-market fields, `pe`, `marketCap`, `high52w`, `low52w`, `dividendYield`, `earningsDate`.

Rate limited: 200 req/IP/hr.

### `GET /api/history?ticker=AAPL&range=1d`
Valid ranges: `1d`, `7d`, `30d`, `90d`, `180d`, `1y`.

- `1d` → 5-minute candles. Filters to most recent trading session with regular-hours data (≥9:30 AM ET). Pre-market bars from the next calendar day are excluded so the chart never goes blank after midnight.
- `7d` → 1-hour candles
- `30d / 90d / 180d / 1y` → daily candles

Returns `{ date, close, volume?, session? }`. 1D points include `session: "regular" | "extended"`.

### `GET /api/search?q=apple`
Up to 6 autocomplete results: `{ symbol, name, type }`. Filters to EQUITY, ETF, INDEX, CRYPTOCURRENCY.

Rate limited: 200 req/IP/hr.

### `GET /api/earnings?ticker=AAPL`
Returns last 4 quarters of earnings data: `{ period, reportedDate, epsEstimate, epsActual, epsDifference, surprisePercent, revenue, currency }`.

Uses `quoteSummary` with `earnings` module. `reportedDate` is the actual earnings release date from `earningsChart.quarterly.reportedDate`. Falls back to unavailable gracefully (ETFs, crypto return 404).

Rate limited: 200 req/IP/hr.

### `GET /api/news?ticker=AAPL`
Up to 10 articles: `{ title, source, url, publishedAt }`.

Rate limited: 200 req/IP/hr.

### `GET /api/movers`
`{ gainers: MoverItem[], losers: MoverItem[] }`. Universe of 25 large-cap stocks. 30-minute server-side cache.

### `GET /api/explain?ticker=AAPL&price=213.50&changePercent=-2.3`
**Pro. Auth required.** Claude Haiku, 300 tokens. Returns `{ explanation }`.

Rate limited: 20 req/IP/hr.

### `POST /api/summarize`
**Pro. Auth required.** Body: `{ ticker, headlines[] }`. Claude Haiku, 400 tokens. Returns `{ summary }`.

Rate limited: 20 req/IP/hr.

### `POST /api/earnings-explain`
**Pro. Auth required.** Body: `{ ticker, quarters[], currency }`. Claude Haiku, 400 tokens. Explains what the quarterly earnings results mean in plain English. Returns `{ explanation }`.

Rate limited: 20 req/IP/hr.

### `POST /api/portfolio-summary`
**Pro. Auth required.** Body: `{ positions[], totalValue, totalChange, totalChangePct }`. Claude Haiku, 400 tokens. Returns `{ summary }`.

Rate limited: 20 req/IP/hr.

---

## Security

All AI routes require:
1. `Authorization: Bearer <HMAC-SHA256 token>` — signed with `NEXT_PUBLIC_MARKET_PLAIN_API_SECRET`, valid for 60 seconds
2. `X-Pro-Token` header matching a value in `PRO_BYPASS_TOKENS` env var

Data routes are rate-limited but do not require auth.

---

## AI Integration

All AI routes:
- Model: `claude-haiku-4-5-20251001`
- Prompt caching: `cache_control: { type: "ephemeral" }` on system prompts
- Rate limit: 20 req/IP/hr

| Route | Prompt style |
|---|---|
| `/explain` | Financial analyst, 2-3 sentences on daily move |
| `/summarize` | News analyst, 3-4 sentences on headlines |
| `/earnings-explain` | Financial analyst, 3-4 sentences on quarterly results |
| `/portfolio-summary` | Portfolio analyst, 3-4 sentences on cross-portfolio activity |

---

## Free vs. Pro

| Feature | Free | Pro |
|---|---|---|
| Watchlist tickers | 5 max | Unlimited |
| AI move explanations | Locked | Unlocked |
| AI news summaries | Locked | Unlocked |
| AI earnings explanations | Locked | Unlocked |
| AI portfolio summary | Locked | Unlocked |

---

## Data Refresh Intervals

| Component | Interval |
|---|---|
| MarketStatus | 30 seconds |
| StockSearch (active ticker) | 30 seconds |
| Watchlist quotes | 60 seconds |
| Portfolio quotes | 60 seconds |
| Crypto page | 60 seconds |
| TopMovers (server cache) | 30-minute TTL |
| SectorHeatmap | On mount only |

---

## Known Issues

- **In-memory rate limiter** — does not survive server restarts; needs Redis for production
- **SectorHeatmap never refreshes** — fetches once on mount only
- **No mobile layout** — dashboard grid is not optimized for small screens
- **No error states on several components** — TopMovers, SectorHeatmap lack user-facing error UI

---

## Not Yet Built

- **Stripe payments** — `/upgrade` page exists, no checkout or webhook
- **Real authentication** — `isPro` is a localStorage flag; AI routes use HMAC + Pro token, not real user sessions
- **Database persistence** — watchlist and portfolio live in localStorage only
- **Redis rate limiting** — in-memory only for now; shared across restarts
- **`marketData.ts` abstraction** — no structured fallback when yahoo-finance2 fails
- **Ticker delay notice** — no "prices may be delayed" label for crypto in StockSearch
- **`useVisibilityRefresh` hook** — intervals run even when tab is hidden
- **Keyboard shortcuts** — `/`, `Cmd+K`, `Esc` not yet wired up
- **GitHub Actions CI** — no automated TypeScript/ESLint checks on push
- **Vercel deployment** — not yet deployed to production
