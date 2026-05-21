# Market Plain — Research

Open questions and investigation items to resolve before or during implementation.

→ Stack decisions and package log: [stack.md](stack.md)
→ API routes, external services, and env vars: [api.md](api.md)

---

## Auth & Payments (Steps 6, 7, 17)

- [ ] Decide on final auth strategy — NextAuth.js, Clerk, or custom JWT — before wiring Stripe webhooks to Pro status
- [ ] Evaluate Stripe Checkout vs Stripe Payment Links for simplicity at launch
- [ ] Decide on Pro pricing: one-time vs monthly subscription
- [ ] Confirm HMAC token approach (Step 6) works within Next.js Edge Runtime if routes are ever moved there

## Data Layer (Steps 18, 21)

- [ ] Audit yahoo-finance2 rate limits — determine actual requests/minute before choosing cache TTLs
- [ ] Evaluate whether Upstash Redis (serverless) is a better fit than self-hosted Redis for Vercel deployment (Step 8, 21)
- [ ] Research backup data sources: Alpha Vantage free tier, Polygon.io, or Financial Modeling Prep as fallback for Step 18
- [ ] Check if yahoo-finance2 returns a `marketState` field reliably for crypto tickers (needed for Step 20 delay notice)

## Infrastructure (Steps 8, 30, 31)

- [ ] Decide whether to use Vercel's built-in environment variable secrets or an external vault (Doppler, etc.)
- [ ] Check Vercel free tier limits for serverless function invocations — relevant if rate limiting is in-memory only
- [ ] Domain research: availability and pricing of `marketplain.app`, `marketplain.io`, `getmarketplain.com`
- [ ] Determine whether GitHub Actions CI (Step 30) needs secrets injected for type-check to pass (e.g. missing env vars causing tsc errors)

## UX & Design (Steps 13, 15, 24, 27)

- [ ] Decide on onboarding trigger — first visit only, or show again after X days of inactivity (Step 13)
- [ ] Check browser support for the Notification API on Safari — may need a fallback toast-only path (Step 14)
- [ ] Decide on light mode color palette before implementing ThemeContext — avoid reworking Tailwind classes twice (Step 15)
- [ ] Test ArticlePanel bottom sheet behavior on iOS Safari, which handles `vh` units differently (Step 24)

## Architecture (Steps 1, 4, 22)

- [ ] Confirm ProContext approach is compatible with planned Stripe integration — may need to merge with a SessionContext later
- [ ] Evaluate React Query or SWR as a replacement for manual `setInterval` + `useVisibilityRefresh` (Step 22) — could simplify Steps 4, 5, and 22 simultaneously
- [ ] Check if Next.js 16 has built-in support for route-level caching that would supersede the manual cache in Step 21
