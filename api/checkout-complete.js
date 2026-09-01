import Stripe from "stripe";
import { issueAccess } from "../lib/access.js";
import { ensureStudent } from "../lib/student-store.js";

export default async function handler(req, res) {
  const sessionId = String(req.query?.session_id || "");
  if (!sessionId || !process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) return res.redirect(302, "/?checkout=error");
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    const paid = session.mode === "subscription" ? ["active", "trialing"].includes(session.subscription?.status) : session.payment_status === "paid";
    if (!paid) return res.redirect(302, "/?checkout=pending");
    const plan = session.metadata?.plan;
    if (!['day','student','academic'].includes(plan)) return res.redirect(302, "/?checkout=error");
    const email = String(session.customer_details?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.redirect(302, "/?checkout=edu-required");
    try { await ensureStudent(email); } catch (e) { console.error("student store", e.message); }
    issueAccess(res, { email, name: session.customer_details?.name || email.split("@")[0], plan, customer: String(session.customer || "") });
    return res.redirect(302, "/?checkout=success");
  } catch { return res.redirect(302, "/?checkout=error"); }
}
