import { RateLimiterMemory } from "rate-limiter-flexible";

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

export function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
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
