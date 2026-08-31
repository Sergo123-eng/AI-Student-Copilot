import { issueAccess } from "../lib/access.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.status(403).json({ error: "A valid .edu student email address is required." });
  issueAccess(res, { email, name: email.split("@")[0], plan: "free", customer: "free" });
  return res.status(200).json({ active: true, email, name: email.split("@")[0], plan: "free" });
}
