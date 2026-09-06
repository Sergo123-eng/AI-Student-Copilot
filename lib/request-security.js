// Small server-side protections shared by public API endpoints.  The limiter
// is deliberately conservative: it protects a warm serverless instance from
// bursts and complements (rather than replaces) provider/WAF controls.
const buckets = new Map();

export function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown")
    .split(",")[0].trim();
}

export function noStore(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

export function sameOrigin(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true; // Server-to-server calls and Stripe do not send Origin.
  const app = String(process.env.APP_URL || "").replace(/\/$/, "");
  if (app && origin === app) return true;
  res.status(403).json({ error: "Cross-site requests are not allowed." });
  return false;
}

export function jsonPost(req, res) {
  noStore(res);
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return false;
  }
  const type = String(req.headers["content-type"] || "").toLowerCase();
  if (type && !type.includes("application/json")) {
    res.status(415).json({ error: "JSON requests only." });
    return false;
  }
  return sameOrigin(req, res);
}

export function rateLimit(req, res, { name, limit, windowMs }) {
  const now = Date.now();
  const key = `${name}:${clientIp(req)}`;
  const record = buckets.get(key);
  const active = record && now - record.startedAt < windowMs ? record : { startedAt: now, count: 0 };
  active.count += 1;
  buckets.set(key, active);
  if (active.count <= limit) return true;
  const retryAfter = Math.max(1, Math.ceil((windowMs - (now - active.startedAt)) / 1000));
  res.setHeader("Retry-After", String(retryAfter));
  res.status(429).json({ error: "Too many requests. Please wait and try again." });
  return false;
}
