import { createHmac } from "crypto";

/** Generates a server-signed Pro token tied to a Stripe checkout session ID. */
export function generateProToken(sessionId: string): string {
  const secret = process.env.PRO_TOKEN_SECRET ?? "";
  const sig = createHmac("sha256", secret).update(sessionId).digest("hex");
  return `stripe.${sessionId}.${sig}`;
}

/**
 * Returns true when the token is either a PRO_BYPASS_TOKENS entry (testers)
 * or a valid HMAC-signed token from a completed Stripe checkout session.
 */
export function isValidProToken(token: string | null): boolean {
  if (!token) return false;

  // Existing bypass list (manual tester access)
  const allowed = (process.env.PRO_BYPASS_TOKENS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (allowed.includes(token)) return true;

  // Stripe-signed token: "stripe.{sessionId}.{hmacHex}"
  if (!token.startsWith("stripe.")) return false;
  const rest = token.slice("stripe.".length);
  const lastDot = rest.lastIndexOf(".");
  if (lastDot < 1) return false;
  const sessionId = rest.slice(0, lastDot);
  const sig = rest.slice(lastDot + 1);
  const secret = process.env.PRO_TOKEN_SECRET ?? "";
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(sessionId).digest("hex");
  return expected === sig;
}
