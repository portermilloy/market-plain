import Stripe from "stripe";
import { generateProToken } from "@/app/lib/proToken";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return Response.json({ error: "session_id is required" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== "complete") {
      return Response.json({ error: "Payment not completed" }, { status: 402 });
    }

    const token = generateProToken(sessionId);
    return Response.json({ token });
  } catch (err) {
    console.error("[/api/verify-session]", err);
    return Response.json({ error: "Failed to verify session" }, { status: 502 });
  }
}
