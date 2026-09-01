import Stripe from "stripe";
import { issueAccess } from "../lib/access.js";
import { recordMembership, addStudyCredits } from "../lib/student-store.js";

export default async function handler(req, res) {
  const sessionId = String(req.query?.session_id || "");
  if (!sessionId || !process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) return res.redirect(302, "/?checkout=error");
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    const paid = session.mode === "subscription" ? ["active", "trialing"].includes(session.subscription?.status) : session.payment_status === "paid";
    if (!paid) return res.redirect(302, "/?checkout=pending");
    const checkoutPlan = session.metadata?.plan;
    if (checkoutPlan === "study_credits") {
      const email = String(session.customer_details?.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.redirect(302, "/?checkout=edu-required");
      await addStudyCredits({ email, credits: 10, paymentId: String(session.payment_intent || session.id) });
      return res.redirect(302, "/?checkout=credits-added");
    }
    const accessPlan = checkoutPlan === "day" ? "day" : checkoutPlan?.replace(/_(monthly|annual)$/, "");
    const billing = checkoutPlan?.endsWith("_annual") ? "annual" : "monthly";
    if (!['day','plus','pro','super'].includes(accessPlan)) return res.redirect(302, "/?checkout=error");
    const email = String(session.customer_details?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.redirect(302, "/?checkout=edu-required");
    const membershipPlan = accessPlan === "day" ? "day" : billing;
    const endsAt = session.mode === "subscription"
      ? (session.subscription?.current_period_end ? new Date(session.subscription.current_period_end * 1000).toISOString() : null)
      : new Date(Date.now() + 86400000).toISOString();
    try {
      await recordMembership({
        email,
        plan: membershipPlan,
        customerId: String(session.customer || ""),
        checkoutSessionId: session.id,
        subscriptionId: typeof session.subscription === "object" ? session.subscription.id : String(session.subscription || "") || null,
        endsAt
      });
    } catch (e) {
      console.error("membership store", e.message);
      return res.redirect(302, "/?checkout=error");
    }
    issueAccess(res, { email, name: session.customer_details?.name || email.split("@")[0], plan: accessPlan, billing, customer: String(session.customer || "") });
    return res.redirect(302, "/?checkout=success");
  } catch { return res.redirect(302, "/?checkout=error"); }
}
