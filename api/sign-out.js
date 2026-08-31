import { clearAccess } from "../lib/access.js";
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  clearAccess(res); return res.status(204).end();
}
