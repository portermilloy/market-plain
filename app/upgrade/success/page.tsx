"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProContext } from "@/app/context/ProContext";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setIsPro, setProToken } = useProContext();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("No session ID found. If you completed payment, please contact support.");
      return;
    }

    fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setProToken(data.token);
          setIsPro(true);
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          setStatus("error");
          setErrorMsg(data.error ?? "Could not verify your payment. Please try again or contact support.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Network error while verifying payment. Please refresh or contact support.");
      });
  }, [searchParams, setIsPro, setProToken, router]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-zinc-300 text-sm">Verifying your payment…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-indigo-400">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-lg">You&apos;re now Pro</p>
          <p className="mt-1 text-zinc-400 text-sm">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-red-400">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-white font-semibold">Something went wrong</p>
        <p className="mt-1 text-zinc-400 text-sm max-w-sm">{errorMsg}</p>
      </div>
      <button
        onClick={() => router.push("/upgrade")}
        className="mt-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← Back to upgrade page
      </button>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="max-w-sm mx-auto py-24 flex items-center justify-center">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-zinc-300 text-sm">Loading…</p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
