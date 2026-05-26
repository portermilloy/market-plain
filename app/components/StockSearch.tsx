"use client";

import { Fragment, useEffect, useState } from "react";
import { generateAuthToken } from "../lib/authToken";
import { getRefreshInterval } from "../lib/marketHours";
import { useIsPro, useProToken } from "../context/ProContext";
import FallbackBanner from "./FallbackBanner";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TickerAutocomplete from "./TickerAutocomplete";

const RANGES = ["1d", "7d", "30d", "90d", "1y"] as const;
type Range = (typeof RANGES)[number];

interface QuoteData {
  symbol: string;
  name: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketState: string | null;
  preMarketPrice: number | null;
  preMarketChange: number | null;
  preMarketChangePercent: number | null;
  postMarketPrice: number | null;
  postMarketChange: number | null;
  postMarketChangePercent: number | null;
  pe: number | null;
  marketCap: number | null;
  high52w: number | null;
  low52w: number | null;
  dividendYield: number | null;
  earningsDate: string | null;
}

interface HistoryPoint {
  date: string;
  close: number;
}

interface MergedChartPoint {
  date: string;
  close: number;
  compareClose?: number;
}

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: QuoteData }
  | { status: "error" };

type ChartState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: HistoryPoint[] }
  | { status: "error" };

interface EarningsQuarter {
  period: string;
  reportedDate: string | null;
  epsEstimate: number;
  epsActual: number | null;
  epsDifference: number | null;
  surprisePercent: number | null;
  revenue: number | null;
}

interface EarningsData {
  quarters: EarningsQuarter[];
  currency: string;
}

type EarningsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: EarningsData }
  | { status: "unavailable" }
  | { status: "error" };

function fmt(n: number | null, d = 2) {
  if (n === null) return "—";
  return n.toFixed(d);
}

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtQuarter(raw: string): string {
  const m = raw.match(/^(\d)Q(\d{4})$/);
  if (!m) return raw;
  return `Q${m[1]} ${m[2]}`;
}

function fmtRev(n: number, currency: string): string {
  const sym = currency === "USD" ? "$" : `${currency} `;
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(1)}M`;
  return `${sym}${n.toFixed(0)}`;
}

function isPositive(data: QuoteData): boolean {
  const val = data.changePercent ?? data.change;
  return val !== null && val >= 0;
}

function pearsonCorrelation(primary: HistoryPoint[], compare: HistoryPoint[]): number {
  const n = Math.min(primary.length, compare.length);
  if (n < 3) return 0;

  const ret1: number[] = [];
  const ret2: number[] = [];
  for (let i = 1; i < n; i++) {
    ret1.push((primary[i].close - primary[i - 1].close) / primary[i - 1].close);
    ret2.push((compare[i].close - compare[i - 1].close) / compare[i - 1].close);
  }

  const m = ret1.length;
  const mean1 = ret1.reduce((a, b) => a + b, 0) / m;
  const mean2 = ret2.reduce((a, b) => a + b, 0) / m;

  let num = 0, den1 = 0, den2 = 0;
  for (let i = 0; i < m; i++) {
    const d1 = ret1[i] - mean1;
    const d2 = ret2[i] - mean2;
    num += d1 * d2;
    den1 += d1 * d1;
    den2 += d2 * d2;
  }

  const den = Math.sqrt(den1 * den2);
  return den === 0 ? 0 : num / den;
}

function buildCompareData(primary: HistoryPoint[], compare: HistoryPoint[]): MergedChartPoint[] {
  if (primary.length === 0) return [];
  const baseP = primary[0].close;
  const baseC = compare.length > 0 ? compare[0].close : 1;

  const compareMap = new Map(compare.map((p) => [p.date, p.close]));
  const hasDateMatch = primary.some((p) => compareMap.has(p.date));

  if (hasDateMatch) {
    return primary.map((p) => {
      const cc = compareMap.get(p.date);
      return {
        date: p.date,
        close: ((p.close - baseP) / baseP) * 100,
        ...(cc !== undefined ? { compareClose: ((cc - baseC) / baseC) * 100 } : {}),
      };
    });
  }

  // Index-based alignment for intraday where timestamps rarely match exactly
  const minLen = Math.min(primary.length, compare.length);
  return primary.slice(0, minLen).map((p, i) => ({
    date: p.date,
    close: ((p.close - baseP) / baseP) * 100,
    compareClose: ((compare[i].close - baseC) / baseC) * 100,
  }));
}

function correlationLabel(r: number): string {
  const abs = Math.abs(r);
  const dir = r >= 0 ? "positive" : "negative";
  if (abs >= 0.8) return `Strong ${dir}`;
  if (abs >= 0.5) return `Moderate ${dir}`;
  if (abs >= 0.2) return `Weak ${dir}`;
  return "Uncorrelated";
}

function StockChart({
  data,
  color,
  range,
  compareData,
  compareTicker,
}: {
  data: HistoryPoint[];
  color: string;
  range: Range;
  compareData?: HistoryPoint[];
  compareTicker?: string | null;
}) {
  const intraday = range === "1d" || range === "7d";
  const hasCompare = compareData && compareData.length > 0;

  const chartData: MergedChartPoint[] = hasCompare
    ? buildCompareData(data, compareData)
    : data.map((p) => ({ date: p.date, close: p.close }));

  const tickFormatter = (d: string) =>
    intraday
      ? new Date(d).toLocaleString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
          ...(range === "7d" && { month: "short", day: "numeric" }),
        })
      : new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={
            hasCompare
              ? (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
              : (v: number) => `$${v.toFixed(0)}`
          }
        />
        <Tooltip
          cursor={{ stroke: "#52525b", strokeWidth: 1 }}
          contentStyle={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 6,
            fontSize: 12,
          }}
          itemStyle={{ color: "#e4e4e7" }}
          labelStyle={{ color: "#71717a" }}
          formatter={(v, name) => {
            const val = typeof v === "number" ? v : 0;
            const key = String(name);
            return hasCompare
              ? [
                  `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`,
                  key === "compareClose" ? (compareTicker ?? "Compare") : "Primary",
                ]
              : [`$${val.toFixed(2)}`, "Price"];
          }}
          labelFormatter={(label) => {
            const l = String(label);
            return intraday
              ? new Date(l).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })
              : new Date(l).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                });
          }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          fill={color}
          fillOpacity={hasCompare ? 0.08 : 0.15}
          dot={false}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
        {hasCompare && (
          <Area
            type="monotone"
            dataKey="compareClose"
            stroke="#818cf8"
            fill="#818cf8"
            fillOpacity={0.08}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
            connectNulls
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function QuoteDetail({
  data,
  chart,
  range,
  onRangeChange,
  showCompare,
  onToggleCompare,
  compareInput,
  onCompareInputChange,
  compareTicker,
  onCompareSelect,
  compareChart,
  onClearCompare,
}: {
  data: QuoteData;
  chart: ChartState;
  range: Range;
  onRangeChange: (r: Range) => void;
  showCompare: boolean;
  onToggleCompare: () => void;
  compareInput: string;
  onCompareInputChange: (v: string) => void;
  compareTicker: string | null;
  onCompareSelect: (sym: string) => void;
  compareChart: ChartState;
  onClearCompare: () => void;
}) {
  const isPro = useIsPro();
  const proToken = useProToken();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainStatus, setExplainStatus] = useState<"idle" | "loading" | "error">("idle");
  const [earningsState, setEarningsState] = useState<EarningsState>({ status: "idle" });
  const [earningsExplanation, setEarningsExplanation] = useState<string | null>(null);
  const [earningsExplainStatus, setEarningsExplainStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    setExplanation(null);
    setExplainStatus("idle");
    setEarningsExplanation(null);
    setEarningsExplainStatus("idle");
    setEarningsState({ status: "loading" });
    fetch(`/api/earnings?ticker=${data.symbol}`)
      .then((r) => r.json())
      .then((res: { quarters?: EarningsQuarter[]; currency?: string; error?: string }) => {
        if (res.error || !res.quarters || res.quarters.length === 0) {
          setEarningsState({ status: "unavailable" });
        } else {
          setEarningsState({ status: "ok", data: { quarters: res.quarters, currency: res.currency ?? "USD" } });
        }
      })
      .catch(() => setEarningsState({ status: "error" }));
  }, [data.symbol]);

  const dailyPositive = isPositive(data);
  const changeColor = dailyPositive ? "text-emerald-400" : "text-red-400";
  const sign = dailyPositive ? "+" : "";

  const isPre = data.marketState === "PRE" || data.marketState === "PREPRE";
  const isPost =
    data.marketState === "POST" ||
    data.marketState === "POSTPOST" ||
    (data.marketState === "CLOSED" && data.postMarketPrice != null);

  // For 1d, use the quote's official daily change (vs. previous close) so it
  // matches the header. Chart history endpoints measure open→now, which diverges
  // whenever there's a gap at open.
  const rangeChange =
    range === "1d"
      ? data.change !== null && data.changePercent !== null
        ? { diff: data.change, pct: data.changePercent, pos: data.change >= 0 }
        : null
      : chart.status === "ok" && chart.data.length >= 2
        ? (() => {
            const start = chart.data[0].close;
            const end = chart.data[chart.data.length - 1].close;
            const diff = end - start;
            const pct = (diff / start) * 100;
            return { diff, pct, pos: diff >= 0 };
          })()
        : null;

  const chartColor = (rangeChange?.pos ?? dailyPositive) ? "#34d399" : "#f87171";

  const correlation =
    chart.status === "ok" && compareChart.status === "ok"
      ? pearsonCorrelation(chart.data, compareChart.data)
      : null;

  return (
    <div className="rounded-lg border border-zinc-800 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">{data.name}</p>
          <p className="text-3xl font-semibold text-white tracking-tight">
            ${fmt(data.price)}
          </p>
          <p className={`mt-1 text-sm font-medium ${changeColor}`}>
            {sign}{fmt(data.change)} ({sign}{fmt(data.changePercent)}%) today
          </p>
          {isPre && data.preMarketPrice != null && (
            <p className="text-xs text-amber-400 mt-0.5">
              Pre-market ${fmt(data.preMarketPrice)}{" "}
              {data.preMarketChange != null &&
                `${data.preMarketChange >= 0 ? "+" : ""}$${fmt(Math.abs(data.preMarketChange))} `}
              {data.preMarketChangePercent != null &&
                `(${data.preMarketChangePercent >= 0 ? "+" : ""}${fmt(data.preMarketChangePercent)}%)`}
            </p>
          )}
          {isPost && data.postMarketPrice != null && (
            <p className="text-xs text-amber-400 mt-0.5">
              After-hours ${fmt(data.postMarketPrice)}{" "}
              {data.postMarketChange != null &&
                `${data.postMarketChange >= 0 ? "+" : ""}$${fmt(Math.abs(data.postMarketChange))} `}
              {data.postMarketChangePercent != null &&
                `(${data.postMarketChangePercent >= 0 ? "+" : ""}${fmt(data.postMarketChangePercent)}%)`}
            </p>
          )}
        </div>
        <span className="text-lg font-semibold text-white">{data.symbol}</span>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs">
        {data.pe != null && (
          <span className="text-zinc-500">
            P/E <span className="text-zinc-300">{data.pe.toFixed(1)}</span>
          </span>
        )}
        {data.marketCap != null && (
          <span className="text-zinc-500">
            Market Cap <span className="text-zinc-300">{fmtCap(data.marketCap)}</span>
          </span>
        )}
        {data.high52w != null && data.low52w != null && (
          <span className="text-zinc-500">
            52W Range{" "}
            <span className="text-zinc-300">
              ${data.low52w.toFixed(0)}–${data.high52w.toFixed(0)}
            </span>
          </span>
        )}
        {data.dividendYield != null && data.dividendYield > 0 && (
          <span className="text-zinc-500">
            Div Yield <span className="text-zinc-300">{data.dividendYield.toFixed(2)}%</span>
          </span>
        )}
        {data.earningsDate != null && (
          <span className="text-zinc-500">
            Earnings <span className="text-zinc-300">~{fmtDate(data.earningsDate)}</span>
          </span>
        )}
      </div>

      {/* Range change label */}
      {rangeChange && !showCompare && (
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className={`text-sm font-semibold ${rangeChange.pos ? "text-emerald-400" : "text-red-400"}`}>
            {rangeChange.pos ? "+" : ""}${Math.abs(rangeChange.diff).toFixed(2)}
          </span>
          <span className={`text-xs ${rangeChange.pos ? "text-emerald-400" : "text-red-400"}`}>
            ({rangeChange.pos ? "+" : ""}{rangeChange.pct.toFixed(2)}%)
          </span>
          <span className="text-xs text-zinc-600">past {range.toUpperCase()}</span>
        </div>
      )}

      {/* Range buttons + Compare toggle */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              range === r ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {r.toUpperCase()}
          </button>
        ))}
        <span className="mx-1 text-zinc-700 select-none">|</span>
        {!showCompare ? (
          <button
            onClick={onToggleCompare}
            className="px-2 py-1 text-xs rounded text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            Compare
          </button>
        ) : (
          <button
            onClick={onClearCompare}
            className="px-2 py-1 text-xs rounded text-indigo-400 hover:text-zinc-300 transition-colors"
          >
            ✕ Clear comparison
          </button>
        )}
      </div>

      {/* Compare ticker input */}
      {showCompare && (
        <div className="mb-3">
          <TickerAutocomplete
            value={compareInput}
            onChange={(v) => {
              onCompareInputChange(v);
              if (compareTicker && v !== compareTicker) onClearCompare();
            }}
            onSelect={onCompareSelect}
            placeholder="Compare with…"
          />
          {compareTicker && compareChart.status === "loading" && (
            <p className="text-xs text-zinc-500 mt-1 animate-pulse">Loading comparison…</p>
          )}
          {compareTicker && compareChart.status === "error" && (
            <p className="text-xs text-zinc-500 mt-1">Could not load comparison data.</p>
          )}
        </div>
      )}

      {/* Compare legend */}
      {showCompare && compareTicker && compareChart.status === "ok" && (
        <div className="flex items-center gap-3 mb-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: chartColor }} />
            <span className="text-zinc-400">{data.symbol}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 rounded bg-indigo-400" />
            <span className="text-zinc-400">{compareTicker}</span>
          </span>
          <span className="text-zinc-600 ml-auto">% change from start</span>
        </div>
      )}

      {/* Chart */}
      {chart.status === "ok" && chart.data.length > 0 ? (
        <StockChart
          data={chart.data}
          color={chartColor}
          range={range}
          compareData={compareChart.status === "ok" ? compareChart.data : undefined}
          compareTicker={compareTicker}
        />
      ) : chart.status === "loading" ? (
        <div className="flex items-center justify-center h-48 text-xs text-zinc-500 animate-pulse">
          Loading chart…
        </div>
      ) : chart.status === "error" ? (
        <div className="flex items-center justify-center h-48 text-xs text-zinc-500">
          Chart unavailable
        </div>
      ) : null}

      {/* Correlation score */}
      {correlation !== null && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">
            Correlation with {compareTicker}:
          </span>
          <span className={`font-medium ${Math.abs(correlation) >= 0.5 ? "text-zinc-200" : "text-zinc-400"}`}>
            {correlation.toFixed(2)}
          </span>
          <span className="text-zinc-600">— {correlationLabel(correlation)}</span>
        </div>
      )}

      {/* Earnings */}
      {(() => {
        if (earningsState.status === "loading") return (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              {[0,1,2,3].map((i) => <div key={i} className="h-3 w-full bg-zinc-800 rounded animate-pulse" />)}
            </div>
          </div>
        );
        if (earningsState.status !== "ok") return null;
        const { quarters, currency } = earningsState.data;
        return (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Quarterly Earnings</h3>
            <div className="divide-y divide-zinc-800/60 mb-3">
              {[...quarters].reverse().map((q) => {
                const beat = q.epsDifference != null ? q.epsDifference >= 0 : q.epsActual != null ? q.epsActual >= q.epsEstimate : null;
                const reportedLabel = q.reportedDate
                  ? new Date(q.reportedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
                  : null;
                return (
                  <div key={q.period} className="py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-zinc-200">{fmtQuarter(q.period)}</span>
                      {reportedLabel && (
                        <span className="text-xs text-zinc-500">Reported {reportedLabel}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      {q.epsActual != null ? (
                        <>
                          <span className="text-zinc-400">
                            Earned <span className="font-medium text-white">${q.epsActual.toFixed(2)}</span>
                            <span className="text-zinc-600"> per share</span>
                          </span>
                          {q.epsDifference != null && (
                            <span className={`font-medium ${beat ? "text-emerald-400" : "text-red-400"}`}>
                              &middot; {beat ? "beat" : "missed"} by {beat ? "+" : "−"}${Math.abs(q.epsDifference).toFixed(2)}
                              {q.surprisePercent != null && ` (${beat ? "+" : ""}${q.surprisePercent.toFixed(1)}%)`}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-500">Not yet reported · Est. ${q.epsEstimate.toFixed(2)}/share</span>
                      )}
                      {q.revenue != null && (
                        <span className="text-zinc-500 ml-auto">
                          Rev <span className="text-zinc-300">{fmtRev(q.revenue, currency)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {isPro && (
              earningsExplanation ? (
                <p className="text-xs text-zinc-400 leading-relaxed">{earningsExplanation}</p>
              ) : earningsExplainStatus === "loading" ? (
                <p className="text-xs text-zinc-500 animate-pulse">Analyzing earnings…</p>
              ) : earningsExplainStatus === "error" ? (
                <p className="text-xs text-zinc-500">Could not analyze earnings.</p>
              ) : (
                <button
                  onClick={() => {
                    if (earningsState.status !== "ok") return;
                    setEarningsExplainStatus("loading");
                    generateAuthToken().then((token) =>
                      fetch("/api/earnings-explain", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                          "X-Pro-Token": proToken ?? "",
                        },
                        body: JSON.stringify({ ticker: data.symbol, quarters, currency }),
                      })
                    )
                      .then((r) => r.json())
                      .then((res: { explanation?: string; error?: string }) => {
                        if (res.error || !res.explanation) setEarningsExplainStatus("error");
                        else { setEarningsExplanation(res.explanation); setEarningsExplainStatus("idle"); }
                      })
                      .catch(() => setEarningsExplainStatus("error"));
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  What do these earnings mean? →
                </button>
              )
            )}
          </div>
        );
      })()}

      {/* Explain */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        {!isPro ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Explain this move — Pro feature</span>
          </div>
        ) : explanation ? (
          <p className="text-xs text-zinc-400 leading-relaxed">{explanation}</p>
        ) : explainStatus === "loading" ? (
          <p className="text-xs text-zinc-500 animate-pulse">Generating explanation…</p>
        ) : explainStatus === "error" ? (
          <p className="text-xs text-zinc-500">Could not generate explanation.</p>
        ) : (
          <button
            onClick={() => {
              if (!data.price || data.changePercent === null) return;
              setExplainStatus("loading");
              generateAuthToken().then((token) =>
              fetch(`/api/explain?ticker=${data.symbol}&price=${data.price}&changePercent=${data.changePercent}`, { headers: { Authorization: `Bearer ${token}`, "X-Pro-Token": proToken ?? "" } }))
                .then((r) => r.json())
                .then((res: { explanation?: string; error?: string }) => {
                  if (res.error || !res.explanation) setExplainStatus("error");
                  else { setExplanation(res.explanation); setExplainStatus("idle"); }
                })
                .catch(() => setExplainStatus("error"));
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Why is this moving today? →
          </button>
        )}
      </div>
    </div>
  );
}

export default function StockSearch() {
  const [input, setInput] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteState>({ status: "idle" });
  const [dataFallback, setDataFallback] = useState(false);
  const [range, setRange] = useState<Range>("1d");
  const [chart, setChart] = useState<ChartState>({ status: "idle" });

  // Compare state
  const [showCompare, setShowCompare] = useState(false);
  const [compareInput, setCompareInput] = useState("");
  const [compareTicker, setCompareTicker] = useState<string | null>(null);
  const [compareChart, setCompareChart] = useState<ChartState>({ status: "idle" });

  // Silent auto-refresh every 30 seconds when a ticker is selected
  useEffect(() => {
    if (!ticker) return;
    const interval = setInterval(() => {
      fetch(`/api/quote?ticker=${ticker}`)
        .then((r) => r.json())
        .then((data: QuoteData & { error?: string }) => {
          if (!data.error) setQuote({ status: "ok", data });
        })
        .catch(() => {});
    }, getRefreshInterval(30_000));
    return () => clearInterval(interval);
  }, [ticker]);

  function loadChart(sym: string, r: Range) {
    setChart({ status: "loading" });
    fetch(`/api/history?ticker=${sym}&range=${r}`)
      .then((res) => res.json())
      .then((data: { data?: HistoryPoint[]; error?: string }) => {
        if (data.error || !data.data) setChart({ status: "error" });
        else setChart({ status: "ok", data: data.data });
      })
      .catch(() => setChart({ status: "error" }));
  }

  function loadCompareChart(sym: string, r: Range) {
    setCompareChart({ status: "loading" });
    fetch(`/api/history?ticker=${sym}&range=${r}`)
      .then((res) => res.json())
      .then((data: { data?: HistoryPoint[]; error?: string }) => {
        if (data.error || !data.data) setCompareChart({ status: "error" });
        else setCompareChart({ status: "ok", data: data.data });
      })
      .catch(() => setCompareChart({ status: "error" }));
  }

  function clearCompare() {
    setShowCompare(false);
    setCompareInput("");
    setCompareTicker(null);
    setCompareChart({ status: "idle" });
  }

  function handleSelect(sym: string) {
    setTicker(sym);
    setRange("1d");
    setQuote({ status: "loading" });
    setChart({ status: "loading" });
    clearCompare();

    fetch(`/api/quote?ticker=${sym}`)
      .then((r) => r.json())
      .then((data: QuoteData & { error?: string; fallback?: boolean }) => {
        if (data.error) {
          setDataFallback(data.fallback === true);
          setQuote({ status: "error" });
        } else {
          setDataFallback(false);
          setQuote({ status: "ok", data });
        }
      })
      .catch(() => setQuote({ status: "error" }));

    loadChart(sym, "1d");
  }

  function handleRangeChange(r: Range) {
    if (!ticker) return;
    setRange(r);
    loadChart(ticker, r);
    if (compareTicker) loadCompareChart(compareTicker, r);
  }

  function handleCompareSelect(sym: string) {
    setCompareTicker(sym);
    loadCompareChart(sym, range);
  }

  function clear() {
    setTicker(null);
    setInput("");
    setQuote({ status: "idle" });
    setChart({ status: "idle" });
    clearCompare();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <div className="flex-1 max-w-sm">
          <TickerAutocomplete
            value={input}
            onChange={(v) => {
              setInput(v);
              if (ticker && v !== ticker) {
                setTicker(null);
                setQuote({ status: "idle" });
                setChart({ status: "idle" });
              }
            }}
            onSelect={handleSelect}
            placeholder="Search stocks, ETFs, or crypto…"
          />
        </div>
        {ticker && (
          <button
            onClick={clear}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {quote.status === "loading" && (
        <div className="rounded-lg border border-zinc-800 p-5 animate-pulse flex flex-col gap-3">
          <div className="h-4 w-32 bg-zinc-800 rounded" />
          <div className="h-9 w-36 bg-zinc-800 rounded" />
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-48 bg-zinc-800 rounded mt-2" />
        </div>
      )}

      {quote.status === "ok" && (
        <QuoteDetail
          data={quote.data}
          chart={chart}
          range={range}
          onRangeChange={handleRangeChange}
          showCompare={showCompare}
          onToggleCompare={() => setShowCompare(true)}
          compareInput={compareInput}
          onCompareInputChange={setCompareInput}
          compareTicker={compareTicker}
          onCompareSelect={handleCompareSelect}
          compareChart={compareChart}
          onClearCompare={clearCompare}
        />
      )}

      {dataFallback && <FallbackBanner />}

      {quote.status === "error" && (
        <div className="rounded-lg border border-zinc-800 px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">Could not load data for {ticker}.</span>
          <button
            onClick={() => {
              if (!ticker) return;
              setQuote({ status: "loading" });
              fetch(`/api/quote?ticker=${ticker}`)
                .then((r) => r.json())
                .then((data: QuoteData & { error?: string }) => {
                  if (data.error) setQuote({ status: "error" });
                  else setQuote({ status: "ok", data });
                })
                .catch(() => setQuote({ status: "error" }));
              loadChart(ticker, range);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
