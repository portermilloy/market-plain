"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    n: "01",
    label: "Search any stock, ETF, or crypto",
    detail: "Use the search bar at the top of the page.",
  },
  {
    n: "02",
    label: "Add tickers to your watchlist",
    detail: "They'll refresh automatically during market hours.",
  },
  {
    n: "03",
    label: "Click a ticker for news and AI explanations",
    detail: "Select any row in your watchlist to load recent headlines.",
  },
];

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("onboarding-complete")) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem("onboarding-complete", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-[360px] rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1">
            Market Plain
          </p>
          <h2 className="text-base font-semibold text-white leading-snug">
            Here's how to get started
          </h2>
        </div>

        <ul className="divide-y divide-zinc-800/60">
          {STEPS.map(({ n, label, detail }) => (
            <li key={n} className="flex items-start gap-4 px-5 py-4">
              <span className="text-[11px] font-mono font-medium text-zinc-600 pt-0.5 shrink-0 w-5">
                {n}
              </span>
              <div>
                <p className="text-sm text-zinc-200 font-medium leading-snug">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 py-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={dismiss}
            className="text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-md px-4 py-1.5"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
