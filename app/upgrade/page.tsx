"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const FEATURES = [
  {
    title: "Unlimited watchlist",
    description: "Track as many tickers as you want — free plan is capped at 5.",
  },
  {
    title: "AI stock explanations",
    description: "Plain-English breakdown of why any stock or crypto is moving today.",
  },
  {
    title: "AI news summaries",
    description: "One-click summary of the day's headlines for any ticker.",
  },
  {
    title: "AI earnings analysis",
    description: "Plain-English explanation of quarterly earnings beats and misses.",
  },
  {
    title: "AI portfolio summary",
    description: "Cross-portfolio analysis of what's driving your gains and losses.",
  },
];

function CanceledBanner() {
  const searchParams = useSearchParams();
  if (!searchParams.get("canceled")) return null;
  return (
    <p className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3">
      Payment was canceled — you haven&apos;t been charged.
    </p>
  );
}

function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-3 px-5 transition-colors"
      >
        {loading ? "Redirecting to checkout…" : "Upgrade to Pro — $7.99 / month"}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <p className="text-xs text-zinc-600 text-center">
        Secured by Stripe · Cancel anytime
      </p>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <div className="max-w-lg mx-auto py-16 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Upgrade to Pro</h1>
        <p className="mt-2 text-zinc-400">
          Everything in the free plan, plus the tools that actually move the needle.
        </p>
      </div>

      <Suspense fallback={null}>
        <CanceledBanner />
      </Suspense>

      <ul className="flex flex-col gap-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex items-start gap-3 rounded-lg border border-zinc-800 px-5 py-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-sm font-medium text-white">{f.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{f.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-6 flex flex-col gap-4">
        <div className="text-center">
          <p className="text-3xl font-semibold text-white">$7.99</p>
          <p className="text-sm text-zinc-500">per month · cancel anytime</p>
        </div>
        <Suspense fallback={
          <button disabled className="w-full rounded-lg bg-indigo-600 opacity-60 text-white text-sm font-medium py-3 px-5">
            Upgrade to Pro — $7.99 / month
          </button>
        }>
          <UpgradeButton />
        </Suspense>
      </div>

      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors text-center"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
