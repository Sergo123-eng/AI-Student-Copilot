import crypto from "node:crypto";

// Bump this whenever answer rules materially change. It prevents an old
// cached response from surviving a product/safety correction.
const SHARED_ANSWER_VERSION = "2026-09-01-direct-teaching";

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
  return crypto.createHash("sha256").update(`${SHARED_ANSWER_VERSION}:${normalizedQuestion(question)}`).digest("hex");
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

const USAGE_LIMITS = {
  day: { guidance: 20, reference: 2, practice: 1, analogy: 0 },
  // These are server-side safety ceilings. They are deliberately not rendered
  // in the membership page, so students see benefits rather than a token meter.
  plus: { guidance: 100, reference: 8, practice: 4, analogy: 0 },
  pro: { guidance: 150, reference: 7, practice: 10, analogy: 30 },
  super: { guidance: 200, reference: 20, practice: 20, analogy: 40 },
  free: { guidance: 7, reference: 0, practice: 0, analogy: 1 },
  admin: { guidance: 10000, reference: 10000, practice: 10000, analogy: 10000 }
};

const TOP_UP_COST = { guidance: 1, reference: 1, practice: 3, analogy: 3 };

export function usageTypeForQuestion(question) {
  const text = normalizedQuestion(question);
  if (/\b(reference|sources?|journal|paper|research article|scholarly)\b/.test(text)) return "reference";
  if (/\b(practice questions?|quiz|flashcards?|easy medium hard)\b/.test(text)) return "practice";
  if (/\b(analogy|explain like|simple explanation)\b/.test(text)) return "analogy";
  return "guidance";
}

function periodStart(plan) {
  const now = new Date();
  return plan === "day" ? now.toISOString().slice(0, 10) : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function consumePlanUsage(email, plan, question) {
  const service = config();
  const student = await ensureStudent(email);
  if (!service || !student) return { allowed: true }; // Configuration is validated at deploy; never lock out during a temporary database outage.
  const type = usageTypeForQuestion(question);
  const limit = USAGE_LIMITS[plan]?.[type] ?? 0;
  const rows = await rest("/rest/v1/rpc/consume_student_usage", {
    method: "POST",
    body: JSON.stringify({ p_student_id: student.id, p_period_start: periodStart(plan), p_plan: plan, p_usage_type: type, p_limit: limit })
  });
  if (rows === true) return { allowed: true, type, source: "plan" };
  const creditCost = TOP_UP_COST[type] || 1;
  const creditRows = await rest("/rest/v1/rpc/consume_student_topup_credits", {
    method: "POST",
    body: JSON.stringify({ p_student_id: student.id, p_credits: creditCost })
  });
  return { allowed: creditRows === true, type, source: creditRows === true ? "top_up" : "limit" };
}

export async function addStudyCredits({ email, credits, paymentId }) {
  const student = await ensureStudent(email);
  if (!student || !config()) return null;
  const rows = await rest("/rest/v1/credit_ledger?on_conflict=stripe_payment_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      student_id: student.id,
      credits: Number(credits),
      kind: "top_up",
      model_class: "standard",
      stripe_payment_id: String(paymentId || "")
    })
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function saveSupportRequest({ email, message }) {
  if (!config()) return null;
  const rows = await rest("/rest/v1/support_requests", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ email: String(email || "").trim().toLowerCase(), message: String(message || "").trim() })
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
      prompt_version: SHARED_ANSWER_VERSION,
      expires_at: expires
    })
  });
}
