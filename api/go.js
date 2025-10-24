// /api/go.js — simple proxy vers /api/g en conservant TOUTE la query string
export default function handler(req, res) {
  // Récupère la partie ?... de l'URL telle quelle
  const qs = req.url && req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const dest = `/api/g${qs}`;

  res.statusCode = 307; // redirection temporaire (garde la méthode GET)
  res.setHeader("Location", dest);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}
