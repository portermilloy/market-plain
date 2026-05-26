import { checkDataRateLimit, getIp } from "@/app/lib/rateLimit";
import { searchTickers, isDataError } from "@/app/lib/marketData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) return Response.json({ results: [] });

  const { allowed } = await checkDataRateLimit(getIp(request));
  if (!allowed) {
    return Response.json({ results: [] });
  }

  const result = await searchTickers(q, 8);

  if (isDataError(result)) {
    return Response.json({ results: [], ...result }, { status: 502 });
  }

  const results = (result.quotes as Record<string, unknown>[])
    .filter((item) => "symbol" in item && item.isYahooFinance)
    .filter((item) => {
      const type = item.quoteType as string;
      return type === "EQUITY" || type === "ETF" || type === "INDEX" || type === "CRYPTOCURRENCY";
    })
    .slice(0, 6)
    .map((item) => ({
      symbol: item.symbol as string,
      name: (item.shortname ?? item.longname ?? null) as string | null,
      type: item.quoteType as string,
    }));

  return Response.json({ results });
}
