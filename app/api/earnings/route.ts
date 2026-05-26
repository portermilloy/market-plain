import { checkDataRateLimit, getIp } from "@/app/lib/rateLimit";
import { getQuoteSummary, isDataError } from "@/app/lib/marketData";

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

  const summary = await getQuoteSummary(ticker, ["earnings"]);

  if (isDataError(summary)) {
    return Response.json({ ...summary, ticker: ticker.toUpperCase() }, { status: 502 });
  }

  const e = summary.earnings as Record<string, unknown> | null;
  if (!e) {
    return Response.json({ error: "No earnings data available" }, { status: 404 });
  }

  const currency = (e.financialCurrency ?? "USD") as string;
  const revQuarterly = (e.financialsChart as Record<string, unknown>).quarterly as Record<string, unknown>[];
  const earningsChart = e.earningsChart as Record<string, unknown>;
  const earningsQuarterly = (earningsChart.quarterly as Record<string, unknown>[]).slice(-4);

  const quarters = earningsQuarterly.map((q) => {
    const rev = revQuarterly.find((r) => r.date === q.date);
    const reportedTs = typeof q.reportedDate === "number" ? q.reportedDate : null;
    const difference = q.difference != null ? parseFloat(String(q.difference)) : null;
    const surprisePct = q.surprisePct != null ? parseFloat(String(q.surprisePct)) : null;

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
}
