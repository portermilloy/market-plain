"use client";

import { useState } from "react";
import Link from "next/link";
import ArticlePanel from "./components/ArticlePanel";
import CryptoWidget from "./components/CryptoWidget";
import EarningsCalendar from "./components/EarningsCalendar";
import ErrorBoundary from "./components/ErrorBoundary";
import NewsSection, { type ArticleInfo } from "./components/NewsSection";
import OnboardingOverlay from "./components/OnboardingOverlay";
import Portfolio from "./components/Portfolio";
import SectorHeatmap from "./components/SectorHeatmap";
import StockSearch from "./components/StockSearch";
import TopMovers from "./components/TopMovers";
import Watchlist from "./components/Watchlist";
import { useIsPro } from "./context/ProContext";

export default function Home() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleInfo | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const isPro = useIsPro();

  return (
    <div className="flex flex-col gap-6">
      <OnboardingOverlay />
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

      <ErrorBoundary>
        <StockSearch />
      </ErrorBoundary>

      <ErrorBoundary>
        <TopMovers />
      </ErrorBoundary>

      <ErrorBoundary>
        <SectorHeatmap />
      </ErrorBoundary>

      <ErrorBoundary>
        <EarningsCalendar />
      </ErrorBoundary>

      <ErrorBoundary>
        <CryptoWidget />
      </ErrorBoundary>

      <div className={`grid gap-6 items-start grid-cols-1 ${selectedTicker ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        <ErrorBoundary>
          <Portfolio />
        </ErrorBoundary>
        <ErrorBoundary>
          <Watchlist onSelect={setSelectedTicker} />
        </ErrorBoundary>
        {selectedTicker && (
          <ErrorBoundary>
            <NewsSection
              ticker={selectedTicker}
              onArticleClick={setSelectedArticle}
            />
          </ErrorBoundary>
        )}
      </div>

      <ErrorBoundary>
        <ArticlePanel
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      </ErrorBoundary>
    </div>
  );
}
