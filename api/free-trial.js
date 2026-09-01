import { issueAccess } from "../lib/access.js";
import { ensureStudent } from "../lib/student-store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.status(403).json({ error: "A valid .edu student email address is required." });
  try { await ensureStudent(email); } catch (e) { console.error("student store", e.message); }
  issueAccess(res, { email, name: email.split("@")[0], plan: "free", customer: "free" });
  return res.status(200).json({ active: true, email, name: email.split("@")[0], plan: "free" });
}
