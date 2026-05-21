import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken } from "@/app/lib/authToken";
import { isValidProToken } from "@/app/lib/proToken";
import { checkRateLimit, getIp } from "@/app/lib/rateLimit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = "You are a concise financial analyst. When given a stock or crypto asset's ticker, price, and daily move, write 2-3 sentences of plain English explaining why it may have moved today. For stocks, base your answer on general knowledge of the company and common market factors. For crypto, consider macro sentiment, news, and on-chain factors. Never use bullet points or headers — plain prose only.";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const price = searchParams.get("price");
  const changePercent = searchParams.get("changePercent");

  if (!ticker || !price || !changePercent) {
    return Response.json(
      { error: "ticker, price, and changePercent are required" },
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

  const direction = parseFloat(changePercent) >= 0 ? "up" : "down";
  const pct = Math.abs(parseFloat(changePercent)).toFixed(2);

  try {
    const response = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
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
            content: `${ticker} is ${direction} ${pct}% today, trading at $${parseFloat(price).toFixed(2)}.`,
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

    return Response.json({ explanation }, { headers: { "X-RateLimit-Remaining": String(remaining) } });
  } catch (err) {
    console.error("[/api/explain]", err);
    return Response.json({ error: "Failed to generate explanation" }, { status: 502 });
  }
}
