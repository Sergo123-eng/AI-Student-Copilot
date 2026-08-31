import { issueAccess } from "../lib/access.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  issueAccess(res, { email: "Free trial", name: "Free trial", plan: "free", prompts: 0, customer: "free" });
  return res.status(200).json({ active: true, email: "Free trial", name: "Free trial", plan: "free", prompts: 0 });
}
