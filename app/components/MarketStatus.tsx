"use client";

import { useEffect, useState } from "react";

type Status = "pre" | "open" | "after" | "closed";

function getStatus(): Status {
  const et = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();
  if (day === 0 || day === 6) return "closed";
  if (mins < 4 * 60) return "closed";
  if (mins < 9 * 60 + 30) return "pre";
  if (mins < 16 * 60) return "open";
  if (mins < 20 * 60) return "after";
  return "closed";
}

const CONFIG: Record<Status, { label: string; dot: string; text: string }> = {
  open:   { label: "Market Open",   dot: "bg-emerald-400", text: "text-emerald-400" },
  pre:    { label: "Pre-Market",    dot: "bg-amber-400",   text: "text-amber-400"  },
  after:  { label: "After Hours",   dot: "bg-amber-400",   text: "text-amber-400"  },
  closed: { label: "Market Closed", dot: "bg-zinc-600",    text: "text-zinc-500"   },
};

export default function MarketStatus() {
  const [status, setStatus] = useState<Status>("closed");

  useEffect(() => {
    setStatus(getStatus());
    const id = setInterval(() => setStatus(getStatus()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { label, dot, text } = CONFIG[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === "open" ? "animate-pulse" : ""}`} />
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  );
}
