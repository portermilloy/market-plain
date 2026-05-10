import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, getIp } from "@/app/lib/rateLimit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = "You are a concise financial news analyst. When given a list of news headlines for a stock, write 3-4 sentences of plain English summarizing what is happening with that company in the market today. Never use bullet points or headers — plain prose only.";

export async function POST(request: Request) {
  let body: { ticker?: string; headlines?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ticker, headlines } = body;

  if (!ticker || !Array.isArray(headlines) || headlines.length === 0) {
    return Response.json(
      { error: "ticker and a non-empty headlines array are required" },
      { status: 400 }
    );
  }

  if (request.headers.get("x-app-client") !== "market-plain") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, remaining } = await checkRateLimit(getIp(request));
  if (!allowed) {
    return Response.json(
      { error: "Too many requests, please try again later" },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  const headlineList = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");

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
            content: `Here are today's news headlines for ${ticker}:\n\n${headlineList}`,
          },
        ],
      },
      { headers: { "anthropic-beta": "prompt-caching-2024-07-31" } }
    );

    const block = response.content.find((b) => b.type === "text");
    const summary = block?.type === "text" ? block.text : null;

    if (!summary) {
      return Response.json({ error: "No response from model" }, { status: 502 });
    }

    return Response.json({ summary }, { headers: { "X-RateLimit-Remaining": String(remaining) } });
  } catch (err) {
    console.error("[/api/summarize]", err);
    return Response.json({ error: "Failed to generate summary" }, { status: 502 });
  }
}
