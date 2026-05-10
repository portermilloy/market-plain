"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "watchlist";
const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "VOO"];

interface EarningsEntry {
  symbol: string;
  name: string | null;
  earningsDate: string;
  daysAway: number;
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DaysBadge({ days }: { days: number }) {
  if (days < 0) return null;
  if (days === 0)
    return (
      <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
        Today
      </span>
    );
  if (days <= 7)
    return (
      <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
        {days}d
      </span>
    );
  return (
    <span className="text-xs text-zinc-500">{days}d</span>
  );
}

export default function EarningsCalendar() {
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const tickers: string[] = stored ? JSON.parse(stored) : DEFAULT_TICKERS;
    if (tickers.length === 0) {
      setLoading(false);
      return;
    }

    let remaining = tickers.length;
    const results: EarningsEntry[] = [];

    tickers.forEach((ticker) => {
      fetch(`/api/quote?ticker=${ticker}`)
        .then((r) => r.json())
        .then((data: { symbol: string; name: string | null; earningsDate: string | null; error?: string }) => {
          if (!data.error && data.earningsDate) {
            const days = daysUntil(data.earningsDate);
            if (days >= -1 && days <= 90) {
              results.push({
                symbol: data.symbol,
                name: data.name,
                earningsDate: data.earningsDate,
                daysAway: days,
              });
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          remaining--;
          if (remaining === 0) {
            results.sort((a, b) => a.daysAway - b.daysAway);
            setEntries(results);
            setLoading(false);
          }
        });
    });
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 p-4 animate-pulse">
        <div className="h-4 w-36 bg-zinc-800 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
          Earnings Calendar
        </h2>
        <p className="text-xs text-zinc-600">No upcoming earnings found for your watchlist.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Earnings Calendar
        </h2>
      </div>
      <ul className="divide-y divide-zinc-800">
        {entries.map((e) => (
          <li key={e.symbol} className="px-4 py-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">{e.symbol}</span>
              <span className="text-xs text-zinc-500 truncate max-w-[160px]">{e.name ?? "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">{fmtDate(e.earningsDate)}</span>
              <DaysBadge days={e.daysAway} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
