import Link from "next/link";

const FEATURES = [
  { title: "Unlimited watchlist", description: "Track as many tickers as you want." },
  { title: "AI stock explanations", description: "Plain English breakdown of why a stock is moving." },
  { title: "News summaries", description: "One-click summary of the day's headlines for any ticker." },
];

export default function UpgradePage() {
  return (
    <div className="max-w-lg mx-auto py-16 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Upgrade to Pro</h1>
        <p className="mt-2 text-zinc-400">
          Everything in the free plan, plus the tools that actually move the needle.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-lg border border-zinc-800 px-5 py-4">
            <p className="text-sm font-medium text-white">{f.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{f.description}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-6 text-center">
        <p className="text-sm font-medium text-white mb-1">Payments coming soon</p>
        <p className="text-xs text-zinc-500">
          Stripe integration is in progress. Check back shortly.
        </p>
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
