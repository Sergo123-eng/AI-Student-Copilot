import { issueAccess } from "../lib/access.js";
import { hasUsedFreeTrial, recordMembership } from "../lib/student-store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(email)) return res.status(403).json({ error: "A valid .edu student email address is required." });
  try {
    if (await hasUsedFreeTrial(email)) return res.status(409).json({ error: "This student email has already used its free trial. Choose a plan to continue." });
    await recordMembership({
      email,
      plan: "free",
      endsAt: new Date(Date.now() + 3 * 86400000).toISOString()
    });
  } catch (e) {
    console.error("student store", e.message);
    return res.status(503).json({ error: "The free trial could not be started. Please try again." });
  }
  issueAccess(res, { email, name: email.split("@")[0], plan: "free", customer: "free" });
  return res.status(200).json({ active: true, email, name: email.split("@")[0], plan: "free" });
}
