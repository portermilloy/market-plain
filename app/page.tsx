import Link from "next/link";
import { unstable_cache } from "next/cache";
import YahooFinance from "yahoo-finance2";

const FEATURED = ["AAPL", "NVDA", "TSLA", "MSFT"];

const getFeaturedQuotes = unstable_cache(
  async () => {
    const yf = new YahooFinance();
    const results = await Promise.allSettled(FEATURED.map((t) => yf.quote(t)));
    return results.map((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        const q = r.value as Record<string, unknown>;
        return {
          ticker: FEATURED[i],
          name: (q.shortName as string) ?? FEATURED[i],
          price: (q.regularMarketPrice as number) ?? 0,
          changePercent: (q.regularMarketChangePercent as number) ?? 0,
        };
      }
      return { ticker: FEATURED[i], name: FEATURED[i], price: 0, changePercent: 0 };
    });
  },
  ["landing-featured-quotes"],
  { revalidate: 300 }
);

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    title: "Real-time quotes & charts",
    description: "Search any stock, ETF, or crypto and get live price charts, top movers, and sector heatmaps at a glance.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "AI explanations in plain English",
    description: "One click and Claude explains why a stock is moving, summarizes the day's news, and breaks down your portfolio.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Watchlist with price alerts",
    description: "Track your tickers with auto-refreshing quotes during market hours. Set price alerts and get notified instantly.",
  },
];

export default async function LandingPage() {
  const quotes = await getFeaturedQuotes();

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero */}
      <section className="pt-12 pb-4 flex flex-col items-center text-center gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live market data · AI-powered
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight max-w-3xl leading-tight">
          The stock market,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            explained plainly
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
          Market Plain turns raw market data into clear, actionable information — real-time quotes, AI explanations, portfolio tracking, and price alerts all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-white text-zinc-950 px-6 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Get Started — it&apos;s free
          </Link>
          <Link
            href="/upgrade"
            className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            See Pro features
          </Link>
        </div>
      </section>

      {/* Live preview mockup */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="ml-3 text-xs text-zinc-600 font-mono">marketplain.app/dashboard</span>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Watchlist</p>
              <p className="text-xs text-zinc-500">Live prices · updates every 60s</p>
            </div>
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
          <div className="rounded-lg border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
            {quotes.map((q) => {
              const up = q.changePercent >= 0;
              const priceStr = q.price > 0 ? `$${q.price.toFixed(2)}` : "—";
              const pctStr = q.price > 0
                ? `${up ? "+" : ""}${q.changePercent.toFixed(2)}%`
                : "—";
              return (
                <div key={q.ticker} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{q.ticker}</p>
                    <p className="text-xs text-zinc-500">{q.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{priceStr}</p>
                    <p className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>{pctStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-600 text-center">Prices refresh every 5 minutes · delayed up to 15 min outside market hours</p>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold text-white text-center">Everything you need to follow the market</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-6 flex flex-col gap-3">
              <span className="text-emerald-400">{f.icon}</span>
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pro CTA */}
      <section className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Ready for the full picture?</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Pro unlocks unlimited watchlist slots, AI explanations on every ticker, and one-click news summaries.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            href="/dashboard"
            className="rounded-lg bg-white text-zinc-950 px-5 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Open Dashboard
          </Link>
          <Link
            href="/upgrade"
            className="rounded-lg border border-zinc-600 px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-400 transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      </section>
    </div>
  );
}
