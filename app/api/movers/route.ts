import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

const UNIVERSE = [
  "AAPL","MSFT","NVDA","TSLA","GOOGL","AMZN","META","JPM","V","UNH",
  "XOM","WMT","LLY","AVGO","PG","MA","COST","AMD","NFLX","DIS",
  "BA","GS","UBER","SPOT","INTC",
];

interface MoverItem {
  symbol: string;
  name: string | null;
  price: number | null;
  changePercent: number | null;
}

interface Cache { gainers: MoverItem[]; losers: MoverItem[]; ts: number }
let cache: Cache | null = null;
const TTL = 30 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return Response.json({ gainers: cache.gainers, losers: cache.losers });
  }

  const settled = await Promise.allSettled(
    UNIVERSE.map((t) =>
      yahooFinance.quote(t) as Promise<Record<string, unknown>>
    )
  );

  const valid: MoverItem[] = settled
    .filter((r): r is PromiseFulfilledResult<Record<string, unknown>> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((q) => q.regularMarketChangePercent != null)
    .map((q) => ({
      symbol: q.symbol as string,
      name: (q.shortName ?? null) as string | null,
      price: (q.regularMarketPrice ?? null) as number | null,
      changePercent: q.regularMarketChangePercent as number,
    }))
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

  const gainers = valid.slice(0, 5);
  const losers = [...valid].reverse().slice(0, 5);

  cache = { gainers, losers, ts: Date.now() };
  return Response.json({ gainers, losers });
}
