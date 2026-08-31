/* Lantern Copilot — backend proxy. Your API key stays here, never in the page.
   Vercel: this file works as-is at /api/ask.
   Netlify: move to netlify/functions/ask.js and use the exports.handler version in README. */

import { readAccess } from "../lib/access.js";
import { scholarlyReadingSuggestions } from "../lib/trusted-sources.js";
import { findCampusCounselingOffice } from "../lib/campus-search.js";

const ALLOWED_MODEL = "claude-sonnet-4-5";
const PLAN_INSTRUCTIONS = {
  free: "Give one focused topic explanation. Use simple words, one relatable analogy, and short sentences. Do not provide a study plan, multiple topics, source comparison, or homework solutions.",
  day: "Give complete Student Guide and Academic support: explain concepts clearly, show the approach to a problem, offer practice questions, identify the skill to improve, and use memorable analogies. Never invent citations or URLs.",
  student: "Give the complete Student Guide response: clear explanation, useful examples, practical next study steps, and a supportive tone.",
  academic: "Give the complete Academic Plus response. Explain concepts, show a problem-solving approach, offer practice questions, identify the skill to improve, and use memorable analogies. Use clearly labelled sections: Definitions, Rules, Examples, Analogy, Practice, Skill to build, and Further reading. Never invent citations or URLs."
};

const SEXUAL_RE = /\b(sex|sexting|hookup|porn|nudes|virginity|condom|std|sti|birth control|plan b|orgasm|masturbat|threesome)\b/i;
const MENTAL_HEALTH_RE = /\b(suicid|self.?harm|kill myself|want to die|depress|anxiet|panic attack|trauma|eating disorder|abuse|assault|rape|stalking|mental health|psychological)\b/i;
const UPDATED_RULES = `
UPDATED STUDENTSPARK PRODUCT RULES — these override conflicting instructions in the requested system:
- Return ONLY the JSON structure requested by the caller. Never add markdown around it.
- StudentSpark is warm, direct, and encouraging. When a student fears a result or asks for an expected outcome, do not predict it. State the next controllable step and add one brief honest encouragement such as "I believe you can take this one step at a time."
- For day and academic access, academic questions may include clear explanations, an analogy, a problem-solving approach, and 2–4 practice questions. Do not complete graded work presented as a live assignment or exam. Teach the method and let the student do the final work.
- For day and academic access, identify the primary skill being tested (for example: problem decomposition, algebraic fluency, active reading, evidence evaluation, argument building, or recall). Give one concrete drill to improve it this week. For the $3 student plan, provide guide and planning support only, without academic source mode or worked academic instruction.
- For non-academic questions such as financial aid, give concrete steps for this week and cite only official sources such as the student's financial-aid office, studentaid.gov, or an applicable government agency. Do not guess a school policy, deadline, office, or outcome.
- Never use Wikipedia, Reddit, anonymous forums, answer mills, or social posts as sources. Only name sources that are supplied in this request, official .edu/.gov pages, established academic publishers, or the approved study-resource list.
- If the question is sexual, decline briefly: "I cannot answer sexual questions. You can ask me for other guidance or academic help." Return no resources or suggestions.
- If the question asks for psychological or mental-health counseling, do not counsel or diagnose. Encourage the student to contact their campus personal counseling center. If they provide an institution name, say you can help them locate that institution's official counseling-office page; never invent its URL. If there is immediate danger, direct them to local emergency services and, in the U.S., call or text 988.
- When scholarly reading suggestions are supplied below, present them as further-reading suggestions only. Do not claim to have read a full work or to know that it supports a specific claim beyond its metadata.
`;

function safeJsonResponse(data) {
  return JSON.stringify({
    answer: data.answer,
    suggestions: data.suggestions || [],
    forYou: [],
    resources: data.resources || [],
    needsClass: false,
    sources: data.sources || [],
    care: !!data.care
  });
}

function institutionFrom(question) {
  const match = String(question || "").match(/\b(?:[A-Z][A-Za-z&.'-]*\s+){0,4}(?:University|College|Institute)\b/);
  return match ? match[0] : "";
}

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
  const system = PLAN_INSTRUCTIONS[access.plan] + "\n\n" + requestedSystem + "\n\n" + UPDATED_RULES;
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20).map(m => ({
    role: m && m.role === "assistant" ? "assistant" : "user",
    content: String((m && m.content) || "").slice(0, 8000)
  })) : [];
  if (!messages.length) return res.status(400).json({ error: "No messages" });
  const latestQuestion = [...messages].reverse().find(m => m.role === "user")?.content || "";
  if (SEXUAL_RE.test(latestQuestion)) {
    return res.status(200).json({ text: safeJsonResponse({ answer: "I cannot answer sexual questions. You can ask me for other guidance or academic help." }) });
  }
  if (MENTAL_HEALTH_RE.test(latestQuestion)) {
    const institution = institutionFrom(latestQuestion);
    const resources = await findCampusCounselingOffice(institution);
    return res.status(200).json({ text: safeJsonResponse({
      care: true,
      answer: institution && resources.length ? "I cannot provide psychological counseling or a diagnosis. I found official counseling-office results for " + institution + " below. If you may be in immediate danger, contact local emergency services; in the U.S., call or text 988." : "I cannot provide psychological counseling or a diagnosis. Please contact your campus personal counseling center. Share your institution name if you want me to look for its official .edu counseling-office page. If you may be in immediate danger, contact local emergency services; in the U.S., call or text 988.",
      suggestions: ["Contact your campus personal counseling center today.", "Reach out to a trusted person who can be with you or help you make the call."],
      resources,
      sources: [{ name: "Campus personal counseling center", type: "edu", why: "Official student support service" }, { name: "988 Suicide & Crisis Lifeline", type: "gov", why: "U.S. crisis support" }]
    }) });
  }
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
      const providerMessage = String(j?.error?.message || "");
      if (/credit balance is too low|purchase credits|billing/i.test(providerMessage)) {
        return res.status(503).json({ error: "StudentSpark is temporarily unavailable because its AI service needs credits. Please try again shortly." });
      }
      return res.status(502).json({ error: "The AI service could not respond right now. Please try again shortly." });
    }
    const text = (j.content || []).map(c => (c && c.text) || "").join("");
    let output = text;
    if (sources.length) {
      try {
        const parsed = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim());
        parsed.sources = Array.isArray(parsed.sources) ? parsed.sources : [];
        parsed.sources.push(...sources.map(s => ({ name: s.title, type: "research", why: "Further reading: " + (s.journal || "Crossref DOI record") + " — " + s.url })));
        output = JSON.stringify(parsed);
      } catch {
        // The UI can still display a plain model response if the provider did
        // not follow its JSON contract; do not manufacture citations.
      }
    }
    return res.status(200).json({ text: output });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Could not reach the model provider" });
  }
}
