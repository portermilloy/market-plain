import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken } from "@/app/lib/authToken";
import { isValidProToken } from "@/app/lib/proToken";
import { checkRateLimit, getIp } from "@/app/lib/rateLimit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = "You are a concise financial analyst. When given a company's recent quarterly earnings data (EPS estimates vs actuals, revenue), write 3-4 sentences of plain English explaining what the results show and what they mean for the company. Mention whether they beat or missed estimates, any notable trends across quarters, and what it might signal going forward. Never use bullet points or headers — plain prose only.";

interface EarningsQuarter {
  period: string;
  reportedDate: string | null;
  epsEstimate: number;
  epsActual: number | null;
  epsDifference: number | null;
  surprisePercent: number | null;
  revenue: number | null;
}

function fmtRev(n: number, currency: string): string {
  const sym = currency === "USD" ? "$" : `${currency} `;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(1)}M`;
  return `${sym}${n.toFixed(0)}`;
}

export async function POST(request: Request) {
  let body: { ticker?: string; quarters?: EarningsQuarter[]; currency?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ticker, quarters, currency = "USD" } = body;

  if (!ticker || !Array.isArray(quarters) || quarters.length === 0) {
    return Response.json(
      { error: "ticker and a non-empty quarters array are required" },
      { status: 400 }
    );
  }

  if (!await verifyAuthToken(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isValidProToken(request.headers.get("x-pro-token"))) {
    return Response.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const { allowed, remaining } = await checkRateLimit(getIp(request));
  if (!allowed) {
    return Response.json(
      { error: "Too many requests, please try again later" },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  const quartersText = quarters
    .map((q) => {
      const dateLabel = q.reportedDate
        ? ` (reported ${new Date(q.reportedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })})`
        : "";
      const epsPart =
        q.epsActual != null
          ? `EPS: $${q.epsActual.toFixed(2)} actual vs $${q.epsEstimate.toFixed(2)} estimate` +
            (q.epsDifference != null
              ? `, ${q.epsDifference >= 0 ? "beat" : "missed"} by $${Math.abs(q.epsDifference).toFixed(2)}` +
                (q.surprisePercent != null ? ` (${q.surprisePercent.toFixed(1)}% surprise)` : "")
              : "")
          : `EPS estimate: $${q.epsEstimate.toFixed(2)} (not yet reported)`;
      const revPart =
        q.revenue != null ? `, Revenue: ${fmtRev(q.revenue, currency)}` : "";
      return `${q.period}${dateLabel}: ${epsPart}${revPart}`;
    })
    .join("\n");

  try {
    const response = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Here is the quarterly earnings data for ${ticker}:\n\n${quartersText}`,
          },
        ],
      },
      { headers: { "anthropic-beta": "prompt-caching-2024-07-31" } }
    );

    const block = response.content.find((b) => b.type === "text");
    const explanation = block?.type === "text" ? block.text : null;

    if (!explanation) {
      return Response.json({ error: "No response from model" }, { status: 502 });
    }

    return Response.json(
      { explanation },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (err) {
    console.error("[/api/earnings-explain]", err);
    return Response.json({ error: "Failed to generate explanation" }, { status: 502 });
  }
}
