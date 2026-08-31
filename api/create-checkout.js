import Stripe from "stripe";

const PLANS = {
  day: ["STRIPE_PRICE_DAY_PASS", "payment"],
  student: ["STRIPE_PRICE_STUDENT_MONTHLY", "subscription"],
  academic: ["STRIPE_PRICE_ACADEMIC_YEARLY", "subscription"]
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const plan = req.body?.plan;
  const config = PLANS[plan];
  const price = config && process.env[config[0]];
  if (!price || !process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) return res.status(503).json({ error: "Payments are not configured yet. Please try again soon." });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: config[1],
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.APP_URL}/api/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { plan },
    subscription_data: config[1] === "subscription" ? { metadata: { plan } } : undefined
  });
  return res.status(200).json({ url: session.url });
}
