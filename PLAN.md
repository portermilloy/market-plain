**Market Plain**
Complete Build Improvement Guide
*31 Steps — From Side Project to Production-Ready App*
Porter Milloy  ·  Milloy Web Studio  ·  May 2026

# **Overview**
This document contains every step needed to take Market Plain from a solid side project to a production-ready, monetizable application. Steps are organized into six categories: State & Architecture, Security, Features, Reliability & Data, Mobile & UX, and Portfolio & GitHub.

Each step includes a plain-English explanation of why it matters and an exact prompt you can paste into Claude Code. Do not skip the Security steps — some of them are blocking issues that would embarrass you if the app gets attention.

Priority order: do steps 1-9 before you show this to anyone publicly. Steps 10-31 can be tackled in any order after that.


## **At a Glance**

| **Category** | **Steps** | **Priority** |
| --- | --- | --- |
| State & Architecture | 1, 2, 3, 4, 5 | Do first |
| Security | 6, 7, 8, 9 | Do before going public |
| Features | 10, 11, 12, 13, 14, 15, 16, 17 | Do in any order |
| Reliability & Data | 18, 19, 20, 21, 22 | Do in any order |
| Mobile & UX | 23, 24, 25, 26, 27 | Do in any order |
| Portfolio & GitHub | 28, 29, 30, 31 | Do in any order |



# **State & Architecture**


| **1** | **Create a unified ProContext** State & Architecture |
| --- | --- |


**Why this matters**
Right now isPro is read from localStorage individually in page.tsx, Portfolio.tsx, and Watchlist.tsx. This causes flash bugs and inconsistency.

**Prompt for Claude Code**

| **Step 1** | Create a React context called ProContext in app/context/ProContext.tsx. It should read isPro from localStorage once on mount, expose isPro and setIsPro to all components, default to false until localStorage is read to avoid showing Pro features before the check completes, and export a useIsPro hook. Wrap the root layout in layout.tsx with this provider. Remove all individual isPro localStorage reads from page.tsx, Portfolio.tsx, and Watchlist.tsx and replace them with useIsPro. |
| --- | --- |





| **2** | **Fix per-ticker explanation state in Watchlist** State & Architecture |
| --- | --- |


**Why this matters**
Collapsing and re-expanding a watchlist row clears the AI explanation. Users have to re-fetch it every time.

**Prompt for Claude Code**

| **Step 2** | In Watchlist.tsx, change the AI explanation state from a single string to Record<string, string> keyed by ticker symbol. So explanations[ticker] persists across expand/collapse cycles for the duration of the session. Only clear it when the component unmounts or the user explicitly dismisses it. |
| --- | --- |





| **3** | **Add React Error Boundaries to every major section** State & Architecture |
| --- | --- |


**Why this matters**
One runtime error in any component crashes the entire dashboard right now.

**Prompt for Claude Code**

| **Step 3** | Create a reusable ErrorBoundary class component in app/components/ErrorBoundary.tsx with a clean fallback UI that shows a zinc-800 card saying the section failed to load with a retry button. Wrap each of these components individually in their own ErrorBoundary: StockSearch, TopMovers, SectorHeatmap, EarningsCalendar, Portfolio, Watchlist, NewsSection, and ArticlePanel. |
| --- | --- |





| **4** | **Extract market hours logic into a shared utility** State & Architecture |
| --- | --- |


**Why this matters**
Market open/closed logic is duplicated across components. One change needs to happen in multiple places.

**Prompt for Claude Code**

| **Step 4** | Create app/lib/marketHours.ts that exports isMarketOpen(), isPreMarket(), isAfterHours(), and getRefreshInterval(baseMs: number) which returns baseMs when open and baseMs * 5 when closed. Use the same Eastern Time logic already in MarketStatus.tsx. Replace the hardcoded intervals in StockSearch, Watchlist, Portfolio, Crypto page, and SectorHeatmap with getRefreshInterval calls. |
| --- | --- |





| **5** | **Add SectorHeatmap auto-refresh** State & Architecture |
| --- | --- |


**Why this matters**
SectorHeatmap fetches once on mount and never updates. During market hours it goes stale.

**Prompt for Claude Code**

| **Step 5** | In SectorHeatmap.tsx, add a setInterval that refetches all 11 sector ETF quotes using the getRefreshInterval utility from app/lib/marketHours.ts. Clear the interval on unmount. Show a subtle last-updated timestamp in the bottom right corner of the heatmap. |
| --- | --- |





# **Security**


| **6** | **Replace the x-app-client header guard with a signed token** Security |
| --- | --- |


**Why this matters**
Anyone can add x-app-client: market-plain to any request manually. It provides zero real protection.

**Prompt for Claude Code**

| **Step 6** | Generate a random MARKET_PLAIN_API_SECRET in .env.local. In each AI route (explain, summarize, portfolio-summary), replace the x-app-client header check with a check for an Authorization: Bearer <token> header where the token is a HMAC-SHA256 signature of a timestamp within the last 60 seconds. On the frontend, generate this token client-side using the Web Crypto API before each AI call. Document the .env variable in a .env.example file. |
| --- | --- |





| **7** | **Add server-side Pro gating to AI routes** Security |
| --- | --- |


**Why this matters**
AI routes currently do not verify Pro status at all. Any request with the right header gets AI access.

**Prompt for Claude Code**

| **Step 7** | Until Stripe is integrated, add a secondary check in all three AI routes that reads a PRO_BYPASS_TOKENS environment variable — a comma-separated list of tokens. The frontend should store the user token in localStorage and send it as an X-Pro-Token header. If the token is not in the allowed list, return 403. This gives you a way to manually grant Pro access to testers and yourself while Stripe is not yet live. |
| --- | --- |





| **8** | **Document Redis requirement for production rate limiting** Security |
| --- | --- |


**Why this matters**
The in-memory rate limiter resets on every server restart and does not work across multiple instances.

**Prompt for Claude Code**

| **Step 8** | Add a check in app/lib/rateLimit.ts that logs a warning to the console if NODE_ENV is production and a REDIS_URL environment variable is not set. Add a comment block explaining that in production rate-limiter-flexible should be configured with ioredis as the backend. Add setup instructions to README.md under a Production Deployment section. |
| --- | --- |





| **9** | **Handle the unknown IP rate limit bucket** Security |
| --- | --- |


**Why this matters**
All requests without IP headers currently share one bucket, meaning one user can exhaust limits for everyone behind the same proxy.

**Prompt for Claude Code**

| **Step 9** | In app/lib/rateLimit.ts, change the unknown IP fallback behavior. Instead of always allowing, generate a session-based identifier from a combination of User-Agent and Accept-Language headers hashed together as a fingerprint. Use this as the rate limit key when no IP is available. Still log a warning that the IP is unknown. |
| --- | --- |





# **Features**


| **10** | **Add cost basis and P&L tracking to Portfolio** Features |
| --- | --- |


**Why this matters**
Removed in a prior session. Without avg buy price you cannot show unrealized gain/loss which is the most useful portfolio metric.

**Prompt for Claude Code**

| **Step 10** | Add avgBuyPrice as an optional field to each portfolio position stored in localStorage. Update the add position form to include an optional Average Buy Price input. In the positions table, add two new columns: Cost Basis (shares * avgBuyPrice) and Unrealized P&L (current value minus cost basis, shown in green/red). In the summary card, show total unrealized gain/loss across the portfolio. |
| --- | --- |





| **11** | **Add ticker comparison to StockSearch** Features |
| --- | --- |


**Why this matters**
Comparing two stocks on one chart is one of the most commonly requested features in finance apps.

**Prompt for Claude Code**

| **Step 11** | In StockSearch.tsx, add a Compare button next to the range selector. Clicking it shows a second TickerAutocomplete input. When a second ticker is selected, fetch its history for the same range and overlay it on the existing AreaChart as a second line in a different color (use indigo for the second ticker). Show a correlation score between the two price series below the chart calculated as Pearson correlation of their daily returns. Add a clear comparison button to remove the second ticker. |
| --- | --- |





| **12** | **Add search history to TickerAutocomplete** Features |
| --- | --- |


**Why this matters**
Users retype the same tickers repeatedly. Search history makes the app feel fast and polished.

**Prompt for Claude Code**

| **Step 12** | In TickerAutocomplete.tsx, store the last 5 searched tickers in localStorage under the key search-history. When the input is focused and empty, show the search history as a dropdown instead of waiting for API results. Each history item shows the symbol and name. Add a clear history option at the bottom. When a ticker from history is selected, move it to the top of the history list. |
| --- | --- |





| **13** | **Add a simple onboarding flow for new users** Features |
| --- | --- |


**Why this matters**
A new user lands on the dashboard with no guidance. They do not know what to click or how to use it.

**Prompt for Claude Code**

| **Step 13** | Create an onboarding overlay component that appears the first time a user visits (tracked via localStorage key onboarding-complete). Show three steps as a simple card overlay: 1) Search any stock or crypto at the top, 2) Add tickers to your watchlist, 3) Click a watchlist ticker to see news and AI explanations. Add a skip and a next button. On completion set onboarding-complete in localStorage. Do not show it again after that. |
| --- | --- |





| **14** | **Add price alerts for watchlist tickers** Features |
| --- | --- |


**Why this matters**
Price alerts are the single biggest reason people keep a finance app installed.

**Prompt for Claude Code**

| **Step 14** | Add a bell icon to each watchlist row. Clicking it opens a small popover where the user can set an alert price and choose above or below. Store alerts in localStorage under watchlist-alerts. During the 60-second quote refresh cycle in Watchlist.tsx, check each ticker with an active alert against its current price. If triggered, show a toast notification using a simple fixed-position banner at the top of the screen and clear the alert. Use the Notification API if permission is granted for browser notifications. |
| --- | --- |





| **15** | **Add dark/light mode toggle** Features |
| --- | --- |


**Why this matters**
The app is hardcoded dark. Some users prefer light mode and it is a standard expectation.

**Prompt for Claude Code**

| **Step 15** | Add a theme toggle button to the header in layout.tsx. Store the preference in localStorage under theme. Use a ThemeContext similar to ProContext to expose the current theme. Apply a light class to the html element when light mode is active. Update globals.css to define light mode CSS variable overrides under .light that change bg-zinc-950 to white and text-zinc-100 to zinc-900 throughout the app. The toggle should show a sun or moon icon depending on current mode. |
| --- | --- |





| **16** | **Add a landing page before the dashboard** Features |
| --- | --- |


**Why this matters**
Right now anyone who finds your URL or GitHub lands directly in the app with no context about what it is. You need a place to explain the product.

**Prompt for Claude Code**

| **Step 16** | Create app/landing/page.tsx as a static marketing page. Move the current app/page.tsx dashboard to app/dashboard/page.tsx. The landing page should include: a headline and subheadline explaining the product, three feature highlights with icons, a preview screenshot or mockup, a Get Started button that goes to /dashboard, and a Pro upgrade CTA. Update all internal navigation links accordingly. |
| --- | --- |





| **17** | **Add Stripe payments for Pro** Features |
| --- | --- |


**Why this matters**
isPro is currently a localStorage flag anyone can set manually. You cannot charge for the app without real payments.

**Prompt for Claude Code**

| **Step 17** | Install stripe and @stripe/stripe-js. Create a Stripe product and price for Market Plain Pro in the Stripe dashboard. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env.local. Create app/api/checkout/route.ts that creates a Stripe Checkout session and returns the URL. Create app/api/webhook/route.ts that handles checkout.session.completed and sets a server-side session token. Update the upgrade page to call the checkout API. After successful payment redirect back to /dashboard with a session token in the URL that gets stored in localStorage as the real Pro token. |
| --- | --- |





# **Reliability & Data**


| **18** | **Add a fallback data source for when Yahoo Finance fails** Reliability & Data |
| --- | --- |


**Why this matters**
Yahoo Finance is unofficial and can break without warning. Your entire app stops working when it does.

**Prompt for Claude Code**

| **Step 18** | Create app/lib/marketData.ts as an abstraction layer over yahoo-finance2. Each function (getQuote, getHistory, searchTickers, getNews) should try Yahoo Finance first and catch errors. On failure, return a structured error object with { error: true, message, fallback: true } rather than throwing. On the frontend, when a component receives an error response, show a subtle banner saying data may be delayed rather than a broken UI. Document in README.md that Yahoo Finance is unofficial and may have downtime. |
| --- | --- |





| **19** | **Handle delisted tickers and null data gracefully** Reliability & Data |
| --- | --- |


**Why this matters**
Searching for a delisted or invalid ticker currently causes unhandled null reference errors.

**Prompt for Claude Code**

| **Step 19** | In all API routes that call yahoo-finance2, add explicit null checks after each data fetch. If quote returns null or undefined, return a 404 with { error: 'Ticker not found or delisted' }. On the frontend, show a user-friendly message in StockSearch and Watchlist when a ticker returns not found instead of crashing or showing empty values. |
| --- | --- |





| **20** | **Add a note to the UI about crypto data delay** Reliability & Data |
| --- | --- |


**Why this matters**
Yahoo Finance crypto prices are notoriously delayed. Users may make decisions on stale data.

**Prompt for Claude Code**

| **Step 20** | In the Crypto page header and in TickerAutocomplete next to CRYPTO badge results, add a small amber-colored note that says Prices may be delayed up to 15 minutes. Do the same in the StockSearch component when a crypto ticker is selected based on the marketState field in the quote response. |
| --- | --- |





| **21** | **Add server-side caching for quote data** Reliability & Data |
| --- | --- |


**Why this matters**
Right now 100 users looking at AAPL make 100 separate Yahoo Finance requests. This will get you rate limited fast.

**Prompt for Claude Code**

| **Step 21** | Create a server-side in-memory cache in app/lib/cache.ts with a simple Map that stores { data, expiresAt } per cache key. Add a get and set function with TTL support. In /api/quote, cache responses for 30 seconds. In /api/movers, increase the cache TTL from 5 minutes to match. In /api/history for ranges longer than 1d, cache for 5 minutes. Log cache hits vs misses in development. |
| --- | --- |





| **22** | **Pause all refresh intervals when the tab is not visible** Reliability & Data |
| --- | --- |


**Why this matters**
Every component refreshes on a fixed schedule even when the user has switched to another tab, wasting API calls.

**Prompt for Claude Code**

| **Step 22** | Create a custom hook in app/lib/useVisibilityRefresh.ts that wraps setInterval with document.addEventListener('visibilitychange'). When the tab becomes hidden, pause the interval. When it becomes visible again, immediately fetch fresh data and restart the interval. Replace all raw setInterval calls in StockSearch, Watchlist, Portfolio, Crypto page, and MarketStatus with this hook. |
| --- | --- |





# **Mobile & UX**


| **23** | **Fix the three-column dashboard grid on mobile** Mobile & UX |
| --- | --- |


**Why this matters**
The Portfolio, Watchlist, and NewsSection three-column grid almost certainly breaks on mobile and tablet sizes.

**Prompt for Claude Code**

| **Step 23** | In page.tsx, change the three-column grid that holds Portfolio, Watchlist, and NewsSection from a fixed three-column layout to grid-cols-1 on mobile, grid-cols-2 on tablet (md breakpoint), and grid-cols-3 on desktop (xl breakpoint). Test each breakpoint and adjust padding and gap values so nothing overflows. NewsSection should stack below the other two on tablet since it only renders when a ticker is selected. |
| --- | --- |





| **24** | **Fix ArticlePanel on mobile** Mobile & UX |
| --- | --- |


**Why this matters**
A slide-out drawer from the right edge does not work well on small screens where it would cover the entire viewport.

**Prompt for Claude Code**

| **Step 24** | In ArticlePanel.tsx, detect screen width using a useMediaQuery hook or window.innerWidth check. On mobile (under 768px), render the panel as a bottom sheet that slides up from the bottom of the screen at 90vh height instead of a right-side drawer. Add a drag handle at the top of the sheet. The close button and backdrop behavior should remain the same. |
| --- | --- |





| **25** | **Add loading skeletons to every component that fetches data** Mobile & UX |
| --- | --- |


**Why this matters**
Some components have loading skeletons and some show nothing while loading. It looks unpolished and inconsistent.

**Prompt for Claude Code**

| **Step 25** | Audit every component that makes an API call. For any component that currently shows nothing, a spinner, or raw loading text while fetching, replace with a Tailwind skeleton shimmer animation using animate-pulse and bg-zinc-800 placeholder blocks that match the rough shape of the loaded content. Components to fix: TopMovers, SectorHeatmap, EarningsCalendar, NewsSection, Portfolio positions table, and Crypto coin list. |
| --- | --- |





| **26** | **Add consistent empty states** Mobile & UX |
| --- | --- |


**Why this matters**
Some components show nothing when empty and others show a message. Empty states guide users toward taking action.

**Prompt for Claude Code**

| **Step 26** | Add explicit empty state UI to these components: Portfolio when no positions are added (show an icon and a prompt to add your first position), Watchlist when cleared completely (show an icon and instructions to search for a ticker above), NewsSection when no ticker is selected (show a prompt to click a watchlist ticker to see news), and EarningsCalendar when no upcoming earnings are found (show a small note instead of hiding the section entirely). |
| --- | --- |





| **27** | **Add keyboard shortcuts for power users** Mobile & UX |
| --- | --- |


**Why this matters**
Power users expect to navigate finance apps with their keyboard.

**Prompt for Claude Code**

| **Step 27** | Add a global keyboard shortcut listener in layout.tsx. Implement: / or Cmd+K to focus the StockSearch input, Escape to clear the current search or close any open panel, D to navigate to the dashboard, C to navigate to the crypto page. Show a keyboard shortcut hint panel triggered by pressing ? that lists all available shortcuts. Store shortcuts in a config object so they are easy to document and extend. |
| --- | --- |





# **Portfolio & GitHub**


| **28** | **Write a real README.md** Portfolio & GitHub |
| --- | --- |


**Why this matters**
The current README is the default Next.js template. Anyone who finds your GitHub sees an unfinished project even though it is not.

**Prompt for Claude Code**

| **Step 28** | Replace the current README.md with a complete project README that includes: a project title and one-line description, a features list with emoji icons, a tech stack table matching the one in PROGRESS.md, a Getting Started section with npm install and npm run dev instructions, a .env.local setup section listing required environment variables, a screenshot or placeholder for one, a Known Issues section linking to PROGRESS.md, and a footer with your name and a link to Milloy Web Studio. Write it in a professional but approachable tone. |
| --- | --- |





| **29** | **Add a CONTRIBUTING.md and issue templates** Portfolio & GitHub |
| --- | --- |


**Why this matters**
If you share this publicly, people may want to contribute. Having these files makes the repo look professional and serious.

**Prompt for Claude Code**

| **Step 29** | Create CONTRIBUTING.md with instructions for cloning, setting up .env.local, running locally, and submitting a pull request. Create .github/ISSUE_TEMPLATE/bug_report.md with fields for description, steps to reproduce, expected vs actual behavior, and environment. Create .github/ISSUE_TEMPLATE/feature_request.md with fields for the problem being solved and proposed solution. These files signal that you take the project seriously. |
| --- | --- |





| **30** | **Set up GitHub Actions for basic CI** Portfolio & GitHub |
| --- | --- |


**Why this matters**
A CI pipeline on your GitHub repo shows employers you understand professional development workflows.

**Prompt for Claude Code**

| **Step 30** | Create .github/workflows/ci.yml that runs on every push and pull request to master. The workflow should: check out the code, set up Node 20, run npm install, run npx tsc --noEmit to check TypeScript types, and run npx eslint app to check for lint errors. Add a status badge to README.md showing whether the latest CI run passed. |
| --- | --- |





| **31** | **Deploy to Vercel with a real domain** Portfolio & GitHub |
| --- | --- |


**Why this matters**
A .vercel.app URL is fine for testing but a real domain makes this a portfolio piece you can hand to anyone.

**Prompt for Claude Code**

| **Step 31** | Create a vercel.json in the project root that sets the framework to nextjs and configures environment variable names needed for deployment (without values). Add deployment instructions to README.md covering: how to connect the GitHub repo to Vercel, which environment variables to set in the Vercel dashboard, and how to connect a custom domain in Vercel settings. Buy marketplain.app or a similar domain on Namecheap and point it to Vercel. |
| --- | --- |





# **Final Notes**
Work through these in order within each category. The Security section in particular should be completed before you share the app publicly or post about it on social media.

Every prompt is written to be pasted directly into Claude Code. If Claude Code asks for clarification, provide the relevant file path or component name from the project structure in PROGRESS.md.

After completing steps 1-9, the app is safe to show publicly. After steps 10-17, it is worth charging for. After all 31 steps, it is a legitimate portfolio piece that stands alongside work from junior devs at real companies.

Good luck. The hard part is already done — you built the thing. Now just keep shipping.

*— Milloy Web Studio, May 2026*