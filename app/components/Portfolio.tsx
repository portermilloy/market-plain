"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import TickerAutocomplete from "./TickerAutocomplete";

const STORAGE_KEY = "portfolio";
const HISTORY_KEY = "portfolio_history";
const MAX_HISTORY = 90;

interface Position {
  ticker: string;
  shares: number;
}

interface QuoteData {
  symbol: string;
  name: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

interface PortfolioSnapshot {
  date: string;
  value: number;
}

type QuoteState =
  | { status: "loading" }
  | { status: "ok"; data: QuoteData }
  | { status: "error" };

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function isCrypto(ticker: string): boolean {
  return ticker.toUpperCase().endsWith("-USD");
}

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#ec4899",
  "#10b981", "#8b5cf6", "#f97316", "#14b8a6",
];

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>({});
  const [tickerInput, setTickerInput] = useState("");
  const [sharesInput, setSharesInput] = useState("");
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "error">("idle");
  const sharesRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsPro(localStorage.getItem("isPro") === "true");
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setPositions(parsed.map((p: { ticker: string; shares: number }) => ({ ticker: p.ticker, shares: p.shares })));
    }
    const hist = localStorage.getItem(HISTORY_KEY);
    if (hist) setPortfolioHistory(JSON.parse(hist));
  }, []);

  useEffect(() => {
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    tickers.forEach((t) => {
      if (fetchedRef.current.has(t)) return;
      fetchedRef.current.add(t);
      setQuotes((prev) => ({ ...prev, [t]: { status: "loading" } }));
      fetch(`/api/quote?ticker=${t}`)
        .then((r) => r.json())
        .then((data: QuoteData & { error?: string }) => {
          if (data.error) setQuotes((prev) => ({ ...prev, [t]: { status: "error" } }));
          else setQuotes((prev) => ({ ...prev, [t]: { status: "ok", data } }));
        })
        .catch(() => setQuotes((prev) => ({ ...prev, [t]: { status: "error" } })));
    });
  }, [positions]);

  useEffect(() => {
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    if (tickers.length === 0) return;
    const interval = setInterval(() => {
      tickers.forEach((t) => {
        fetch(`/api/quote?ticker=${t}`)
          .then((r) => r.json())
          .then((data: QuoteData & { error?: string }) => {
            if (!data.error) setQuotes((prev) => ({ ...prev, [t]: { status: "ok", data } }));
          })
          .catch(() => {});
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [positions]);

  function persist(next: Position[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPositions(next);
  }

  function addPosition() {
    const sym = tickerInput.trim().toUpperCase();
    const shares = parseFloat(sharesInput);
    if (!sym || isNaN(shares) || shares <= 0 || shares > 1_000_000) return;
    persist([...positions, { ticker: sym, shares }]);
    setTickerInput("");
    setSharesInput("");
  }

  function removePosition(index: number) {
    const removed = positions[index];
    const next = positions.filter((_, i) => i !== index);
    persist(next);
    if (!next.some((p) => p.ticker === removed.ticker)) {
      fetchedRef.current.delete(removed.ticker);
      setQuotes((prev) => {
        const copy = { ...prev };
        delete copy[removed.ticker];
        return copy;
      });
    }
  }

  function retryQuote(ticker: string) {
    fetchedRef.current.delete(ticker);
    setQuotes((prev) => ({ ...prev, [ticker]: { status: "loading" } }));
    fetch(`/api/quote?ticker=${ticker}`)
      .then((r) => r.json())
      .then((data: QuoteData & { error?: string }) => {
        fetchedRef.current.add(ticker);
        if (data.error) setQuotes((prev) => ({ ...prev, [ticker]: { status: "error" } }));
        else setQuotes((prev) => ({ ...prev, [ticker]: { status: "ok", data } }));
      })
      .catch(() => setQuotes((prev) => ({ ...prev, [ticker]: { status: "error" } })));
  }

  function exportCSV() {
    const rows: string[][] = [["Ticker", "Type", "Amount", "Price", "Value", "Change $", "Change %"]];
    const uniqueTickers = [...new Set(positions.map((p) => p.ticker))];
    uniqueTickers.forEach((ticker) => {
      const totalShares = positions.filter((p) => p.ticker === ticker).reduce((s, p) => s + p.shares, 0);
      const q = quotes[ticker];
      const price = q?.status === "ok" ? String(q.data.price ?? "") : "";
      const value = q?.status === "ok" && q.data.price ? (totalShares * q.data.price).toFixed(2) : "";
      const change = q?.status === "ok" && q.data.change ? (totalShares * q.data.change).toFixed(2) : "";
      const changePct = q?.status === "ok" ? (q.data.changePercent?.toFixed(2) ?? "") : "";
      rows.push([ticker, isCrypto(ticker) ? "Crypto" : "Stock", String(totalShares), price, value, change, changePct]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allLoaded = positions.every(
    (p) => quotes[p.ticker]?.status === "ok" || quotes[p.ticker]?.status === "error"
  );

  const totalValue = positions.reduce((s, p) => {
    const q = quotes[p.ticker];
    const price = q?.status === "ok" ? (q.data.price ?? 0) : 0;
    return s + p.shares * price;
  }, 0);

  const todayChange = positions.reduce((s, p) => {
    const q = quotes[p.ticker];
    if (q?.status === "ok" && q.data.change !== null) return s + p.shares * q.data.change;
    return s;
  }, 0);
  const todayChangePct = totalValue > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0;

  // Stocks / crypto split
  const indexedPositions = positions.map((pos, i) => ({ pos, i }));
  const stockGroup = indexedPositions.filter(({ pos }) => !isCrypto(pos.ticker));
  const cryptoGroup = indexedPositions.filter(({ pos }) => isCrypto(pos.ticker));
  const hasBoth = stockGroup.length > 0 && cryptoGroup.length > 0;

  function groupValue(group: { pos: Position }[]): number {
    return group.reduce((s, { pos }) => {
      const q = quotes[pos.ticker];
      return s + (q?.status === "ok" && q.data.price ? pos.shares * q.data.price : 0);
    }, 0);
  }
  const stocksValue = groupValue(stockGroup);
  const cryptoValue = groupValue(cryptoGroup);

  function handlePortfolioSummary() {
    const positionInputs = positions
      .map((p) => {
        const q = quotes[p.ticker];
        if (q?.status !== "ok" || q.data.price === null) return null;
        return {
          ticker: p.ticker,
          shares: p.shares,
          price: q.data.price,
          change: q.data.change ?? 0,
          changePercent: q.data.changePercent ?? 0,
          value: p.shares * q.data.price,
        };
      })
      .filter(Boolean);
    if (positionInputs.length === 0) return;
    setSummaryStatus("loading");
    fetch("/api/portfolio-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-client": "market-plain" },
      body: JSON.stringify({ positions: positionInputs, totalValue, totalChange: todayChange, totalChangePct: todayChangePct }),
    })
      .then((r) => r.json())
      .then((data: { summary?: string; error?: string }) => {
        if (data.error || !data.summary) setSummaryStatus("error");
        else { setSummary(data.summary); setSummaryStatus("idle"); }
      })
      .catch(() => setSummaryStatus("error"));
  }

  useEffect(() => {
    if (!allLoaded || positions.length === 0 || totalValue === 0) return;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    setPortfolioHistory((prev) => {
      if (prev.some((p) => p.date === today)) return prev;
      const next = [...prev, { date: today, value: totalValue }]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, [allLoaded, totalValue, positions.length]);

  const allocationMap = new Map<string, number>();
  for (const pos of positions) {
    const q = quotes[pos.ticker];
    const price = q?.status === "ok" ? (q.data.price ?? 0) : 0;
    allocationMap.set(pos.ticker, (allocationMap.get(pos.ticker) ?? 0) + pos.shares * price);
  }
  const allocation = [...allocationMap.entries()].map(([ticker, value], i) => ({
    ticker,
    value,
    pctOfTotal: totalValue > 0 ? (value / totalValue) * 100 : 0,
    color: COLORS[i % COLORS.length],
  }));

  function renderPositionRow({ pos, i }: { pos: Position; i: number }) {
    const q = quotes[pos.ticker];
    const crypto = isCrypto(pos.ticker);
    const unit = crypto ? "coins" : "shares";

    if (!q || q.status === "loading") {
      return (
        <li key={i} className="px-4 py-3 animate-pulse">
          <div className="flex justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-12 bg-zinc-800 rounded" />
              <div className="h-3 w-16 bg-zinc-800 rounded" />
            </div>
            <div className="h-4 w-20 bg-zinc-800 rounded" />
          </div>
        </li>
      );
    }

    if (q.status === "error") {
      return (
        <li key={i} className="px-4 py-3 flex items-center justify-between group">
          <span className="text-sm font-semibold text-white">{pos.ticker}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => retryQuote(pos.ticker)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => removePosition(i)}
              className="text-zinc-600 hover:text-red-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={`Remove ${pos.ticker}`}
            >
              ✕
            </button>
          </div>
        </li>
      );
    }

    const currentValue = q.data.price !== null ? pos.shares * q.data.price : null;
    const posChange = q.data.change !== null ? pos.shares * q.data.change : null;
    const cp = q.data.changePercent;
    const positive = posChange !== null && posChange >= 0;
    const changeColor = posChange === null ? "text-zinc-500" : positive ? "text-emerald-400" : "text-red-400";
    const sign = positive ? "+" : "";

    return (
      <li key={i} className="px-4 py-3 flex items-center justify-between group">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">{pos.ticker}</span>
          <span className="text-xs text-zinc-500">{pos.shares} {unit}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-sm font-medium text-white">
              {currentValue !== null ? currency(currentValue) : "—"}
            </span>
            <span className={`text-xs font-medium ${changeColor} text-right`}>
              {posChange !== null && cp !== null ? (
                <>
                  <span className="hidden sm:inline">{sign}{currency(posChange)} </span>
                  ({sign}{cp.toFixed(2)}%)
                </>
              ) : "—"}
            </span>
          </div>
          <button
            onClick={() => removePosition(i)}
            className="text-zinc-600 hover:text-red-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Remove ${pos.ticker}`}
          >
            ✕
          </button>
        </div>
      </li>
    );
  }

  function renderSectionHeader(label: string, value: number) {
    return (
      <li className="px-4 py-2 bg-zinc-900/60 flex items-center justify-between border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        {value > 0 && totalValue > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-400">{currency(value)}</span>
            <span className="text-zinc-600">{((value / totalValue) * 100).toFixed(1)}%</span>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {positions.length > 0 && (
        <div className="rounded-lg border border-zinc-800 px-5 py-4">
          {allLoaded ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Total portfolio value</p>
                  <p className="text-3xl font-semibold text-white tracking-tight">
                    {currency(totalValue)}
                  </p>
                  <p className={`mt-1.5 text-sm font-medium ${todayChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {todayChange >= 0 ? "+" : ""}{currency(todayChange)}{" "}
                    <span className="text-xs">({todayChange >= 0 ? "+" : ""}{todayChangePct.toFixed(2)}%) today</span>
                  </p>
                  {hasBoth && (
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Stocks{" "}
                      <span className="text-zinc-300">{((stocksValue / totalValue) * 100).toFixed(1)}%</span>
                      {" · "}
                      Crypto{" "}
                      <span className="text-zinc-300">{((cryptoValue / totalValue) * 100).toFixed(1)}%</span>
                    </p>
                  )}
                </div>

                <PieChart width={100} height={100}>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    innerRadius={32}
                    outerRadius={48}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {allocation.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, fontSize: 12 }}
                    itemStyle={{ color: "#e4e4e7" }}
                    formatter={(_: number, __: string, entry: { payload?: { ticker: string; pctOfTotal: number } }) => [
                      `${entry.payload?.pctOfTotal.toFixed(1)}%`,
                      entry.payload?.ticker ?? "",
                    ]}
                    labelFormatter={() => ""}
                  />
                </PieChart>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {allocation.map((entry) => (
                  <div key={entry.ticker} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs text-zinc-400">{entry.ticker}</span>
                    <span className="text-xs text-zinc-600">{entry.pctOfTotal.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800">
                {!isPro ? (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>Portfolio summary — Pro feature</span>
                  </div>
                ) : summary ? (
                  <div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{summary}</p>
                    <button onClick={() => setSummary(null)} className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Clear</button>
                  </div>
                ) : summaryStatus === "loading" ? (
                  <p className="text-xs text-zinc-500 animate-pulse">Summarizing portfolio…</p>
                ) : summaryStatus === "error" ? (
                  <p className="text-xs text-zinc-500">Could not generate summary.</p>
                ) : (
                  <button
                    onClick={handlePortfolioSummary}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    What's happening with my portfolio today? →
                  </button>
                )}
              </div>

              {portfolioHistory.length >= 2 && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-600 mb-1.5">Portfolio value over time</p>
                  <ResponsiveContainer width="100%" height={56}>
                    <AreaChart data={portfolioHistory} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, fontSize: 11 }}
                        itemStyle={{ color: "#e4e4e7" }}
                        formatter={(v: number) => [currency(v), "Value"]}
                        labelFormatter={(l: string) => new Date(l).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.15}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="animate-pulse flex flex-col gap-2">
              <div className="h-3 w-32 bg-zinc-800 rounded" />
              <div className="h-8 w-40 bg-zinc-800 rounded" />
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-zinc-800">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Portfolio
          </h2>
          {positions.length > 0 && allLoaded && (
            <button
              onClick={exportCSV}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>

        <ul className="divide-y divide-zinc-800">
          {positions.length === 0 && (
            <li className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-500">No positions yet</p>
              <p className="text-xs text-zinc-600 mt-1">Add a ticker, ETF, or crypto below to track your holdings</p>
            </li>
          )}

          {/* Stocks section */}
          {stockGroup.length > 0 && (
            <>
              {hasBoth && renderSectionHeader("Stocks", stocksValue)}
              {stockGroup.map((item) => renderPositionRow(item))}
            </>
          )}

          {/* Crypto section */}
          {cryptoGroup.length > 0 && (
            <>
              {hasBoth && renderSectionHeader("Crypto", cryptoValue)}
              {cryptoGroup.map((item) => renderPositionRow(item))}
            </>
          )}
        </ul>

        <div className="px-4 py-3 border-t border-zinc-800 flex flex-col gap-2">
          <div className="flex gap-2">
            <TickerAutocomplete
              value={tickerInput}
              onChange={setTickerInput}
              onSelect={(sym) => {
                setTickerInput(sym);
                sharesRef.current?.focus();
              }}
              placeholder="Ticker or crypto…"
              className="w-36"
            />
            <input
              ref={sharesRef}
              value={sharesInput}
              onChange={(e) => setSharesInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPosition()}
              placeholder={isCrypto(tickerInput) ? "Coins" : "Shares"}
              type="number"
              min="0.001"
              max="1000000"
              step="any"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={addPosition}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
