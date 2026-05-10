"use client";

import { useEffect, useState } from "react";

interface Mover {
  symbol: string;
  name: string | null;
  price: number | null;
  changePercent: number | null;
}

type State =
  | { status: "loading" }
  | { status: "ok"; gainers: Mover[]; losers: Mover[] }
  | { status: "error" };

export default function TopMovers() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    fetch("/api/movers")
      .then((r) => r.json())
      .then((data: { gainers: Mover[]; losers: Mover[]; error?: string }) => {
        if (data.error) setState({ status: "error" });
        else setState({ status: "ok", gainers: data.gainers, losers: data.losers });
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "error") return null;

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Top Movers
        </h2>
      </div>

      {state.status === "loading" ? (
        <div className="grid grid-cols-2 divide-x divide-zinc-800">
          {[0, 1].map((col) => (
            <div key={col} className="p-3 flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between animate-pulse">
                  <div className="h-3.5 w-12 bg-zinc-800 rounded" />
                  <div className="h-3.5 w-10 bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-zinc-800">
          {(
            [
              { label: "Gainers", items: state.gainers, color: "text-emerald-400" },
              { label: "Losers", items: state.losers, color: "text-red-400" },
            ] as const
          ).map(({ label, items, color }) => (
            <div key={label}>
              <p className="px-3 pt-2.5 pb-1 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                {label}
              </p>
              <ul>
                {items.map((item) => (
                  <li
                    key={item.symbol}
                    className="flex items-center justify-between px-3 py-1.5"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white leading-tight">
                        {item.symbol}
                      </span>
                      <span className="text-xs text-zinc-600 truncate max-w-[100px]">
                        {item.name}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${color}`}>
                      {item.changePercent != null
                        ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
