import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken } from "@/app/lib/authToken";
import { isValidProToken } from "@/app/lib/proToken";
import { checkRateLimit, getIp } from "@/app/lib/rateLimit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = "You are a concise portfolio analyst. When given a list of stock positions with their current values and today's price changes, write 3-4 sentences of plain English summarizing what's happening across the portfolio today. Focus on the biggest movers, any notable themes, and the overall direction. Never use bullet points or headers — plain prose only.";

interface PositionInput {
  ticker: string;
  shares: number;
  price: number;
  change: number;
  changePercent: number;
  value: number;
}

export async function POST(request: Request) {
  if (!await verifyAuthToken(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isValidProToken(request.headers.get("x-pro-token"))) {
    return Response.json({ error: "Pro subscription required" }, { status: 403 });
  }

  let body: {
    positions?: PositionInput[];
    totalValue?: number;
    totalChange?: number;
    totalChangePct?: number;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { positions, totalValue, totalChange, totalChangePct } = body;

  if (!Array.isArray(positions) || positions.length === 0) {
    return Response.json({ error: "positions array is required" }, { status: 400 });
  }

  const { allowed, remaining } = await checkRateLimit(getIp(request));
  if (!allowed) {
    return Response.json(
      { error: "Too many requests, please try again later" },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  const positionLines = [...positions]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .map(
      (p) =>
        `- ${p.ticker}: ${p.shares} shares at $${p.price.toFixed(2)}, value $${p.value.toFixed(2)} (${p.changePercent >= 0 ? "+" : ""}${p.changePercent.toFixed(2)}% today)`
    )
    .join("\n");

  const totalSign = (totalChange ?? 0) >= 0 ? "+" : "";
  const userContent = `My portfolio today:\n${positionLines}\n\nTotal value: $${(totalValue ?? 0).toFixed(2)}, ${totalSign}$${Math.abs(totalChange ?? 0).toFixed(2)} (${totalSign}${(totalChangePct ?? 0).toFixed(2)}%) today.`;

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
        messages: [{ role: "user", content: userContent }],
      },
      { headers: { "anthropic-beta": "prompt-caching-2024-07-31" } }
    );

    const block = response.content.find((b) => b.type === "text");
    const summary = block?.type === "text" ? block.text : null;

    if (!summary) {
      return Response.json({ error: "No response from model" }, { status: 502 });
    }

    return Response.json(
      { summary },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (err) {
    console.error("[/api/portfolio-summary]", err);
    return Response.json({ error: "Failed to generate summary" }, { status: 502 });
  }
}
