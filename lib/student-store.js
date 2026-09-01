import crypto from "node:crypto";

function config() {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  return url && key ? { url, key } : null;
}

async function rest(path, options = {}) {
  const service = config();
  if (!service) return null;
  const response = await fetch(service.url + path, {
    ...options,
    headers: {
      apikey: service.key,
      Authorization: `Bearer ${service.key}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export function normalizedQuestion(question) {
  return String(question || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function questionKey(question) {
  return crypto.createHash("sha256").update(normalizedQuestion(question)).digest("hex");
}

export async function ensureStudent(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.edu$/i.test(value) || !config()) return null;
  const rows = await rest("/rest/v1/students?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ email: value })
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

// Shared caching is intentionally limited to general, non-personal questions.
// Do not add student identity, uploads, schedules, or private memory here.
export function isSafeSharedQuestion(question) {
  const text = normalizedQuestion(question);
  if (text.length < 12 || text.length > 500) return false;
  return !/\b(my|me|i am|im|myself|email|grade|gpa|schedule|counsel|mental|sex|financial aid status)\b/i.test(text);
}

export async function findSharedAnswer(question) {
  if (!config() || !isSafeSharedQuestion(question)) return null;
  const key = questionKey(question);
  const now = encodeURIComponent(new Date().toISOString());
  const rows = await rest(`/rest/v1/shared_answers?question_key=eq.${key}&expires_at=gt.${now}&select=answer_json,sources_json`);
  return Array.isArray(rows) && rows[0] ? rows[0].answer_json : null;
}

export async function saveSharedAnswer(question, answer, sources) {
  if (!config() || !isSafeSharedQuestion(question) || !Array.isArray(sources) || !sources.length) return;
  const preview = String(question || "").slice(0, 500);
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  await rest("/rest/v1/shared_answers?on_conflict=question_key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      question_key: questionKey(question),
      question_preview: preview,
      category: "academic",
      answer_json: answer,
      sources_json: sources,
      prompt_version: "2026-08-31",
      expires_at: expires
    })
  });
}
