This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production Deployment

### Environment variables

Copy `.env.example` to `.env.local` and fill in all values before deploying. In Vercel, add these under **Project → Settings → Environment Variables**.

| Variable | Description |
| --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |
| `NEXT_PUBLIC_MARKET_PLAIN_API_SECRET` | 32-byte hex secret for HMAC request signing — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PRO_BYPASS_TOKENS` | Comma-separated Pro access tokens for manual tester access |
| `PRO_TOKEN_SECRET` | Server-only 32-byte hex secret for signing Stripe Pro tokens — never expose to the client |
| `STRIPE_SECRET_KEY` | Stripe secret key from the Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for `/api/webhook` |
| `STRIPE_PRICE_ID` | Price ID of the Market Plain Pro subscription product in Stripe |
| `REDIS_URL` | Redis connection string for production rate limiting (see below) |

### Data source

Market Plain uses [yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2) for all market data. **This is an unofficial library and is not affiliated with Yahoo Finance.** Yahoo may rate-limit or break the API without notice. If data stops loading, check the yahoo-finance2 GitHub issues for known outages. When Yahoo Finance is unavailable, the app shows an amber banner rather than a broken UI.

### Redis rate limiting

The default in-memory rate limiter (`RateLimiterMemory`) resets on every server restart and does not work across multiple Vercel instances. For production, set `REDIS_URL` and swap both limiters in `app/lib/rateLimit.ts` to `RateLimiterRedis`:

```ts
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const aiLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 20,
  duration: 3600,
  keyPrefix: "rl_ai",
});

const dataLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 200,
  duration: 3600,
  keyPrefix: "rl_data",
});
```

[Upstash Redis](https://upstash.com) is recommended for Vercel deployments — it is serverless-compatible and has a free tier. Install `ioredis` with `npm install ioredis`.
