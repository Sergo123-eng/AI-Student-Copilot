import { saveSupportRequest } from "../lib/student-store.js";

const attempts = new Map();
function allowed(ip) {
  const now = Date.now();
  const history = (attempts.get(ip) || []).filter(time => now - time < 60 * 60 * 1000);
  if (history.length >= 3) return false;
  history.push(now); attempts.set(ip, history); return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: "Please wait before sending another support request." });
  const email = String(req.body?.email || "").trim().toLowerCase();
  const message = String(req.body?.message || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 20 || message.length > 2000) {
    return res.status(400).json({ error: "Enter a valid email and a request between 20 and 2,000 characters." });
  }
  const apiKey = String(process.env.RESEND_API_KEY || "");
  const from = String(process.env.SUPPORT_FROM_EMAIL || "");
  const to = String(process.env.SUPPORT_TO_EMAIL || "");
  if (!apiKey || !from || !to) return res.status(503).json({ error: "Support email is being configured. Please try again soon." });
  try {
    await saveSupportRequest({ email, message });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: "StudentSpark support request", text: `From: ${email}\n\n${message}` })
    });
    if (!r.ok) throw new Error(`email provider ${r.status}`);
    return res.status(202).json({ sent: true });
  } catch (error) {
    console.error("support request", error.message);
    return res.status(503).json({ error: "Your request could not be sent right now. Please try again later." });
  }
}
