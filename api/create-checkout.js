import Stripe from "stripe";

const PLANS = {
  day: ["STRIPE_PRICE_DAY_PASS", "payment"],
  plus_monthly: ["STRIPE_PRICE_PLUS_MONTHLY", "subscription"],
  plus_annual: ["STRIPE_PRICE_PLUS_ANNUAL", "subscription"],
  pro_monthly: ["STRIPE_PRICE_PRO_MONTHLY", "subscription"],
  pro_annual: ["STRIPE_PRICE_PRO_ANNUAL", "subscription"],
  super_monthly: ["STRIPE_PRICE_SUPER_MONTHLY", "subscription"],
  super_annual: ["STRIPE_PRICE_SUPER_ANNUAL", "subscription"]
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const plan = req.body?.plan;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const config = PLANS[plan];
  const price = config && process.env[config[0]];
  if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.status(403).json({ error: "A valid .edu student email address is required." });
  if (!price || !process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) return res.status(503).json({ error: "Payments are not configured yet. Please try again soon." });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: config[1],
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.APP_URL}/api/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/?checkout=cancelled`,
    customer_email: email,
    allow_promotion_codes: true,
    metadata: { plan },
    subscription_data: config[1] === "subscription" ? { metadata: { plan } } : undefined
  });
  return res.status(200).json({ url: session.url });
}
