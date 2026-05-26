# Market Plain — Milestones

> Do steps 1–9 before sharing publicly. Steps 10–31 can run in any order after that. Steps 32+ are post-launch.

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
- [x] **15** — Add dark/light mode toggle in header; `ThemeContext`; CSS variable overrides in `globals.css`
- [x] **16** — Add landing page at `/`; move dashboard to `/dashboard`
- [ ] **17** — Integrate Stripe for Pro payments (checkout session, webhook, real Pro token) — do after turning 18 on May 26

---

## Phase 4 — Reliability & Data
*Any order*

- [ ] **18** — Create `app/lib/marketData.ts` abstraction over yahoo-finance2 with structured error fallback
- [ ] **19** — Add null checks for delisted/invalid tickers across all API routes; user-friendly 404 messages
- [ ] **20** — Add amber "prices may be delayed up to 15 minutes" note on Crypto page and crypto results in StockSearch
- [ ] **21** — Add server-side in-memory cache (`app/lib/cache.ts`) for quote, movers, and history routes — do this before sharing publicly to prevent yahoo-finance2 throttling under traffic spikes
- [ ] **22** — Create `useVisibilityRefresh` hook; replace all raw `setInterval` calls across components

---

## Phase 5 — Mobile & UX
*Any order*

- [ ] **23** — Fix three-column dashboard grid for mobile (1 col) and tablet (2 col) — do before sharing link publicly
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

---

## Phase 7 — Vercel & Infrastructure
*Do around deployment time*

- [ ] **32** — Add all environment variables to Vercel dashboard: `ANTHROPIC_API_KEY`, `MARKET_PLAIN_API_SECRET`, `PRO_BYPASS_TOKENS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] **33** — Confirm `yahoo-finance2` is in `dependencies` not `devDependencies` in `package.json` — run `npm install yahoo-finance2 --save` if needed
- [ ] **34** — Enable Vercel Analytics in the project dashboard — tracks page views, traffic sources, and load times
- [ ] **35** — Set up Vercel preview deployments — every branch push gets its own URL for testing before merging to main
- [ ] **36** — Set a `$10/month` spend cap at `console.anthropic.com` before going live to prevent surprise bills
- [ ] **37** — Add `vercel.json` with function timeout configuration — set AI routes to 30 second timeout to handle slow Anthropic responses
- [ ] **38** — Add Upstash Redis for production rate limiting — replace in-memory rate limiter which resets on every cold start. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel environment variables

---

## Phase 8 — Payments & Pro Verification
*Do after turning 18 and deploying*

- [ ] **39** — Create Stripe account, verify identity with government ID, connect bank account for payouts
- [ ] **40** — Create a "Market Plain Pro" product at `$7.99/month` in the Stripe dashboard
- [ ] **41** — Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Vercel environment variables
- [ ] **42** — Create checkout session route at `/api/checkout` that creates a Stripe checkout session and redirects to Stripe's hosted payment page
- [ ] **43** — Create webhook handler at `/api/stripe-webhook` that listens for payment success events and verifies the Stripe signature
- [ ] **44** — Create `/api/check-pro` route that accepts an email, checks with the Stripe API whether that email has an active subscription, and returns true or false
- [ ] **45** — Replace the localStorage isPro flag with Stripe email lookup — user enters their email, app calls `/api/check-pro`, stores result and email in localStorage so they only type it once per device
- [ ] **46** — Add upgrade flow — when a free user hits a Pro feature show a modal with an "Upgrade to Pro — $7.99/month" button that calls `/api/checkout`
- [ ] **47** — Add Stripe customer portal route so users can manage their own subscription, cancel, and update their card
- [ ] **48** — Test full payment flow end to end in Stripe test mode using card `4242 4242 4242 4242` before switching to live mode
- [ ] **49** — Set aside 25-30% of every payment for taxes — Stripe sends a 1099-K at year end if you make over $600

---

## Phase 9 — Scale (only when you hit these thresholds)

- [ ] **50** — *At 50+ paying users* — Add Vercel KV to limit one active session per email so users cannot share Pro access. Store active session tokens with a 30 day expiry.
- [ ] **51** — *At 50+ paying users* — Add Stripe customer portal so users can self-serve cancel, update card, and view billing history
- [ ] **52** — *At 500+ paying users* — Add Vercel Postgres to store user accounts. When Stripe confirms payment write email and subscription status to the database. Replace Stripe email lookup with database check. Add magic link login via Resend.
- [ ] **53** — *At 500+ paying users* — Add background price alerts using Vercel Cron Job running every 15 minutes, Vercel KV to store alerts, and Resend to send email notifications when a price target is hit
- [ ] **54** — *At 500+ paying users* — Add prompt caching to `/api/explain` and `/api/summarize` system prompts using `cache_control` type `ephemeral` to reduce Anthropic API costs by up to 90% on cached input tokens

---

## Notes

- Anthropic account created after May 26 — AI features not testable until then
- Use `localStorage.setItem('isPro', 'true')` in browser console to test Pro features locally without paying
- Vercel AI Gateway has $5/month in free credits — can use to test AI routes before Anthropic key is set up
- Mobile layout fixes (step 23) and server-side cache (step 21) are the two most important steps before sharing the link publicly
- Do not add a database until you actually need one — build for the scale you have
- Git flow: work on branches, test on Vercel preview URL, merge to main when ready, Vercel auto-deploys within 30 seconds