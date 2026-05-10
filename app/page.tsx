"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ArticlePanel from "./components/ArticlePanel";
import EarningsCalendar from "./components/EarningsCalendar";
import NewsSection, { type ArticleInfo } from "./components/NewsSection";
import Portfolio from "./components/Portfolio";
import SectorHeatmap from "./components/SectorHeatmap";
import StockSearch from "./components/StockSearch";
import TopMovers from "./components/TopMovers";
import Watchlist from "./components/Watchlist";

export default function Home() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleInfo | null>(null);
  const [isPro, setIsPro] = useState(true); // default true to avoid flash
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setIsPro(localStorage.getItem("isPro") === "true");
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {!isPro && !bannerDismissed && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 flex items-start justify-between gap-4">
          <div>
            <Link href="/upgrade" className="text-sm font-medium text-white hover:text-zinc-300 transition-colors mb-1 inline-block">
              Upgrade to Pro →
            </Link>
            <p className="text-xs text-zinc-400">
              Unlock unlimited watchlist · AI explanations on every stock · One-click news summaries
            </p>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 text-lg leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          The market, explained in plain English.
        </p>
      </div>

      <StockSearch />

      <TopMovers />

      <SectorHeatmap />

      <EarningsCalendar />

      <div className={`grid gap-6 items-start grid-cols-1 ${selectedTicker ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        <Portfolio />
        <Watchlist onSelect={setSelectedTicker} />
        {selectedTicker && (
          <NewsSection
            ticker={selectedTicker}
            onArticleClick={setSelectedArticle}
          />
        )}
      </div>

      <ArticlePanel
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
}
