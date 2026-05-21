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
    const summary = await yahooFinance.quoteSummary(ticker.toUpperCase(), {
      modules: ["earnings"],
    });

    const e = summary.earnings;
    if (!e) {
      return Response.json({ error: "No earnings data available" }, { status: 404 });
    }

    const currency = e.financialCurrency ?? "USD";
    const revQuarterly = e.financialsChart.quarterly;

    const quarters = e.earningsChart.quarterly.slice(-4).map((q) => {
      const raw = q as Record<string, unknown>;
      const rev = revQuarterly.find((r) => r.date === q.date);

      const reportedTs = typeof raw.reportedDate === "number" ? raw.reportedDate : null;
      const difference = raw.difference != null ? parseFloat(String(raw.difference)) : null;
      const surprisePct = raw.surprisePct != null ? parseFloat(String(raw.surprisePct)) : null;

      return {
        period: q.date,
        reportedDate: reportedTs ? new Date(reportedTs * 1000).toISOString() : null,
        epsEstimate: q.estimate,
        epsActual: q.actual ?? null,
        epsDifference: difference,
        surprisePercent: surprisePct,
        revenue: rev?.revenue ?? null,
      };
    });

    return Response.json({ ticker: ticker.toUpperCase(), quarters, currency });
  } catch (err) {
    console.error("[/api/earnings]", err);
    return Response.json({ error: "Failed to fetch earnings data" }, { status: 502 });
  }
}
