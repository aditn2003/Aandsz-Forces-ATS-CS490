// auth.js (or inside your routes file before routes)
import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET); // don't ignore exp
    req.userId = data.id;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
