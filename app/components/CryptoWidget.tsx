"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TOP_COINS = [
  { symbol: "BTC-USD", name: "Bitcoin",  abbr: "BTC", color: "#f7931a" },
  { symbol: "ETH-USD", name: "Ethereum", abbr: "ETH", color: "#627eea" },
  { symbol: "SOL-USD", name: "Solana",   abbr: "SOL", color: "#9945ff" },
  { symbol: "XRP-USD", name: "XRP",      abbr: "XRP", color: "#00aae4" },
  { symbol: "BNB-USD", name: "BNB",      abbr: "BNB", color: "#f3ba2f" },
];

interface QuoteData {
  price: number | null;
  change: number | null;
  changePercent: number | null;
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
  return `$${n.toFixed(4)}`;
}

function fmtChange(n: number | null): string {
  if (n === null) return "—";
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (abs >= 1000)
    return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toFixed(4)}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function CryptoWidget() {
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>(
    Object.fromEntries(TOP_COINS.map((c) => [c.symbol, { status: "loading" as const }]))
  );

  useEffect(() => {
    function load() {
      TOP_COINS.forEach(({ symbol }) => {
        fetch(`/api/quote?ticker=${symbol}`)
          .then((r) => r.json())
          .then((data: QuoteData & { error?: string }) => {
            if (data.error) setQuotes((p) => ({ ...p, [symbol]: { status: "error" } }));
            else setQuotes((p) => ({ ...p, [symbol]: { status: "ok", data } }));
          })
          .catch(() => setQuotes((p) => ({ ...p, [symbol]: { status: "error" } })));
      });
    }
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-lg border border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Crypto</h2>
        <Link href="/crypto" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          View all →
        </Link>
      </div>

      <ul className="divide-y divide-zinc-800">
        {TOP_COINS.map(({ symbol, name, abbr, color }) => {
          const state = quotes[symbol];
          const pct = state?.status === "ok" ? state.data.changePercent : null;
          const dollar = state?.status === "ok" ? state.data.change : null;
          const positive = pct !== null && pct >= 0;
          const changeColor =
            pct === null ? "text-zinc-500" : positive ? "text-emerald-400" : "text-red-400";

          return (
            <li key={symbol} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: color + "22", color }}
                >
                  {abbr.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white">{abbr}</span>
                  <span className="hidden sm:inline text-xs text-zinc-500 ml-1.5">{name}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm font-medium text-white tabular-nums w-24 text-right">
                  {state?.status === "loading" ? (
                    <span className="inline-block h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                  ) : state?.status === "ok" ? (
                    fmtPrice(state.data.price)
                  ) : "—"}
                </span>
                <div className={`flex flex-col items-end tabular-nums w-20 ${changeColor}`}>
                  {state?.status === "loading" ? (
                    <>
                      <span className="inline-block h-3.5 w-16 bg-zinc-800 rounded animate-pulse mb-1" />
                      <span className="inline-block h-3 w-12 bg-zinc-800 rounded animate-pulse" />
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium leading-tight">{fmtChange(dollar)}</span>
                      <span className="text-xs opacity-75 leading-tight">{fmtPct(pct)}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
