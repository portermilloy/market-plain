"use client";

import { unstable_catchError as catchError, type ErrorInfo } from "next/error";

function ErrorFallback(_props: Record<string, never>, { unstable_retry }: ErrorInfo) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800 px-4 py-6 flex flex-col items-center gap-3">
      <p className="text-sm text-zinc-400">This section failed to load.</p>
      <button
        onClick={() => unstable_retry()}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export default catchError(ErrorFallback);
