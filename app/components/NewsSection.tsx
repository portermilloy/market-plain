"use client";

import { useEffect, useState } from "react";
import { generateAuthToken } from "../lib/authToken";
import { useIsPro, useProToken } from "../context/ProContext";

interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

type NewsState =
  | { status: "loading" }
  | { status: "ok"; items: NewsItem[] }
  | { status: "error" };

type SummaryStatus = "idle" | "loading" | "error";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface ArticleInfo {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export default function NewsSection({
  ticker,
  onArticleClick,
}: {
  ticker: string;
  onArticleClick?: (article: ArticleInfo) => void;
}) {
  const [state, setState] = useState<NewsState>({ status: "loading" });
  const isPro = useIsPro();
  const proToken = useProToken();
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>("idle");

  useEffect(() => {
    setState({ status: "loading" });
    setSummary(null);
    setSummaryStatus("idle");
    fetch(`/api/news?ticker=${ticker}`)
      .then((r) => r.json())
      .then((data: { news?: NewsItem[]; error?: string }) => {
        if (data.error || !data.news) {
          setState({ status: "error" });
        } else {
          setState({ status: "ok", items: data.news.slice(0, 5) });
        }
      })
      .catch(() => setState({ status: "error" }));
  }, [ticker]);

  function handleSummarize() {
    if (state.status !== "ok") return;
    setSummaryStatus("loading");
    const body = JSON.stringify({ ticker, headlines: state.items.map((i) => i.title) });
    generateAuthToken().then((token) =>
    fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Pro-Token": proToken ?? "" },
      body,
    }))
      .then((r) => r.json())
      .then((data: { summary?: string; error?: string }) => {
        if (data.error || !data.summary) setSummaryStatus("error");
        else { setSummary(data.summary); setSummaryStatus("idle"); }
      })
      .catch(() => setSummaryStatus("error"));
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          News
        </h2>
        <div className="flex items-center gap-3">
          {!isPro ? (
            <div className="flex items-center gap-1 text-xs text-zinc-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Summarize</span>
            </div>
          ) : summaryStatus === "loading" ? (
            <span className="text-xs text-zinc-500 animate-pulse">Summarizing…</span>
          ) : summaryStatus === "error" ? (
            <span className="text-xs text-zinc-500">Failed</span>
          ) : summary ? (
            <button
              onClick={() => { setSummary(null); setSummaryStatus("idle"); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          ) : (
            <button
              onClick={handleSummarize}
              disabled={state.status !== "ok"}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
            >
              Summarize today&apos;s news →
            </button>
          )}
          <span className="text-xs text-zinc-500">{ticker}</span>
        </div>
      </div>

      {summary && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <p className="text-xs text-zinc-400 leading-relaxed">{summary}</p>
        </div>
      )}

      {state.status === "loading" && (
        <ul className="divide-y divide-zinc-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="px-4 py-3 animate-pulse flex flex-col gap-2">
              <div className="h-3.5 bg-zinc-800 rounded w-full" />
              <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-800 rounded w-24 mt-1" />
            </li>
          ))}
        </ul>
      )}

      {state.status === "error" && (
        <p className="px-4 py-6 text-sm text-zinc-500 text-center">
          Failed to load news
        </p>
      )}

      {state.status === "ok" && (
        <ul className="divide-y divide-zinc-800">
          {state.items.map((item, i) => (
            <li key={i}>
              <button
                onClick={() =>
                  onArticleClick
                    ? onArticleClick({
                        title: item.title,
                        url: item.url,
                        source: item.source,
                        publishedAt: item.publishedAt,
                      })
                    : window.open(item.url, "_blank", "noopener,noreferrer")
                }
                className="w-full text-left block px-4 py-3 hover:bg-zinc-900 transition-colors"
              >
                <p className="text-sm text-white leading-snug line-clamp-2">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-zinc-500">{item.source}</span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-xs text-zinc-500">
                    {timeAgo(item.publishedAt)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
