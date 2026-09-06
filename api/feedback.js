import { readAccess } from "../lib/access.js";
import { saveSupportRequest } from "../lib/student-store.js";

const attempts = new Map();
function allowed(ip) {
  const now = Date.now();
  const history = (attempts.get(ip) || []).filter(time => now - time < 60 * 60 * 1000);
  if (history.length >= 4) return false;
  history.push(now); attempts.set(ip, history); return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const access = readAccess(req);
  if (!access?.email) return res.status(401).json({ error: "Sign in before sending feedback." });
  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: "Please wait before sending more feedback." });
  const rating = String(req.body?.rating || "").toLowerCase();
  const note = String(req.body?.note || "").trim();
  const answer = String(req.body?.answer || "").trim().slice(0, 6000);
  if (!['like', 'dislike'].includes(rating) || !answer || (rating === 'dislike' && (note.length < 5 || note.length > 1500))) {
    return res.status(400).json({ error: "Include the answer and a short note about what needs improvement." });
  }
  if (rating === 'like') return res.status(202).json({ received: true });
  const apiKey = String(process.env.RESEND_API_KEY || "");
  const from = String(process.env.SUPPORT_FROM_EMAIL || "");
  const to = String(process.env.SUPPORT_TO_EMAIL || "");
  if (!apiKey || !from || !to) return res.status(503).json({ error: "Feedback email is being configured. Please try again soon." });
  const message = `Answer feedback (dislike)\n\nStudent: ${access.email}\n\nWhat should improve:\n${note}\n\nAnswer shown:\n${answer}`;
  try {
    await saveSupportRequest({ email: access.email, message });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: access.email, subject: "StudentSpark answer feedback", text: message })
    });
    if (!r.ok) throw new Error(`email provider ${r.status}`);
    return res.status(202).json({ sent: true });
  } catch (error) {
    console.error("answer feedback", error.message);
    return res.status(503).json({ error: "Your feedback could not be sent right now. Please try again later." });
  }
}
