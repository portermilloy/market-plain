import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export type MarketDataError = { error: true; message: string; fallback: true };

export function isDataError(v: unknown): v is MarketDataError {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as MarketDataError).error === true &&
    (v as MarketDataError).fallback === true
  );
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
    return fn();
  }
}

function dataError(message: string): MarketDataError {
  return { error: true, message, fallback: true };
}

export async function getQuote(
  ticker: string
): Promise<Record<string, unknown> | MarketDataError> {
  try {
    const q = await withRetry(
      () => yf.quote(ticker.toUpperCase()) as Promise<Record<string, unknown>>
    );
    return q;
  } catch (err) {
    console.error("[marketData.getQuote]", ticker, err);
    return dataError("Quote data temporarily unavailable");
  }
}

export async function getChart(
  ticker: string,
  period1: Date,
  interval: "5m" | "1h" | "1d"
): Promise<{ quotes: unknown[] } | MarketDataError> {
  try {
    const result = await yf.chart(ticker.toUpperCase(), { period1, interval });
    return result as { quotes: unknown[] };
  } catch (err) {
    console.error("[marketData.getChart]", ticker, err);
    return dataError("Price history temporarily unavailable");
  }
}

export async function searchTickers(
  q: string,
  quotesCount = 8
): Promise<{ quotes: unknown[]; news: unknown[] } | MarketDataError> {
  try {
    const result = await yf.search(q, { quotesCount, newsCount: 0 });
    return result as { quotes: unknown[]; news: unknown[] };
  } catch (err) {
    console.error("[marketData.searchTickers]", q, err);
    return dataError("Search temporarily unavailable");
  }
}

export async function getNews(
  ticker: string
): Promise<{ news: unknown[] } | MarketDataError> {
  try {
    const result = await yf.search(ticker.toUpperCase(), {
      newsCount: 10,
      quotesCount: 0,
    });
    return result as { news: unknown[] };
  } catch (err) {
    console.error("[marketData.getNews]", ticker, err);
    return dataError("News temporarily unavailable");
  }
}

export async function getQuoteSummary(
  ticker: string,
  modules: string[]
): Promise<Record<string, unknown> | MarketDataError> {
  try {
    const result = await yf.quoteSummary(ticker.toUpperCase(), { modules });
    return result as Record<string, unknown>;
  } catch (err) {
    console.error("[marketData.getQuoteSummary]", ticker, err);
    return dataError("Summary data temporarily unavailable");
  }
}
