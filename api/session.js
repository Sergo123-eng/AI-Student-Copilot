import { readAccess } from "../lib/access.js";
export default function handler(req, res) {
  const access = readAccess(req);
  return res.status(200).json(access ? { active: true, ...access } : { active: false });
}
