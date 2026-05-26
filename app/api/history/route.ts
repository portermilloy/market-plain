import { checkDataRateLimit, getIp } from "@/app/lib/rateLimit";
import { getChart, isDataError } from "@/app/lib/marketData";

const RANGES: Record<string, { days: number | null; interval: "5m" | "1h" | "1d" }> = {
  "1d":   { days: null, interval: "5m" },
  "7d":   { days: 7,   interval: "1h" },
  "30d":  { days: 30,  interval: "1d" },
  "90d":  { days: 90,  interval: "1d" },
  "180d": { days: 180, interval: "1d" },
  "1y":   { days: 365, interval: "1d" },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const range = searchParams.get("range") ?? "30d";

  if (!ticker) {
    return Response.json({ error: "ticker is required" }, { status: 400 });
  }

  const config = RANGES[range];
  if (!config) {
    return Response.json(
      { error: "range must be one of: 1d, 7d, 30d, 90d, 180d, 1y" },
      { status: 400 }
    );
  }

  const { allowed } = await checkDataRateLimit(getIp(request));
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  // For 1D, look back 4 days so weekends and holidays always resolve to the
  // most recent trading session rather than returning empty data.
  const period1 = config.days === null
    ? (() => {
        const d = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
        d.setDate(d.getDate() - 4);
        return d;
      })()
    : (() => { const d = new Date(); d.setDate(d.getDate() - config.days!); return d; })();

  const result = await getChart(ticker, period1, config.interval);

  if (isDataError(result)) {
    return Response.json({ ...result, ticker: ticker.toUpperCase(), range }, { status: 502 });
  }

  let rawQuotes = (result.quotes as Record<string, unknown>[]).filter(
    (q) => q.close !== null
  );

  if (range === "1d") {
    if (rawQuotes.length === 0) {
      return Response.json({ ticker: ticker.toUpperCase(), range, data: [] });
    }

    const regularQuotes = rawQuotes.filter((q) => {
      const et = new Date((q.date as Date).toLocaleString("en-US", { timeZone: "America/New_York" }));
      return et.getHours() * 60 + et.getMinutes() >= 9 * 60 + 30;
    });

    if (regularQuotes.length === 0) {
      return Response.json({ ticker: ticker.toUpperCase(), range, data: [] });
    }

    const mostRecentDate = regularQuotes.reduce((latest, q) => {
      const d = (q.date as Date).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      return d > latest ? d : latest;
    }, "");

    rawQuotes = rawQuotes.filter((q) => {
      const d = (q.date as Date).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      if (d !== mostRecentDate) return false;
      const et = new Date((q.date as Date).toLocaleString("en-US", { timeZone: "America/New_York" }));
      const mins = et.getHours() * 60 + et.getMinutes();
      return mins >= 9 * 60 + 30;
    });
  }

  const data = rawQuotes.map((q) => {
    const date = config.interval !== "1d"
      ? (q.date as Date).toISOString()
      : (q.date as Date).toISOString().slice(0, 10);

    let session: "regular" | "extended" | undefined;
    if (range === "1d") {
      const et = new Date((q.date as Date).toLocaleString("en-US", { timeZone: "America/New_York" }));
      const mins = et.getHours() * 60 + et.getMinutes();
      session = mins < 16 * 60 ? "regular" : "extended";
    }

    return {
      date,
      close: q.close as number,
      ...(q.volume != null && { volume: q.volume }),
      ...(session && { session }),
    };
  });

  return Response.json({ ticker: ticker.toUpperCase(), range, data });
}
