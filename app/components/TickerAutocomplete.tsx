"use client";

import { useEffect, useRef, useState } from "react";

const HISTORY_KEY = "search-history";
const MAX_HISTORY = 5;

interface SearchResult {
  symbol: string;
  name: string | null;
  type: string;
}

interface HistoryEntry {
  symbol: string;
  name: string | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search ticker…",
  className,
  inputRef: externalRef,
}: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [focused, setFocused] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef ?? internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      setNotFound(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((data: { results: SearchResult[] }) => {
          setResults(data.results);
          setNotFound(data.results.length === 0);
          setOpen(data.results.length > 0);
          setHighlighted(0);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // History dropdown shows when focused, input is empty, and there's history
  const showHistory = focused && !value.trim() && history.length > 0;
  // +1 accounts for the "Clear history" button at the bottom
  const activeLength = showHistory ? history.length + 1 : results.length;

  function saveToHistory(entry: { symbol: string; name: string | null }) {
    const next = [
      { symbol: entry.symbol, name: entry.name },
      ...history.filter((h) => h.symbol !== entry.symbol),
    ].slice(0, MAX_HISTORY);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    setHighlighted(0);
  }

  function select(r: SearchResult) {
    saveToHistory(r);
    onChange(r.symbol);
    onSelect(r.symbol);
    setOpen(false);
    setFocused(false);
    setResults([]);
    setNotFound(false);
  }

  function selectFromHistory(entry: HistoryEntry) {
    saveToHistory(entry);
    onChange(entry.symbol);
    onSelect(entry.symbol);
    setFocused(false);
    setHighlighted(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && !showHistory) return;
      setHighlighted((h) => Math.min(h + 1, activeLength - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showHistory) {
        if (highlighted === history.length) clearHistory();
        else if (history[highlighted]) selectFromHistory(history[highlighted]);
      } else {
        const target = open && results[highlighted] ? results[highlighted] : results[0];
        if (target) select(target);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setFocused(false);
    }
  }

  const invalid = notFound && value.trim().length > 0;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setFocused(true);
          setHighlighted(0);
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`w-full bg-zinc-900 border rounded px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors ${
          invalid
            ? "border-red-800 focus:border-red-700"
            : "border-zinc-700 focus:border-zinc-500"
        }`}
      />
      {invalid && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-red-600">
          Not found
        </span>
      )}

      {/* Search results */}
      {open && !showHistory && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((r, i) => (
            <li
              key={r.symbol}
              onMouseDown={(e) => { e.preventDefault(); select(r); }}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
                i === highlighted ? "bg-zinc-800" : "hover:bg-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{r.symbol}</span>
                {r.type === "CRYPTOCURRENCY" && (
                  <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded leading-none">
                    CRYPTO
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500 truncate ml-3 max-w-[200px]">{r.name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Search history */}
      {showHistory && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <li className="px-3 pt-2 pb-1">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">Recent</span>
          </li>
          {history.map((entry, i) => (
            <li
              key={entry.symbol}
              onMouseDown={(e) => { e.preventDefault(); selectFromHistory(entry); }}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
                i === highlighted ? "bg-zinc-800" : "hover:bg-zinc-800"
              }`}
            >
              <span className="text-sm font-semibold text-white">{entry.symbol}</span>
              <span className="text-xs text-zinc-500 truncate ml-3 max-w-[200px]">{entry.name ?? "—"}</span>
            </li>
          ))}
          <li
            onMouseDown={(e) => { e.preventDefault(); clearHistory(); }}
            className={`px-3 py-2 cursor-pointer border-t border-zinc-800 ${
              highlighted === history.length ? "bg-zinc-800" : "hover:bg-zinc-800"
            }`}
          >
            <span className="text-xs text-zinc-500">Clear history</span>
          </li>
        </ul>
      )}
    </div>
  );
}
