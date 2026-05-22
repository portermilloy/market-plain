"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRefreshInterval } from "../lib/marketHours";
import {
  Area,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COINS = [
  { symbol: "BTC-USD",  name: "Bitcoin",   abbr: "BTC",  color: "#f7931a" },
  { symbol: "ETH-USD",  name: "Ethereum",  abbr: "ETH",  color: "#627eea" },
  { symbol: "BNB-USD",  name: "BNB",       abbr: "BNB",  color: "#f3ba2f" },
  { symbol: "SOL-USD",  name: "Solana",    abbr: "SOL",  color: "#9945ff" },
  { symbol: "XRP-USD",  name: "XRP",       abbr: "XRP",  color: "#00aae4" },
  { symbol: "DOGE-USD", name: "Dogecoin",  abbr: "DOGE", color: "#c2a633" },
  { symbol: "ADA-USD",  name: "Cardano",   abbr: "ADA",  color: "#4a90d9" },
  { symbol: "AVAX-USD", name: "Avalanche", abbr: "AVAX", color: "#e84142" },
  { symbol: "LINK-USD", name: "Chainlink", abbr: "LINK", color: "#2a5ada" },
  { symbol: "DOT-USD",  name: "Polkadot",  abbr: "DOT",  color: "#e6007a" },
] as const;

type Range = "1d" | "7d" | "30d" | "90d" | "180d" | "1y";
type FetchRange = "7d" | "30d" | "90d" | "180d" | "1y";

const RANGE_LABELS: Record<Range, string> = {
  "1d": "24H", "7d": "1W", "30d": "1M", "90d": "3M", "180d": "6M", "1y": "1Y",
};

const ALL_RANGES: Range[] = ["1d", "7d", "30d", "90d", "180d", "1y"];

function toFetchRange(r: Range): FetchRange {
  return r === "1d" ? "7d" : r;
}

interface QuoteData {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  name: string | null;
}

interface HistoryPoint {
  date: string;
  close: number;
}

type QuoteState =
  | { status: "loading" }
  | { status: "ok"; data: QuoteData }
  | { status: "error" };

function fmtPrice(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(5)}`;
}

function fmtChange(n: number | null): string {
  if (n === null) return "—";
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (abs >= 1000)
    return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toFixed(5)}`;
}

function fmtCap(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function changePctFromHistory(data: HistoryPoint[]): number | null {
  if (data.length < 2) return null;
  const start = data[0].close;
  const end = data[data.length - 1].close;
  return ((end - start) / start) * 100;
}

function changeDollarFromHistory(data: HistoryPoint[]): number | null {
  if (data.length < 2) return null;
  return data[data.length - 1].close - data[0].close;
}

function xTickFormatter(dateStr: string, range: Range): string {
  const isHourly = dateStr.includes("T");
  const d = new Date(dateStr);
  if (isHourly) {
    if (range === "1d")
      return d.toLocaleString("en-US", { hour: "numeric", timeZone: "America/New_York" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  if (range === "1y" || range === "180d")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function tooltipLabelFmt(dateStr: string): string {
  const isHourly = dateStr.includes("T");
  const d = new Date(dateStr);
  if (isHourly)
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      timeZone: "America/New_York",
    });
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ExpandedChart({ data, color, range }: { data: HistoryPoint[]; color: string; range: Range }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => xTickFormatter(d, range)}
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          tickCount={6}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => fmtPrice(v)}
          orientation="right"
        />
        <Tooltip
          cursor={{ stroke: "#52525b", strokeWidth: 1 }}
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, fontSize: 12 }}
          itemStyle={{ color: "#e4e4e7" }}
          labelStyle={{ color: "#71717a" }}
          formatter={(v: unknown) => [fmtPrice(v as number), "Price"]}
          labelFormatter={(label: unknown) => tooltipLabelFmt(label as string)}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          fill={color}
          fillOpacity={0.12}
          dot={false}
          activeDot={{ r: 3, fill: color }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function CryptoPage() {
  const [expandedCoin, setExpandedCoin] = useState<string | null>(null);
  const [expandedRanges, setExpandedRanges] = useState<Record<string, Range>>({});
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>(
    Object.fromEntries(COINS.map((c) => [c.symbol, { status: "loading" as const }]))
  );
  const [historyCache, setHistoryCache] = useState<
    Partial<Record<FetchRange, Record<string, HistoryPoint[]>>>
  >({});
  const fetchedRanges = useRef<Set<FetchRange>>(new Set());

  const loadHistory = useCallback((fr: FetchRange) => {
    if (fetchedRanges.current.has(fr)) return;
    fetchedRanges.current.add(fr);

    const results: Record<string, HistoryPoint[]> = {};
    let remaining = COINS.length;

    COINS.forEach(({ symbol }) => {
      fetch(`/api/history?ticker=${symbol}&range=${fr}`)
        .then((r) => r.json())
        .then((res: { data?: HistoryPoint[]; error?: string }) => {
          if (!res.error && res.data) results[symbol] = res.data;
        })
        .catch(() => {})
        .finally(() => {
          remaining--;
          if (remaining === 0) setHistoryCache((p) => ({ ...p, [fr]: results }));
        });
    });
  }, []);

  // Quotes on mount + auto-refresh every 60s
  useEffect(() => {
    function loadQuotes() {
      COINS.forEach(({ symbol }) => {
        fetch(`/api/quote?ticker=${symbol}`)
          .then((r) => r.json())
          .then((data: QuoteData & { error?: string }) => {
            if (data.error) setQuotes((p) => ({ ...p, [symbol]: { status: "error" } }));
            else setQuotes((p) => ({ ...p, [symbol]: { status: "ok", data } }));
          })
          .catch(() => setQuotes((p) => ({ ...p, [symbol]: { status: "error" } })));
      });
    }
    loadQuotes();
    const id = setInterval(loadQuotes, getRefreshInterval(60_000));
    return () => clearInterval(id);
  }, []);

  // Pre-fetch 7d on mount for sparklines
  useEffect(() => {
    loadHistory("7d");
  }, [loadHistory]);

  function handleExpand(symbol: string) {
    if (expandedCoin === symbol) {
      setExpandedCoin(null);
    } else {
      setExpandedCoin(symbol);
      loadHistory(toFetchRange(expandedRanges[symbol] ?? "7d"));
    }
  }

  function handleRangeChange(symbol: string, r: Range) {
    setExpandedRanges((p) => ({ ...p, [symbol]: r }));
    loadHistory(toFetchRange(r));
  }

  function getHistory(symbol: string, range: Range): HistoryPoint[] | null {
    const fr = toFetchRange(range);
    const data = historyCache[fr]?.[symbol];
    if (!data) return null;
    return range === "1d" ? data.slice(-24) : data;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Crypto</h1>
        <p className="mt-1 text-sm text-zinc-400">Top coins, live prices. Click a row to open the chart.</p>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        {/* Column headers */}
        <div
          className="grid items-center px-4 py-2 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider [grid-template-columns:2rem_1fr_6rem_7.5rem] sm:[grid-template-columns:2rem_1fr_5.5rem_6rem_7.5rem] md:[grid-template-columns:2rem_1fr_5.5rem_6rem_7.5rem_7rem]"
        >
          <span className="text-right">#</span>
          <span className="pl-2">Coin</span>
          <span className="text-right hidden sm:block pr-4">Mkt Cap</span>
          <span className="text-right pr-4">Price</span>
          <span className="text-right">24H Change</span>
          <span className="text-right hidden md:block pl-6">7D</span>
        </div>

        {COINS.map((coin, i) => {
          const state = quotes[coin.symbol];
          const dailyChange = state?.status === "ok" ? state.data.change : null;
          const dailyChangePct = state?.status === "ok" ? state.data.changePercent : null;
          const dailyPositive = dailyChange !== null && dailyChange >= 0;
          const dailyChangeColor = dailyChange === null ? "text-zinc-500" : dailyPositive ? "text-emerald-400" : "text-red-400";
          const dailyChartColor = dailyPositive ? "#34d399" : "#f87171";

          const isExpanded = expandedCoin === coin.symbol;
          const coinRange = expandedRanges[coin.symbol] ?? "7d";
          const expandedHistData = getHistory(coin.symbol, coinRange);

          const expandedDollarChange = coinRange === "1d"
            ? dailyChange
            : expandedHistData ? changeDollarFromHistory(expandedHistData) : null;
          const expandedChangePct = coinRange === "1d"
            ? dailyChangePct
            : expandedHistData ? changePctFromHistory(expandedHistData) : null;
          const expandedPositive = expandedDollarChange !== null && expandedDollarChange >= 0;
          const expandedChangeColor = expandedDollarChange === null ? "text-zinc-500" : expandedPositive ? "text-emerald-400" : "text-red-400";
          const expandedChartColor = expandedPositive ? "#34d399" : "#f87171";

          const sparkData = getHistory(coin.symbol, "7d");

          return (
            <div key={coin.symbol} className="border-b border-zinc-800 last:border-b-0">
              {/* Table row */}
              <div
                className="grid items-center px-4 py-3 hover:bg-zinc-900/60 transition-colors cursor-pointer [grid-template-columns:2rem_1fr_6rem_7.5rem] sm:[grid-template-columns:2rem_1fr_5.5rem_6rem_7.5rem] md:[grid-template-columns:2rem_1fr_5.5rem_6rem_7.5rem_7rem]"
                onClick={() => handleExpand(coin.symbol)}
              >
                <span className="text-xs text-zinc-600 text-right">{i + 1}</span>

                <div className="flex items-center gap-2.5 pl-2 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: coin.color + "22", color: coin.color }}
                  >
                    {coin.abbr.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white leading-tight">{coin.abbr}</span>
                      <Chevron open={isExpanded} />
                    </div>
                    <div className="text-xs text-zinc-500 truncate">{coin.name}</div>
                  </div>
                </div>

                <span className="text-xs text-zinc-400 text-right hidden sm:block pr-4">
                  {state?.status === "loading" ? (
                    <span className="inline-block h-3 w-14 bg-zinc-800 rounded animate-pulse" />
                  ) : state?.status === "ok" ? fmtCap(state.data.marketCap) : "—"}
                </span>

                <span className="text-sm font-medium text-white text-right pr-4">
                  {state?.status === "loading" ? (
                    <span className="inline-block h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                  ) : state?.status === "ok" ? fmtPrice(state.data.price) : "—"}
                </span>

                {/* 24H dollar + percent */}
                <div className={`text-right ${dailyChangeColor}`}>
                  {state?.status === "loading" ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-block h-3.5 w-16 bg-zinc-800 rounded animate-pulse" />
                      <span className="inline-block h-3 w-12 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-sm font-medium">{fmtChange(dailyChange)}</span>
                      <span className="text-xs opacity-75">{fmtPct(dailyChangePct)}</span>
                    </div>
                  )}
                </div>

                {/* 7D sparkline */}
                <div className="hidden md:flex justify-end pl-6">
                  {sparkData && sparkData.length > 1 ? (
                    <ComposedChart width={80} height={36} data={sparkData}>
                      <YAxis domain={["dataMin", "dataMax"]} hide />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke={dailyChartColor}
                        fill={dailyChartColor}
                        fillOpacity={0.15}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  ) : (
                    <div className="h-9 w-20 bg-zinc-800 rounded animate-pulse" />
                  )}
                </div>
              </div>

              {/* Expanded chart */}
              {isExpanded && (
                <div className="px-4 pt-3 pb-5 bg-zinc-900 border-t border-zinc-800">
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    {/* Dollar + percent change for selected range */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`text-xl font-semibold ${expandedChangeColor}`}>
                        {fmtChange(expandedDollarChange)}
                      </span>
                      <span className={`text-sm ${expandedChangeColor}`}>
                        ({fmtPct(expandedChangePct)})
                      </span>
                      <span className="text-xs text-zinc-500">
                        past {RANGE_LABELS[coinRange]}
                      </span>
                    </div>

                    {/* Per-coin range tabs */}
                    <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
                      {ALL_RANGES.map((r) => (
                        <button
                          key={r}
                          onClick={(e) => { e.stopPropagation(); handleRangeChange(coin.symbol, r); }}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            coinRange === r
                              ? "bg-zinc-600 text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {RANGE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {expandedHistData && expandedHistData.length > 1 ? (
                    <ExpandedChart
                      data={expandedHistData}
                      color={expandedChartColor}
                      range={coinRange}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 text-xs text-zinc-500 animate-pulse">
                      Loading chart…
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
