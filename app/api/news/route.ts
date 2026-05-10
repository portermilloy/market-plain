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
    const result = await yahooFinance.search(ticker.toUpperCase(), {
      newsCount: 10,
      quotesCount: 0,
    });

    const news = result.news.map((item) => ({
      title: item.title,
      source: item.publisher,
      url: item.link,
      publishedAt: item.providerPublishTime.toISOString(),
    }));

    return Response.json({ ticker: ticker.toUpperCase(), news });
  } catch (err) {
    console.error("[/api/news]", err);
    return Response.json({ error: "Failed to fetch news" }, { status: 502 });
  }
}
