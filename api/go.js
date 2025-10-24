// /api/go.js — simple proxy vers /api/qr en conservant toute la query string
export default function handler(req, res) {
  const qs = req.url && req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const dest = `/api/qr${qs}`;

  res.statusCode = 307; // redirection temporaire (garde la méthode GET)
  res.setHeader("Location", dest);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}
