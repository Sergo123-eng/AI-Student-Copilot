import Stripe from "stripe";
import { readAccess } from "../lib/access.js";
import { stripeCustomerForStudent } from "../lib/student-store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const access = readAccess(req);
  if (!access?.email || !process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) {
    return res.status(401).json({ error: "Sign in to manage your membership." });
  }
  try {
    // Look up the saved Stripe customer server-side rather than trusting a
    // browser-provided identifier.
    const customer = await stripeCustomerForStudent(access.email);
    if (!customer?.startsWith("cus_")) return res.status(404).json({ error: "No recurring membership was found for this account." });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: process.env.APP_URL
    });
    return res.status(200).json({ url: portal.url });
  } catch (e) {
    console.error("customer portal", e.message);
    return res.status(503).json({ error: "The Stripe customer portal is not available yet. Please try again." });
  }
}
