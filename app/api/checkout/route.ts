import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST(request: Request) {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId || !process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade?canceled=1`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[/api/checkout]", err);
    return Response.json({ error: "Failed to create checkout session" }, { status: 502 });
  }
}
