/* Lantern Copilot — backend proxy. Your API key stays here, never in the page.
   Vercel: this file works as-is at /api/ask.
   Netlify: move to netlify/functions/ask.js and use the exports.handler version in README. */

import { readAccess } from "../lib/access.js";
import { scholarlyReadingSuggestions } from "../lib/trusted-sources.js";

const ALLOWED_MODEL = "claude-sonnet-4-5";
const PLAN_INSTRUCTIONS = {
  free: "Give one focused topic explanation. Use simple words, one relatable analogy, and short sentences. Do not provide a study plan, multiple topics, or source comparison.",
  day: "Give complete Student Guide and Academic support: clear explanation, practical study steps, memorable analogies, and three trustworthy academic reading suggestions when relevant. Never invent citations or URLs.",
  student: "Give the complete Student Guide response: clear explanation, useful examples, practical next study steps, and a supportive tone.",
  academic: "Give the complete Academic Plus response. Use clearly labelled sections: Definitions, Rules, Examples, Analogy, and Source comparison. When reading suggestions are supplied, describe them only as further reading; do not claim facts from them unless the supplied metadata supports that claim. Never invent citations or URLs."
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const access = readAccess(req);
  if (!access || !PLAN_INSTRUCTIONS[access.plan]) return res.status(401).json({ error: "An active StudentSpark subscription is required." });

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
  const latestQuestion = [...messages].reverse().find(m => m.role === "user")?.content || "";
  const sources = ["day", "academic"].includes(access.plan) ? await scholarlyReadingSuggestions(latestQuestion) : [];
  const sourceContext = sources.length ? `\n\nFurther-reading suggestions returned from Crossref's scholarly DOI metadata index:\n${sources.map((s, i) => `${i + 1}. ${s.title}${s.journal ? ` — ${s.journal}` : ""} (${s.url})`).join("\n")}\nUse these only as clearly labelled further reading. Do not imply you read the full papers.` : "";
  const systemWithSources = `${system}${sourceContext}`;
  const planLimit = ["free", "day"].includes(access.plan) ? 750 : access.plan === "student" ? 1800 : 2800;
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 1200, 200), planLimit);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: ALLOWED_MODEL, max_tokens, system: systemWithSources, messages })
    });
    const j = await r.json();
    if (!r.ok) {
      console.error("provider error", r.status, j && j.error);
      return res.status(502).json({ error: "Upstream error" });
    }
    const text = (j.content || []).map(c => (c && c.text) || "").join("");
    const sourcesText = sources.length ? `\n\n**Trusted further reading**\n${sources.map(s => `- [${s.title}](${s.url})${s.journal ? ` — ${s.journal}` : ""}`).join("\n")}\n\n*These are scholarly DOI records from Crossref. Open the source to assess relevance to your course.*` : "";
    return res.status(200).json({ text: `${text}${sourcesText}` });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Could not reach the model provider" });
  }
}
