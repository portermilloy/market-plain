import YahooFinance from "yahoo-finance2";
import { checkDataRateLimit, getIp } from "@/app/lib/rateLimit";

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) return Response.json({ results: [] });

  const { allowed } = await checkDataRateLimit(getIp(request));
  if (!allowed) {
    return Response.json({ results: [] });
  }

  try {
    const result = await yahooFinance.search(q, { quotesCount: 8, newsCount: 0 });

    const results = result.quotes
      .filter((item) => "symbol" in item && item.isYahooFinance)
      .filter((item) => {
        const type = (item as Record<string, unknown>).quoteType as string;
        return type === "EQUITY" || type === "ETF" || type === "INDEX" || type === "CRYPTOCURRENCY";
      })
      .slice(0, 6)
      .map((item) => {
        const i = item as Record<string, unknown>;
        return {
          symbol: i.symbol as string,
          name: (i.shortname ?? i.longname ?? null) as string | null,
          type: i.quoteType as string,
        };
      });

    return Response.json({ results });
  } catch (err) {
    console.error("[/api/search]", err);
    return Response.json({ results: [] });
  }
}
