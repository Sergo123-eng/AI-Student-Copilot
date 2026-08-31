import crypto from "node:crypto";

const COOKIE_NAME = "studentspark_access";

function secret() {
  const value = process.env.ACCESS_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters.");
  return value;
}

function b64(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueAccess(res, data) {
  const expiresAt = data.exp || Date.now() + (data.plan === "day" ? 86400000 : data.plan === "free" ? 259200000 : 2592000000);
  const payload = b64(JSON.stringify({ ...data, exp: expiresAt }));
  const token = `${payload}.${sign(payload)}`;
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

export function readAccess(req) {
  const raw = String(req.headers.cookie || "").split(/;\s*/).find(v => v.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data : null;
  } catch { return null; }
}

export function clearAccess(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
