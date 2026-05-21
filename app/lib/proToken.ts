export function isValidProToken(token: string | null): boolean {
  if (!token) return false;
  const allowed = (process.env.PRO_BYPASS_TOKENS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return allowed.includes(token);
}
