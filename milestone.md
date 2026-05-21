# Market Plain — Milestones

> Do steps 1–9 before sharing publicly. Steps 10–31 can run in any order after that.

---

## Phase 1 — State & Architecture
*Do first*

- [x] **1** — Create a unified `ProContext` in `app/context/ProContext.tsx`; remove per-component `localStorage` reads from `page.tsx`, `Portfolio.tsx`, `Watchlist.tsx`
- [x] **2** — Fix per-ticker explanation state in `Watchlist.tsx` — change from a single string to `Record<string, string>`
- [x] **3** — Add `ErrorBoundary` wrapper to every major section (StockSearch, TopMovers, SectorHeatmap, EarningsCalendar, Portfolio, Watchlist, NewsSection, ArticlePanel)
- [x] **4** — Extract market hours logic into `app/lib/marketHours.ts`; replace hardcoded intervals across components
- [x] **5** — Add auto-refresh + last-updated timestamp to `SectorHeatmap.tsx`

---

## Phase 2 — Security
*Do before going public*

- [x] **6** — Replace `x-app-client` header guard with HMAC-SHA256 signed token; add `MARKET_PLAIN_API_SECRET` to `.env.local`
- [x] **7** — Add server-side Pro gating via `PRO_BYPASS_TOKENS` env var to all AI routes
- [x] **8** — Document Redis requirement for production rate limiting; add warning in `rateLimit.ts` and `README.md`
- [x] **9** — Replace unknown-IP rate limit bucket with a User-Agent + Accept-Language fingerprint hash

---

## Phase 3 — Features
*Any order*

- [x] **10** — Add cost basis and unrealized P&L tracking to Portfolio (avgBuyPrice field + new table columns)
- [x] **11** — Add ticker comparison overlay to StockSearch with Pearson correlation score
- [x] **12** — Add search history (last 5 tickers) to `TickerAutocomplete` via localStorage
- [x] **13** — Add first-time onboarding overlay (3-step card, `onboarding-complete` localStorage key)
- [x] **14** — Add price alerts to Watchlist (bell icon, popover, toast + Notification API)
- [ ] **15** — Add dark/light mode toggle in header; `ThemeContext`; CSS variable overrides in `globals.css`
- [ ] **16** — Add landing page at `/`; move dashboard to `/dashboard`
- [ ] **17** — Integrate Stripe for Pro payments (checkout session, webhook, real Pro token)

---

## Phase 4 — Reliability & Data
*Any order*

- [ ] **18** — Create `app/lib/marketData.ts` abstraction over yahoo-finance2 with structured error fallback
- [ ] **19** — Add null checks for delisted/invalid tickers across all API routes; user-friendly 404 messages
- [ ] **20** — Add amber "prices may be delayed up to 15 minutes" note on Crypto page and crypto results in StockSearch
- [ ] **21** — Add server-side in-memory cache (`app/lib/cache.ts`) for quote, movers, and history routes
- [ ] **22** — Create `useVisibilityRefresh` hook; replace all raw `setInterval` calls across components

---

## Phase 5 — Mobile & UX
*Any order*

- [ ] **23** — Fix three-column dashboard grid for mobile (1 col) and tablet (2 col)
- [ ] **24** — Fix `ArticlePanel` on mobile — render as bottom sheet at <768px
- [ ] **25** — Add `animate-pulse` skeleton loaders to TopMovers, SectorHeatmap, EarningsCalendar, NewsSection, Portfolio, Crypto list
- [ ] **26** — Add empty states to Portfolio, Watchlist, NewsSection, and EarningsCalendar
- [ ] **27** — Add keyboard shortcuts (`/`, `Cmd+K`, `Esc`, `D`, `C`, `?`) via global listener in `layout.tsx`

---

## Phase 6 — Portfolio & GitHub
*Any order*

- [ ] **28** — Write a real `README.md` (features, tech stack, setup, env vars, screenshot, known issues)
- [ ] **29** — Add `CONTRIBUTING.md` and `.github/ISSUE_TEMPLATE/` bug + feature templates
- [ ] **30** — Set up GitHub Actions CI (`ci.yml`) for TypeScript and ESLint checks on every push
- [ ] **31** — Deploy to Vercel with a real domain; add `vercel.json`; buy `marketplain.app` or similar
