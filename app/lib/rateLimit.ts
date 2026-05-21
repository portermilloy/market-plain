import { createHash } from "crypto";
import { RateLimiterMemory } from "rate-limiter-flexible";

/*
 * Production note: RateLimiterMemory resets on every server restart and does
 * not work across multiple instances. For production, replace both limiters
 * with RateLimiterRedis from rate-limiter-flexible, backed by ioredis:
 *
 *   import { RateLimiterRedis } from "rate-limiter-flexible";
 *   import Redis from "ioredis";
 *   const redis = new Redis(process.env.REDIS_URL);
 *   const aiLimiter = new RateLimiterRedis({ storeClient: redis, points: 20, duration: 3600, keyPrefix: "rl_ai" });
 *
 * See README.md § Production Deployment for full setup instructions.
 */
if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
  console.warn(
    "[rateLimit] WARNING: REDIS_URL is not set. Rate limiting is in-memory only — " +
    "limits will reset on restart and will not work across multiple server instances."
  );
}

// AI routes: 20/hr per IP
const aiLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60 * 60,
});

// Data routes: 200/hr per IP (covers polling + normal browsing)
const dataLimiter = new RateLimiterMemory({
  points: 200,
  duration: 60 * 60,
});

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function headerFingerprint(request: Request): string {
  const ua = request.headers.get("user-agent") ?? "";
  const lang = request.headers.get("accept-language") ?? "";
  return "fp_" + createHash("sha256").update(`${ua}|${lang}`).digest("hex").slice(0, 16);
}

export function getIp(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  if (!ip) {
    const fp = headerFingerprint(request);
    console.warn(`[rateLimit] Unknown IP — using header fingerprint ${fp} for rate limiting`);
    return fp;
  }

  return LOOPBACK.has(ip) ? "unknown" : ip;
}

export async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  if (ip === "unknown") return { allowed: true, remaining: Infinity };
  try {
    const result = await aiLimiter.consume(ip);
    return { allowed: true, remaining: result.remainingPoints };
  } catch {
    return { allowed: false, remaining: 0 };
  }
}

export async function checkDataRateLimit(ip: string): Promise<{ allowed: boolean }> {
  if (ip === "unknown") return { allowed: true };
  try {
    await dataLimiter.consume(ip);
    return { allowed: true };
  } catch {
    return { allowed: false };
  }
}
