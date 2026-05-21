"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { generateAuthToken } from "../lib/authToken";
import { getRefreshInterval } from "../lib/marketHours";
import { useIsPro, useProToken } from "../context/ProContext";
import {
  Area,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TickerAutocomplete from "./TickerAutocomplete";

const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "VOO"];
const STORAGE_KEY = "watchlist";
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

type QuoteState =
  | { status: "loading" }
  | { status: "ok"; data: QuoteData }
  | { status: "error" };

interface HistoryPoint {
  date: string;
  close: number;
  volume?: number;
  session?: "regular" | "extended";
}

type HistoryState =
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

function fmt(n: number | null, decimals = 2) {
  if (n === null) return "—";
  return n.toFixed(decimals);
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

function earningsSoon(iso: string | null): boolean {
  if (!iso) return false;
  const days = (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= -2 && days <= 7;
}

function fetchQuote(
  ticker: string,
  setQuotes: React.Dispatch<React.SetStateAction<Record<string, QuoteState>>>
) {
  fetch(`/api/quote?ticker=${ticker}`)
    .then((r) => r.json())
    .then((data: QuoteData & { error?: string }) => {
      if (data.error) {
        setQuotes((prev) => ({ ...prev, [ticker]: { status: "error" } }));
      } else {
        setQuotes((prev) => ({ ...prev, [ticker]: { status: "ok", data } }));
      }
    })
    .catch(() => {
      setQuotes((prev) => ({ ...prev, [ticker]: { status: "error" } }));
    });
}

function fetchHistory(
  ticker: string,
  setHistory: React.Dispatch<React.SetStateAction<Record<string, HistoryState>>>
) {
  fetch(`/api/history?ticker=${ticker}&range=7d`)
    .then((r) => r.json())
    .then((res: { data?: HistoryPoint[]; error?: string }) => {
      if (res.error || !res.data) {
        setHistory((prev) => ({ ...prev, [ticker]: { status: "error" } }));
      } else {
        setHistory((prev) => ({
          ...prev,
          [ticker]: { status: "ok", data: res.data! },
        }));
      }
    })
    .catch(() => {
      setHistory((prev) => ({ ...prev, [ticker]: { status: "error" } }));
    });
}

function fetchEarnings(
  ticker: string,
  setEarnings: React.Dispatch<React.SetStateAction<Record<string, EarningsState>>>
) {
  fetch(`/api/earnings?ticker=${ticker}`)
    .then((r) => r.json())
    .then((res: { quarters?: EarningsQuarter[]; currency?: string; error?: string }) => {
      if (res.error || !res.quarters) {
        setEarnings((prev) => ({ ...prev, [ticker]: { status: "unavailable" } }));
      } else {
        setEarnings((prev) => ({
          ...prev,
          [ticker]: { status: "ok", data: { quarters: res.quarters!, currency: res.currency ?? "USD" } },
        }));
      }
    })
    .catch(() => {
      setEarnings((prev) => ({ ...prev, [ticker]: { status: "error" } }));
    });
}

function Sparkline({ data, color }: { data: HistoryPoint[]; color: string }) {
  return (
    <ComposedChart width={80} height={32} data={data}>
      <YAxis domain={["dataMin", "dataMax"]} hide />
      <Area
        type="monotone"
        dataKey="close"
        stroke={color}
        fill={color}
        fillOpacity={0.15}
        dot={false}
        activeDot={false}
        isAnimationActive={false}
      />
    </ComposedChart>
  );
}

function ExpandedChart({
  data,
  color,
  range,
}: {
  data: HistoryPoint[];
  color: string;
  range: string;
}) {
  const intraday = range === "1d" || range === "7d";

  const chartData =
    range === "1d"
      ? data.map((d, i) => {
          const isReg = d.session === "regular";
          const prevIsReg = i > 0 ? data[i - 1].session === "regular" : isReg;
          const nextIsReg =
            i < data.length - 1 ? data[i + 1].session === "regular" : isReg;
          const isBoundary = isReg !== prevIsReg || isReg !== nextIsReg;
          return {
            date: d.date,
            regular: isReg || isBoundary ? d.close : undefined,
            extended: !isReg || isBoundary ? d.close : undefined,
            volume: d.volume,
          };
        })
      : data;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          yAxisId="price"
          domain={["auto", "auto"]}
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
        />
        <YAxis yAxisId="volume" orientation="right" hide />
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
          formatter={(v: number, name: string) => {
            if (name === "volume")
              return [
                v >= 1e6
                  ? `${(v / 1e6).toFixed(1)}M`
                  : v >= 1e3
                  ? `${(v / 1e3).toFixed(0)}K`
                  : v.toString(),
                "Volume",
              ];
            return [
              `$${v.toFixed(2)}`,
              name === "extended" ? "After Hours" : "Price",
            ];
          }}
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
        {/* Volume bars */}
        <Bar
          yAxisId="volume"
          dataKey="volume"
          fill={color}
          fillOpacity={0.25}
          isAnimationActive={false}
          radius={[1, 1, 0, 0]}
        />
        {range === "1d" ? (
          <>
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="extended"
              stroke="#71717a"
              fill="#71717a"
              fillOpacity={0.08}
              strokeDasharray="3 3"
              activeDot={false}
              dot={false}
              connectNulls={false}
            />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="regular"
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              activeDot={false}
              dot={false}
              connectNulls={false}
            />
          </>
        ) : (
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            activeDot={false}
            dot={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function Watchlist({
  onSelect,
}: {
  onSelect?: (ticker: string | null) => void;
}) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>({});
  const [history, setHistory] = useState<Record<string, HistoryState>>({});
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [expandedRange, setExpandedRange] = useState<Range>("1d");
  const [expandedChartData, setExpandedChartData] = useState<HistoryState>({
    status: "loading",
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isPro = useIsPro();
  const proToken = useProToken();
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainStatuses, setExplainStatuses] = useState<Record<string, "idle" | "loading" | "error">>({});
  const [limitError, setLimitError] = useState(false);
  const [earningsData, setEarningsData] = useState<Record<string, EarningsState>>({});
  const [earningsExplanations, setEarningsExplanations] = useState<Record<string, string>>({});
  const [earningsExplainStatuses, setEarningsExplainStatuses] = useState<Record<string, "idle" | "loading" | "error">>({});
  const [alerts, setAlerts] = useState<Record<string, { price: number; direction: "above" | "below" }>>({});
  const alertsRef = useRef(alerts);
  const [popoverTicker, setPopoverTicker] = useState<string | null>(null);
  const [alertInputs, setAlertInputs] = useState<Record<string, { price: string; direction: "above" | "below" }>>({});
  const [toasts, setToasts] = useState<{ id: number; ticker: string; currentPrice: number; targetPrice: number; direction: "above" | "below" }[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const list: string[] = stored ? JSON.parse(stored) : DEFAULT_TICKERS;
    setTickers(list);
  }, []);

  useEffect(() => {
    if (tickers.length === 0) return;
    setQuotes(
      Object.fromEntries(tickers.map((t) => [t, { status: "loading" as const }]))
    );
    setHistory(
      Object.fromEntries(tickers.map((t) => [t, { status: "loading" as const }]))
    );
    tickers.forEach((ticker) => {
      fetchQuote(ticker, setQuotes);
      fetchHistory(ticker, setHistory);
    });
  }, [tickers]);

  // Silent auto-refresh every 60 seconds
  useEffect(() => {
    if (tickers.length === 0) return;
    const interval = setInterval(() => {
      tickers.forEach((ticker) => fetchQuote(ticker, setQuotes));
    }, getRefreshInterval(60_000));
    return () => clearInterval(interval);
  }, [tickers]);

  // Keep alertsRef in sync so the quotes effect below avoids stale closure
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  // Load saved alerts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("watchlist-alerts");
    if (stored) {
      try { setAlerts(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  // Check for triggered alerts whenever quotes update
  useEffect(() => {
    if (Object.keys(quotes).length === 0) return;
    const currentAlerts = alertsRef.current;
    const triggered: { ticker: string; currentPrice: number; targetPrice: number; direction: "above" | "below" }[] = [];

    for (const [ticker, alert] of Object.entries(currentAlerts)) {
      const qs = quotes[ticker];
      if (qs?.status !== "ok" || qs.data.price === null) continue;
      const p = qs.data.price;
      if (
        (alert.direction === "above" && p >= alert.price) ||
        (alert.direction === "below" && p <= alert.price)
      ) {
        triggered.push({ ticker, currentPrice: p, targetPrice: alert.price, direction: alert.direction });
      }
    }

    if (triggered.length === 0) return;

    triggered.forEach(({ ticker, currentPrice, targetPrice, direction }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, ticker, currentPrice, targetPrice, direction }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`${ticker} alert triggered`, {
          body: `${ticker} hit $${currentPrice.toFixed(2)} — ${direction} $${targetPrice.toFixed(2)} target reached`,
        });
      }

      setAlerts((prev) => {
        const next = { ...prev };
        delete next[ticker];
        localStorage.setItem("watchlist-alerts", JSON.stringify(next));
        return next;
      });
    });
  }, [quotes]); // intentionally watches quotes only; alertsRef avoids stale closure

  function persist(next: string[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTickers(next);
  }

  function addTicker(symbol: string) {
    if (!symbol || tickers.includes(symbol)) {
      setInput("");
      return;
    }
    if (!isPro && tickers.length >= 5) {
      setLimitError(true);
      return;
    }
    setLimitError(false);
    setQuotes((prev) => ({ ...prev, [symbol]: { status: "loading" } }));
    setHistory((prev) => ({ ...prev, [symbol]: { status: "loading" } }));
    fetchQuote(symbol, setQuotes);
    fetchHistory(symbol, setHistory);
    persist([...tickers, symbol]);
    setInput("");
    inputRef.current?.focus();
  }

  function removeTicker(ticker: string) {
    if (expandedTicker === ticker) setExpandedTicker(null);
    persist(tickers.filter((t) => t !== ticker));
    setQuotes((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setHistory((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setExplanations((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setExplainStatuses((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setEarningsData((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setEarningsExplanations((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setEarningsExplainStatuses((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setAlerts((prev) => {
      const next = { ...prev };
      delete next[ticker];
      localStorage.setItem("watchlist-alerts", JSON.stringify(next));
      return next;
    });
  }

  function persistAlerts(next: Record<string, { price: number; direction: "above" | "below" }>) {
    localStorage.setItem("watchlist-alerts", JSON.stringify(next));
    setAlerts(next);
  }

  function setAlert(ticker: string, price: number, direction: "above" | "below") {
    persistAlerts({ ...alerts, [ticker]: { price, direction } });
  }

  function clearAlert(ticker: string) {
    const next = { ...alerts };
    delete next[ticker];
    persistAlerts(next);
  }

  function openAlertPopover(e: React.MouseEvent, ticker: string, currentPrice: number | null) {
    e.stopPropagation();
    if (popoverTicker === ticker) {
      setPopoverTicker(null);
      return;
    }
    const existing = alerts[ticker];
    setAlertInputs((prev) => ({
      ...prev,
      [ticker]: {
        price: existing ? existing.price.toString() : currentPrice ? currentPrice.toFixed(2) : "",
        direction: existing?.direction ?? "above",
      },
    }));
    setPopoverTicker(ticker);
  }

  function toggleExpanded(ticker: string) {
    if (expandedTicker === ticker) {
      setExpandedTicker(null);
      onSelect?.(null);
    } else {
      setExpandedTicker(ticker);
      setExpandedRange("1d");
      setExpandedChartData({ status: "loading" });
      fetch(`/api/history?ticker=${ticker}&range=1d`)
        .then((r) => r.json())
        .then((res: { data?: HistoryPoint[]; error?: string }) => {
          if (res.error || !res.data) setExpandedChartData({ status: "error" });
          else setExpandedChartData({ status: "ok", data: res.data });
        })
        .catch(() => setExpandedChartData({ status: "error" }));
      const es = earningsData[ticker];
      if (!es || es.status === "error") {
        setEarningsData((prev) => ({ ...prev, [ticker]: { status: "loading" } }));
        fetchEarnings(ticker, setEarningsData);
      }
      onSelect?.(ticker);
    }
  }

  function selectRange(range: Range) {
    if (!expandedTicker) return;
    setExpandedRange(range);
    if (range === "7d" && history[expandedTicker]?.status === "ok") {
      setExpandedChartData(history[expandedTicker]);
      return;
    }
    setExpandedChartData({ status: "loading" });
    fetch(`/api/history?ticker=${expandedTicker}&range=${range}`)
      .then((r) => r.json())
      .then((res: { data?: HistoryPoint[]; error?: string }) => {
        if (res.error || !res.data) setExpandedChartData({ status: "error" });
        else setExpandedChartData({ status: "ok", data: res.data });
      })
      .catch(() => setExpandedChartData({ status: "error" }));
  }

  return (
    <>
    {toasts.length > 0 && (
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 shadow-2xl min-w-[260px]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-3.5 h-3.5 shrink-0 ${t.direction === "above" ? "text-emerald-400" : "text-red-400"}`}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-white">{t.ticker}</span>
              <span className="text-xs text-zinc-400"> hit ${t.currentPrice.toFixed(2)}</span>
              <p className="text-xs text-zinc-500">{t.direction} ${t.targetPrice.toFixed(2)} target reached</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    )}
    <div className="rounded-lg border border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Watchlist
        </h2>
      </div>

      <ul className="divide-y divide-zinc-800">
        {tickers.map((ticker) => {
          const quoteState = quotes[ticker];
          const histState = history[ticker];
          const isExpanded = expandedTicker === ticker;

          if (!quoteState || quoteState.status === "loading") {
            return (
              <li key={ticker} className="px-4 py-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-12 bg-zinc-800 rounded" />
                    <div className="h-3 w-28 bg-zinc-800 rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block h-8 w-20 bg-zinc-800 rounded" />
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="h-4 w-16 bg-zinc-800 rounded" />
                      <div className="h-3 w-12 bg-zinc-800 rounded" />
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (quoteState.status === "error") {
            return (
              <li
                key={ticker}
                className="px-4 py-3 flex items-center justify-between group"
              >
                <span className="text-sm font-medium text-white">{ticker}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setQuotes((prev) => ({ ...prev, [ticker]: { status: "loading" } }));
                      fetchQuote(ticker, setQuotes);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => removeTicker(ticker)}
                    className="text-zinc-600 hover:text-red-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Remove ${ticker}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          }

          const { data } = quoteState;
          const positive =
            data.changePercent !== null && data.changePercent >= 0;
          const changeColor = positive ? "text-emerald-400" : "text-red-400";
          const chartColor = positive ? "#34d399" : "#f87171";
          const sign = positive ? "+" : "";
          const histData =
            histState?.status === "ok" ? histState.data : null;

          const isPre = data.marketState === "PRE" || data.marketState === "PREPRE";
          const isPost =
            data.marketState === "POST" ||
            data.marketState === "POSTPOST" ||
            (data.marketState === "CLOSED" && data.postMarketPrice != null);

          return (
            <li key={ticker} className="divide-y divide-zinc-800">
              <div
                className="px-4 py-3 flex items-center justify-between hover:bg-zinc-900 transition-colors group cursor-pointer"
                onClick={() => toggleExpanded(ticker)}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white">
                      {data.symbol}
                    </span>
                    {earningsSoon(data.earningsDate) && (
                      <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded leading-none">
                        {new Date(data.earningsDate!).getTime() < Date.now() ? "EARNS ✓" : "EARNS"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 truncate max-w-[120px]">
                    {data.name ?? "—"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block">
                    {histData && histData.length > 0 ? (
                      <Sparkline data={histData} color={chartColor} />
                    ) : (
                      <div className="w-20 h-8" />
                    )}
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-white">
                      ${fmt(data.price)}
                    </span>
                    <span className={`text-xs font-medium ${changeColor}`}>
                      {sign}
                      {fmt(data.changePercent)}%
                    </span>
                    {isPre && data.preMarketPrice != null && (
                      <span className="text-xs text-amber-400 mt-0.5">
                        Pre ${fmt(data.preMarketPrice)}{" "}
                        {data.preMarketChange != null &&
                          `${data.preMarketChange >= 0 ? "+" : ""}$${fmt(Math.abs(data.preMarketChange))} `}
                        {data.preMarketChangePercent != null &&
                          `(${data.preMarketChangePercent >= 0 ? "+" : ""}${fmt(data.preMarketChangePercent)}%)`}
                      </span>
                    )}
                    {isPost && data.postMarketPrice != null && (
                      <span className="text-xs text-amber-400 mt-0.5">
                        After ${fmt(data.postMarketPrice)}{" "}
                        {data.postMarketChange != null &&
                          `${data.postMarketChange >= 0 ? "+" : ""}$${fmt(Math.abs(data.postMarketChange))} `}
                        {data.postMarketChangePercent != null &&
                          `(${data.postMarketChangePercent >= 0 ? "+" : ""}${fmt(data.postMarketChangePercent)}%)`}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => openAlertPopover(e, ticker, data.price)}
                    className={`transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${alerts[ticker] ? "text-amber-400" : "text-zinc-600 hover:text-zinc-300"}`}
                    aria-label={`Set alert for ${ticker}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={alerts[ticker] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTicker(ticker);
                    }}
                    className="text-zinc-600 hover:text-red-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Remove ${ticker}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {popoverTicker === ticker && (
                <div
                  className="px-4 py-3 bg-zinc-900 flex flex-wrap items-center gap-2.5 border-zinc-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-zinc-500">Alert when</span>
                  <div className="flex gap-1">
                    {(["above", "below"] as const).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => setAlertInputs((prev) => ({ ...prev, [ticker]: { ...prev[ticker], direction: dir } }))}
                        className={`text-xs px-2 py-1 rounded transition-colors ${alertInputs[ticker]?.direction === dir ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={alertInputs[ticker]?.price ?? ""}
                    onChange={(e) => setAlertInputs((prev) => ({ ...prev, [ticker]: { ...prev[ticker], price: e.target.value } }))}
                    placeholder="price"
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="flex gap-2 ml-auto">
                    {alerts[ticker] && (
                      <button
                        onClick={() => { clearAlert(ticker); setPopoverTicker(null); }}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const input = alertInputs[ticker];
                        if (!input?.price) return;
                        const price = parseFloat(input.price);
                        if (isNaN(price) || price <= 0) return;
                        if (typeof Notification !== "undefined" && Notification.permission === "default") {
                          Notification.requestPermission();
                        }
                        setAlert(ticker, price, input.direction ?? "above");
                        setPopoverTicker(null);
                      }}
                      className="text-xs font-medium text-white bg-zinc-700 hover:bg-zinc-600 transition-colors rounded px-3 py-1"
                    >
                      Set alert
                    </button>
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="px-4 py-4 bg-zinc-900">
                  {/* Stats strip */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-xs">
                    {data.pe != null && (
                      <span className="text-zinc-500">
                        P/E <span className="text-zinc-300">{data.pe.toFixed(1)}</span>
                      </span>
                    )}
                    {data.marketCap != null && (
                      <span className="text-zinc-500">
                        Cap <span className="text-zinc-300">{fmtCap(data.marketCap)}</span>
                      </span>
                    )}
                    {data.high52w != null && data.low52w != null && (
                      <span className="text-zinc-500">
                        52W{" "}
                        <span className="text-zinc-300">
                          ${data.low52w.toFixed(0)}–${data.high52w.toFixed(0)}
                        </span>
                      </span>
                    )}
                    {data.dividendYield != null && data.dividendYield > 0 && (
                      <span className="text-zinc-500">
                        Div <span className="text-zinc-300">{data.dividendYield.toFixed(2)}%</span>
                      </span>
                    )}
                    {data.earningsDate != null && (
                      <span className="text-zinc-500">
                        Earnings{" "}
                        <span className="text-zinc-300">~{fmtDate(data.earningsDate)}</span>
                      </span>
                    )}
                  </div>

                  {/* Range change label */}
                  {expandedChartData.status === "ok" &&
                    expandedChartData.data.length >= 2 &&
                    (() => {
                      const startClose = expandedChartData.data[0].close;
                      const endClose =
                        expandedChartData.data[
                          expandedChartData.data.length - 1
                        ].close;
                      const change = endClose - startClose;
                      const changePct = (change / startClose) * 100;
                      const pos = change >= 0;
                      const s = pos ? "+" : "";
                      const c = pos ? "text-emerald-400" : "text-red-400";
                      return (
                        <div className="flex items-baseline gap-1.5 mb-3">
                          <span className={`text-sm font-semibold ${c}`}>
                            {s}${Math.abs(change).toFixed(2)}
                          </span>
                          <span className={`text-xs ${c}`}>
                            ({s}{changePct.toFixed(2)}%)
                          </span>
                          <span className="text-xs text-zinc-600">
                            past {expandedRange.toUpperCase()}
                          </span>
                        </div>
                      );
                    })()}

                  {/* Range buttons */}
                  <div className="flex gap-1 mb-3">
                    {RANGES.map((r) => (
                      <button
                        key={r}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectRange(r);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          expandedRange === r
                            ? "bg-zinc-700 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {expandedChartData.status === "ok" &&
                  expandedChartData.data.length > 0 ? (
                    <ExpandedChart
                      data={expandedChartData.data}
                      color={chartColor}
                      range={expandedRange}
                    />
                  ) : expandedChartData.status === "loading" ? (
                    <div className="flex items-center justify-center h-40 text-xs text-zinc-500 animate-pulse">
                      Loading chart…
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-xs text-zinc-500">
                      Chart unavailable
                    </div>
                  )}

                  {(() => {
                    const es = earningsData[ticker];
                    if (!es || es.status === "unavailable") return null;
                    if (es.status === "loading") return (
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse mb-2" />
                        <div className="space-y-1.5">
                          {[0,1,2,3].map((i) => <div key={i} className="h-3 w-full bg-zinc-800 rounded animate-pulse" />)}
                        </div>
                      </div>
                    );
                    if (es.status !== "ok") return null;
                    const { quarters, currency } = es.data;
                    return (
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Quarterly Earnings</h3>
                        <div className="divide-y divide-zinc-800/60 mb-3">
                          {[...quarters].reverse().map((q) => {
                            const beat = q.epsDifference != null ? q.epsDifference >= 0 : q.epsActual != null ? q.epsActual >= q.epsEstimate : null;
                            const reportedLabel = q.reportedDate
                              ? new Date(q.reportedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
                              : null;
                            return (
                              <div key={q.period} className="py-2">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-semibold text-zinc-200">{fmtQuarter(q.period)}</span>
                                  {reportedLabel && (
                                    <span className="text-xs text-zinc-500">Reported {reportedLabel}</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                                  {q.epsActual != null ? (
                                    <>
                                      <span className="text-zinc-400">
                                        <span className="font-medium text-white">${q.epsActual.toFixed(2)}</span>
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
                          earningsExplanations[ticker] ? (
                            <p className="text-xs text-zinc-400 leading-relaxed">{earningsExplanations[ticker]}</p>
                          ) : earningsExplainStatuses[ticker] === "loading" ? (
                            <p className="text-xs text-zinc-500 animate-pulse">Analyzing earnings…</p>
                          ) : earningsExplainStatuses[ticker] === "error" ? (
                            <p className="text-xs text-zinc-500">Could not analyze earnings.</p>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEarningsExplainStatuses((prev) => ({ ...prev, [ticker]: "loading" }));
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
                                    if (res.error || !res.explanation) {
                                      setEarningsExplainStatuses((prev) => ({ ...prev, [ticker]: "error" }));
                                    } else {
                                      setEarningsExplanations((prev) => ({ ...prev, [ticker]: res.explanation! }));
                                      setEarningsExplainStatuses((prev) => ({ ...prev, [ticker]: "idle" }));
                                    }
                                  })
                                  .catch(() => setEarningsExplainStatuses((prev) => ({ ...prev, [ticker]: "error" })));
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

                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    {!isPro ? (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span>Explain this move — Pro feature</span>
                      </div>
                    ) : explanations[ticker] ? (
                      <p className="text-xs text-zinc-400 leading-relaxed">{explanations[ticker]}</p>
                    ) : explainStatuses[ticker] === "loading" ? (
                      <p className="text-xs text-zinc-500 animate-pulse">Generating explanation…</p>
                    ) : explainStatuses[ticker] === "error" ? (
                      <p className="text-xs text-zinc-500">Could not generate explanation.</p>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!data.price || data.changePercent === null) return;
                          setExplainStatuses((prev) => ({ ...prev, [ticker]: "loading" }));
                          generateAuthToken().then((token) =>
                          fetch(`/api/explain?ticker=${data.symbol}&price=${data.price}&changePercent=${data.changePercent}`, { headers: { Authorization: `Bearer ${token}`, "X-Pro-Token": proToken ?? "" } }))
                            .then((r) => r.json())
                            .then((res: { explanation?: string; error?: string }) => {
                              if (res.error || !res.explanation) {
                                setExplainStatuses((prev) => ({ ...prev, [ticker]: "error" }));
                              } else {
                                setExplanations((prev) => ({ ...prev, [ticker]: res.explanation! }));
                                setExplainStatuses((prev) => ({ ...prev, [ticker]: "idle" }));
                              }
                            })
                            .catch(() => setExplainStatuses((prev) => ({ ...prev, [ticker]: "error" })));
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        Why is this moving today? →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="px-4 py-3 border-t border-zinc-800 flex flex-col gap-2">
        <TickerAutocomplete
          value={input}
          onChange={(v) => { setInput(v); setLimitError(false); }}
          onSelect={addTicker}
          placeholder="Add ticker or crypto…"
          inputRef={inputRef}
        />
        {limitError && (
          <p className="text-xs text-amber-500">
            Upgrade to Pro for unlimited watchlist.
          </p>
        )}
      </div>
    </div>
    </>
  );
}
