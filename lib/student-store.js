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

function significantTerms(question) {
  const ignored = new Set(["about", "after", "again", "among", "answer", "asked", "best", "could", "does", "explain", "from", "have", "help", "into", "more", "need", "please", "question", "that", "the", "their", "there", "these", "this", "what", "when", "where", "which", "with", "would", "your"]);
  return new Set(normalizedQuestion(question).split(" ").filter(word => word.length > 2 && !ignored.has(word)));
}

function lexicalSimilarity(a, b) {
  const left = significantTerms(a), right = significantTerms(b);
  if (left.size < 3 || right.size < 3) return 0;
  let overlap = 0;
  for (const word of left) if (right.has(word)) overlap += 1;
  return overlap / Math.max(left.size, right.size);
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

export async function hasUsedFreeTrial(email) {
  const student = await ensureStudent(email);
  if (!student || !config()) return false;
  const rows = await rest(`/rest/v1/memberships?student_id=eq.${student.id}&plan=eq.free&select=id&limit=1`);
  return Array.isArray(rows) && rows.length > 0;
}

export async function recordMembership({ email, plan, status = "active", customerId = null, checkoutSessionId = null, subscriptionId = null, endsAt = null }) {
  const student = await ensureStudent(email);
  if (!student || !config()) return null;
  if (customerId && String(customerId).startsWith("cus_")) {
    await rest(`/rest/v1/students?id=eq.${student.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
    });
  }
  const row = {
    student_id: student.id,
    plan,
    status,
    ends_at: endsAt,
    stripe_subscription_id: subscriptionId,
    stripe_checkout_session_id: checkoutSessionId
  };
  const conflict = checkoutSessionId ? "stripe_checkout_session_id" : subscriptionId ? "stripe_subscription_id" : null;
  if (!conflict) {
    const rows = await rest("/rest/v1/memberships", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
    return Array.isArray(rows) ? rows[0] || null : null;
  }
  const rows = await rest(`/rest/v1/memberships?on_conflict=${conflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row)
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function stripeCustomerForStudent(email) {
  const student = await ensureStudent(email);
  return student?.stripe_customer_id || null;
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
  if (Array.isArray(rows) && rows[0]) return rows[0].answer_json;
  // Privacy-safe near-match cache: only general questions that passed
  // isSafeSharedQuestion are considered. It reduces repeat costs without
  // storing or reusing a student's personal guidance, schedule, or identity.
  const candidates = await rest(`/rest/v1/shared_answers?expires_at=gt.${now}&select=question_preview,answer_json&order=created_at.desc&limit=60`);
  if (!Array.isArray(candidates)) return null;
  const match = candidates
    .map(row => ({ row, similarity: lexicalSimilarity(question, row.question_preview) }))
    .sort((a, b) => b.similarity - a.similarity)[0];
  return match && match.similarity >= 0.82 ? match.row.answer_json : null;
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
