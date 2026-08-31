/* Lantern Copilot — backend proxy. Your API key stays here, never in the page.
   Vercel: this file works as-is at /api/ask.
   Netlify: move to netlify/functions/ask.js and use the exports.handler version in README. */

import { readAccess } from "../lib/access.js";

const ALLOWED_MODEL = "claude-sonnet-4-5";
const PLAN_INSTRUCTIONS = {
  free: "Give one focused topic explanation. Use simple words, one relatable analogy, and short sentences. Do not provide a study plan, multiple topics, or source comparison.",
  day: "Give one focused topic explanation. Use simple words, one relatable analogy, and short sentences. Do not provide a study plan, multiple topics, or source comparison.",
  student: "Give the complete Student Guide response: clear explanation, useful examples, practical next study steps, and a supportive tone.",
  academic: "Give the complete Academic Plus response. Use clearly labelled sections: Definitions, Rules, Examples, Analogy, and Source comparison. When sources are provided or available, compare three trustworthy academic sources, explain how each differs, and connect the analogy to the source material. Never invent citations or URLs."
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const access = readAccess(req);
  if (!access || !PLAN_INSTRUCTIONS[access.plan]) return res.status(401).json({ error: "An active StudentSpark subscription is required." });
  if (access.plan === "free" && Number(access.prompts || 0) >= 3) return res.status(429).json({ error: "Your three free prompts are complete. Sign out, then choose the $1 24-hour pass or a subscription for continued access." });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const requestedSystem = typeof body.system === "string" ? body.system.slice(0, 16000) : "";
  const system = `${PLAN_INSTRUCTIONS[access.plan]}\n\n${requestedSystem}`;
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20).map(m => ({
    role: m && m.role === "assistant" ? "assistant" : "user",
    content: String((m && m.content) || "").slice(0, 8000)
  })) : [];
  if (!messages.length) return res.status(400).json({ error: "No messages" });
  const planLimit = ["free", "day"].includes(access.plan) ? 750 : access.plan === "student" ? 1800 : 2800;
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 1200, 200), planLimit);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: ALLOWED_MODEL, max_tokens, system, messages })
    });
    const j = await r.json();
    if (!r.ok) {
      console.error("provider error", r.status, j && j.error);
      return res.status(502).json({ error: "Upstream error" });
    }
    const text = (j.content || []).map(c => (c && c.text) || "").join("");
    if (access.plan === "free") issueAccess(res, { ...access, prompts: Number(access.prompts || 0) + 1 });
    return res.status(200).json({ text });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Could not reach the model provider" });
  }
}
