import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return Response.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[/api/webhook] Signature verification failed:", err);
    return Response.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("[/api/webhook] checkout.session.completed:", session.id);
      // Pro token is issued client-side via /api/verify-session after the redirect.
      // This webhook can be extended for email confirmations or DB persistence.
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      console.log("[/api/webhook] subscription cancelled:", sub.id);
      // Token revocation requires a DB — noted as a known limitation.
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
