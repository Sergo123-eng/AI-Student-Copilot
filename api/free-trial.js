import { jsonPost, rateLimit } from "../lib/request-security.js";

export default async function handler(req, res) {
  if (!jsonPost(req, res) || !rateLimit(req, res, { name: "trial", limit: 4, windowMs: 24 * 60 * 60 * 1000 })) return;
  return res.status(410).json({ error: "Free trials are not currently available." });
}
