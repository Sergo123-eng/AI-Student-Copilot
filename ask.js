/* Lantern Copilot — backend proxy. Your API key stays here, never in the page.
   Vercel: this file works as-is at /api/ask.
   Netlify: move to netlify/functions/ask.js and use the exports.handler version in README. */

const ALLOWED_MODEL = "claude-sonnet-4-5";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const system = typeof body.system === "string" ? body.system.slice(0, 20000) : "";
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20).map(m => ({
    role: m && m.role === "assistant" ? "assistant" : "user",
    content: String((m && m.content) || "").slice(0, 8000)
  })) : [];
  if (!messages.length) return res.status(400).json({ error: "No messages" });
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 1200, 200), 4000);

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
    return res.status(200).json({ text });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Could not reach the model provider" });
  }
}
