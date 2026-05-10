"use client";

import { type ArticleInfo } from "./NewsSection";

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

export default function ArticlePanel({
  article,
  onClose,
}: {
  article: ArticleInfo | null;
  onClose: () => void;
}) {
  const visible = article !== null;

  return (
    <>
      {visible && (
        <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-40 flex flex-col transition-transform duration-300 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Article
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-lg leading-none"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {article && (
          <div className="flex-1 p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-base font-semibold text-white leading-snug">
                {article.title}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{article.source}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-xs text-zinc-500">
                  {timeAgo(article.publishedAt)}
                </span>
              </div>
            </div>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
            >
              Read on {article.source}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 10L10 2M10 2H5M10 2V7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>

            <p className="text-xs text-zinc-600">
              Add an Anthropic API key to get AI summaries in plain English.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
