function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function hmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage
  );
}

export async function generateAuthToken(): Promise<string> {
  const secret = process.env.NEXT_PUBLIC_MARKET_PLAIN_API_SECRET;
  if (!secret) return "";
  const ts = Math.floor(Date.now() / 1000).toString();
  const key = await hmacKey(secret, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${ts}.${hex}`;
}

export async function verifyAuthToken(authHeader: string | null): Promise<boolean> {
  const secret = process.env.NEXT_PUBLIC_MARKET_PLAIN_API_SECRET;
  if (!secret || !authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;
  const ts = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 60) return false;
  try {
    const key = await hmacKey(secret, ["verify"]);
    const sigBytes = hexToBytes(sig);
    return crypto.subtle.verify("HMAC", key, sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer, new TextEncoder().encode(ts));
  } catch {
    return false;
  }
}
