import crypto from "node:crypto";
import { issueAccess } from "../lib/access.js";
import { ensureStudent } from "../lib/student-store.js";

function same(a, b) {
  const left = Buffer.from(String(a || "").trim().toLowerCase());
  const right = Buffer.from(String(b || "").trim().toLowerCase());
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();
  const isAdmin = process.env.ADMIN_EMAIL && process.env.ADMIN_ACCESS_CODE && same(email, process.env.ADMIN_EMAIL) && same(code, process.env.ADMIN_ACCESS_CODE);
  // A promo unlocks a short, deliberately smaller trial of the named plan.
  // It is not a substitute for a paid subscription and always ends after 24h.
  const promoPlans = [
    { plan: "day", usagePlan: "day_promo", code: process.env.FREE_ACCESS_CODE },
    { plan: "plus", usagePlan: "plus_promo", code: process.env.PLUS_PROMO_CODE },
    { plan: "pro", usagePlan: "pro_promo", code: process.env.PRO_PROMO_CODE },
    { plan: "super", usagePlan: "super_promo", code: process.env.SUPER_PROMO_CODE },
  ];
  const promoPlan = promoPlans.find(entry => entry.code && same(code, entry.code));
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (!isAdmin && !/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.status(403).json({ error: "Promo access is available to .edu student email addresses only." });
  if (!isAdmin && !promoPlan) return res.status(403).json({ error: "That promo code is not valid." });

  // Codes are explicitly mapped to their plan; the admin code remains full
  // owner access and is tied to the configured owner email.
  const plan = isAdmin ? "admin" : promoPlan.plan;
  const isPromo = !isAdmin;
  try { await ensureStudent(email); } catch (e) { console.error("student store", e.message); }
  issueAccess(res, {
    email,
    name: email.split("@")[0],
    plan,
    usagePlan: isPromo ? promoPlan.usagePlan : undefined,
    promo: isPromo,
    exp: isPromo ? Date.now() + 24 * 60 * 60 * 1000 : undefined,
    customer: isAdmin ? "admin" : "promo"
  });
  return res.status(200).json({ active: true, email, name: email.split("@")[0], plan, promo: isPromo });
}
