import YahooFinance from "yahoo-finance2";
import { checkDataRateLimit, getIp } from "@/app/lib/rateLimit";

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return Response.json({ error: "ticker is required" }, { status: 400 });
  }

  const { allowed } = await checkDataRateLimit(getIp(request));
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    let q: Record<string, unknown>;
    try {
      q = (await yahooFinance.quote(ticker.toUpperCase())) as Record<string, unknown>;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
      q = (await yahooFinance.quote(ticker.toUpperCase())) as Record<string, unknown>;
    }

    return Response.json({
      symbol: q.symbol,
      name: q.shortName ?? null,
      price: q.regularMarketPrice ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      volume: q.regularMarketVolume ?? null,
      marketState: q.marketState ?? null,
      preMarketPrice: q.preMarketPrice ?? null,
      preMarketChange: q.preMarketChange ?? null,
      preMarketChangePercent: q.preMarketChangePercent ?? null,
      postMarketPrice: q.postMarketPrice ?? null,
      postMarketChange: q.postMarketChange ?? null,
      postMarketChangePercent: q.postMarketChangePercent ?? null,
      pe: q.trailingPE ?? null,
      marketCap: q.marketCap ?? null,
      high52w: q.fiftyTwoWeekHigh ?? null,
      low52w: q.fiftyTwoWeekLow ?? null,
      dividendYield:
        q.dividendYield != null ? (q.dividendYield as number) * 100 : null,
      earningsDate: q.earningsTimestamp
        ? (q.earningsTimestamp as Date).toISOString()
        : null,
    });
  } catch (err) {
    console.error("[/api/quote]", err);
    return Response.json({ error: "Failed to fetch quote" }, { status: 502 });
  }
}
