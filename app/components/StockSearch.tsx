"use client";

import { useEffect, useState } from "react";
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

function isPositive(data: QuoteData): boolean {
  const val = data.changePercent ?? data.change;
  return val !== null && val >= 0;
}

function StockChart({
  data,
  color,
  range,
}: {
  data: HistoryPoint[];
  color: string;
  range: Range;
}) {
  const intraday = range === "1d" || range === "7d";
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) =>
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
                })
          }
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
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
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
          formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
          labelFormatter={(label: string) =>
            intraday
              ? new Date(label).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })
              : new Date(label).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })
          }
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          dot={false}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function QuoteDetail({
  data,
  chart,
  range,
  onRangeChange,
  isPro,
}: {
  data: QuoteData;
  chart: ChartState;
  range: Range;
  onRangeChange: (r: Range) => void;
  isPro: boolean;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainStatus, setExplainStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    setExplanation(null);
    setExplainStatus("idle");
  }, [data.symbol]);

  // Daily change — used only for the "X% today" header line
  const dailyPositive = isPositive(data);
  const changeColor = dailyPositive ? "text-emerald-400" : "text-red-400";
  const sign = dailyPositive ? "+" : "";

  const isPre = data.marketState === "PRE" || data.marketState === "PREPRE";
  const isPost =
    data.marketState === "POST" ||
    data.marketState === "POSTPOST" ||
    (data.marketState === "CLOSED" && data.postMarketPrice != null);

  // Range change — drives chart color and the range label
  const rangeChange =
    chart.status === "ok" && chart.data.length >= 2
      ? (() => {
          const start = chart.data[0].close;
          const end = chart.data[chart.data.length - 1].close;
          const diff = end - start;
          const pct = (diff / start) * 100;
          const pos = diff >= 0;
          return { diff, pct, pos };
        })()
      : null;

  // Chart color follows the selected range's performance, not today's daily change
  const chartColor = (rangeChange?.pos ?? dailyPositive) ? "#34d399" : "#f87171";

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
      {rangeChange && (
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

      {/* Range buttons */}
      <div className="flex gap-1 mb-3">
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
      </div>

      {/* Chart */}
      {chart.status === "ok" && chart.data.length > 0 ? (
        <StockChart data={chart.data} color={chartColor} range={range} />
      ) : chart.status === "loading" ? (
        <div className="flex items-center justify-center h-48 text-xs text-zinc-500 animate-pulse">
          Loading chart…
        </div>
      ) : chart.status === "error" ? (
        <div className="flex items-center justify-center h-48 text-xs text-zinc-500">
          Chart unavailable
        </div>
      ) : null}

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
              fetch(`/api/explain?ticker=${data.symbol}&price=${data.price}&changePercent=${data.changePercent}`, { headers: { "x-app-client": "market-plain" } })
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
  const [range, setRange] = useState<Range>("1d");
  const [chart, setChart] = useState<ChartState>({ status: "idle" });
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    setIsPro(localStorage.getItem("isPro") === "true");
  }, []);

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
    }, 30_000);
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

  function handleSelect(sym: string) {
    setTicker(sym);
    setRange("1d");
    setQuote({ status: "loading" });
    setChart({ status: "loading" });

    fetch(`/api/quote?ticker=${sym}`)
      .then((r) => r.json())
      .then((data: QuoteData & { error?: string }) => {
        if (data.error) setQuote({ status: "error" });
        else setQuote({ status: "ok", data });
      })
      .catch(() => setQuote({ status: "error" }));

    loadChart(sym, "1d");
  }

  function handleRangeChange(r: Range) {
    if (!ticker) return;
    setRange(r);
    loadChart(ticker, r);
  }

  function clear() {
    setTicker(null);
    setInput("");
    setQuote({ status: "idle" });
    setChart({ status: "idle" });
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
          isPro={isPro}
        />
      )}

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
