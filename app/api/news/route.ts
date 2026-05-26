import { checkDataRateLimit, getIp } from "@/app/lib/rateLimit";
import { getNews, isDataError } from "@/app/lib/marketData";

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

  const result = await getNews(ticker);

  if (isDataError(result)) {
    return Response.json({ ...result, ticker: ticker.toUpperCase() }, { status: 502 });
  }

  const news = (result.news as Record<string, unknown>[]).map((item) => ({
    title: item.title,
    source: item.publisher,
    url: item.link,
    publishedAt: (item.providerPublishTime as Date).toISOString(),
  }));

  return Response.json({ ticker: ticker.toUpperCase(), news });
}
