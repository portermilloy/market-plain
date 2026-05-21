"use client";

import { useEffect, useState } from "react";
import { getRefreshInterval } from "../lib/marketHours";

const SECTORS = [
  { name: "Technology", ticker: "XLK" },
  { name: "Financials", ticker: "XLF" },
  { name: "Healthcare", ticker: "XLV" },
  { name: "Consumer Disc.", ticker: "XLY" },
  { name: "Industrials", ticker: "XLI" },
  { name: "Energy", ticker: "XLE" },
  { name: "Staples", ticker: "XLP" },
  { name: "Utilities", ticker: "XLU" },
  { name: "Real Estate", ticker: "XLRE" },
  { name: "Materials", ticker: "XLB" },
  { name: "Comm. Services", ticker: "XLC" },
];

interface SectorData {
  ticker: string;
  name: string;
  changePercent: number | null;
  status: "loading" | "ok" | "error";
}

function tileColor(pct: number | null, status: string): string {
  if (status !== "ok" || pct === null) return "bg-zinc-800/60";
  if (pct >= 2) return "bg-emerald-900/80 border-emerald-800/40";
  if (pct >= 1) return "bg-emerald-900/50 border-emerald-900/30";
  if (pct >= 0) return "bg-emerald-900/20 border-zinc-800";
  if (pct >= -1) return "bg-red-900/20 border-zinc-800";
  if (pct >= -2) return "bg-red-900/50 border-red-900/30";
  return "bg-red-900/80 border-red-800/40";
}

function pctColor(pct: number | null, status: string): string {
  if (status !== "ok" || pct === null) return "text-zinc-600";
  return pct >= 0 ? "text-emerald-400" : "text-red-400";
}

export default function SectorHeatmap() {
  const [sectors, setSectors] = useState<SectorData[]>(
    SECTORS.map((s) => ({ ...s, changePercent: null, status: "loading" as const }))
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  function fetchAll() {
    SECTORS.forEach(({ ticker }) => {
      fetch(`/api/quote?ticker=${ticker}`)
        .then((r) => r.json())
        .then((data: { changePercent?: number | null; error?: string }) => {
          setSectors((prev) =>
            prev.map((s) =>
              s.ticker === ticker
                ? {
                    ...s,
                    changePercent: data.error ? null : (data.changePercent ?? null),
                    status: data.error ? ("error" as const) : ("ok" as const),
                  }
                : s
            )
          );
        })
        .catch(() =>
          setSectors((prev) =>
            prev.map((s) =>
              s.ticker === ticker ? { ...s, status: "error" as const } : s
            )
          )
        );
    });
    setLastUpdated(new Date());
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, getRefreshInterval(60_000));
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-lg border border-zinc-800 px-4 py-3">
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
        Sector Performance
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5">
        {sectors.map((s) => (
          <div
            key={s.ticker}
            className={`rounded border px-2 py-2 flex flex-col gap-0.5 ${tileColor(s.changePercent, s.status)}`}
          >
            <span className="text-xs text-zinc-300 leading-tight truncate">{s.name}</span>
            <span className={`text-xs font-semibold ${pctColor(s.changePercent, s.status)}`}>
              {s.status === "loading"
                ? "…"
                : s.status === "error" || s.changePercent === null
                ? "—"
                : `${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`}
            </span>
          </div>
        ))}
      </div>
      {lastUpdated && (
        <p className="mt-2 text-right text-xs text-zinc-600">
          Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
