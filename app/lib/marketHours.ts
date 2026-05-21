function getET(): { day: number; mins: number } {
  const et = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  return { day: et.getDay(), mins: et.getHours() * 60 + et.getMinutes() };
}

export function isMarketOpen(): boolean {
  const { day, mins } = getET();
  if (day === 0 || day === 6) return false;
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

export function isPreMarket(): boolean {
  const { day, mins } = getET();
  if (day === 0 || day === 6) return false;
  return mins >= 4 * 60 && mins < 9 * 60 + 30;
}

export function isAfterHours(): boolean {
  const { day, mins } = getET();
  if (day === 0 || day === 6) return false;
  return mins >= 16 * 60 && mins < 20 * 60;
}

export function getRefreshInterval(baseMs: number): number {
  return isMarketOpen() ? baseMs : baseMs * 5;
}
