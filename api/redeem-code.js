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
  const hasPromo = process.env.FREE_ACCESS_CODE && same(code, process.env.FREE_ACCESS_CODE);
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (!isAdmin && !/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.status(403).json({ error: "Promo access is available to .edu student email addresses only." });
  if (!isAdmin && !hasPromo) return res.status(403).json({ error: "That promo code is not valid." });

  // A public promo is deliberately limited to the 24-hour Day Pass. The
  // admin code remains full Academic access.
  const plan = isAdmin ? "academic" : "day";
  try { await ensureStudent(email); } catch (e) { console.error("student store", e.message); }
  issueAccess(res, { email, name: email.split("@")[0], plan, customer: isAdmin ? "admin" : "promo" });
  return res.status(200).json({ active: true, email, name: email.split("@")[0], plan });
}
