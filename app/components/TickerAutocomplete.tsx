"use client";

import { useEffect, useRef, useState } from "react";

interface SearchResult {
  symbol: string;
  name: string | null;
  type: string;
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
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef ?? internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(r: SearchResult) {
    onChange(r.symbol);
    onSelect(r.symbol);
    setOpen(false);
    setResults([]);
    setNotFound(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && results.length) setOpen(true);
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = open && results[highlighted] ? results[highlighted] : results[0];
      if (target) select(target);
    } else if (e.key === "Escape") {
      setOpen(false);
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
        onFocus={() => results.length > 0 && setOpen(true)}
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
      {open && (
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
    </div>
  );
}
