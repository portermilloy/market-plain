import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

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

  // For 1D, look back 4 days so weekends and holidays always resolve to the
  // most recent trading session rather than returning empty data.
  const period1 = config.days === null
    ? (() => {
        const d = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
        d.setDate(d.getDate() - 4);
        return d;
      })()
    : (() => { const d = new Date(); d.setDate(d.getDate() - config.days!); return d; })();

  try {
    const result = await yahooFinance.chart(ticker.toUpperCase(), {
      period1,
      interval: config.interval,
    });

    let rawQuotes = result.quotes.filter((q) => q.close !== null);

    if (range === "1d") {
      // Find the most recent calendar date (ET) that has data, then keep only
      // that day's quotes starting at 9:30 AM ET (drops pre-market).
      if (rawQuotes.length === 0) {
        return Response.json({ ticker: ticker.toUpperCase(), range, data: [] });
      }

      const mostRecentDate = rawQuotes.reduce((latest, q) => {
        const d = q.date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
        return d > latest ? d : latest;
      }, "");

      rawQuotes = rawQuotes.filter((q) => {
        const d = q.date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
        if (d !== mostRecentDate) return false;
        const et = new Date(q.date.toLocaleString("en-US", { timeZone: "America/New_York" }));
        const mins = et.getHours() * 60 + et.getMinutes();
        return mins >= 9 * 60 + 30;
      });
    }

    const data = rawQuotes.map((q) => {
      const date = config.interval !== "1d"
        ? q.date.toISOString()
        : q.date.toISOString().slice(0, 10);

      let session: "regular" | "extended" | undefined;
      if (range === "1d") {
        const et = new Date(q.date.toLocaleString("en-US", { timeZone: "America/New_York" }));
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
  } catch (err) {
    console.error("[/api/history]", err);
    return Response.json({ error: "Failed to fetch history" }, { status: 502 });
  }
}
