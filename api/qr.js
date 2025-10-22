// /api/qr.js
function normHttps(u = "") {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export default async function handler(req, res) {
  try {
    // On accepte plusieurs noms de param pour être flexible
    const code =
      req.query.code?.toString().trim() ||
      req.query.id?.toString().trim() ||
      req.query.qrid?.toString().trim();

    if (!code) {
      return res
        .status(400)
        .send("Missing parameter: use ?code= or ?id= or ?qrid=");
    }

    const api = process.env.BASEROW_API_URL || "https://api.baserow.io";
    const tableId = process.env.BASEROW_TABLE_ID;
    const token = process.env.BASEROW_TOKEN;

    if (!tableId || !token) {
      return res
        .status(500)
        .send(
          "Server not configured (BASEROW_TABLE_ID / BASEROW_TOKEN missing)."
        );
    }

    // Récupère des lignes (taille limitée). Pour gros volumes, on fera un filtre serveur.
    const r = await fetch(
      `${api}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`,
      {
        headers: { Authorization: `Token ${token}` },
      }
    );

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).send(`Baserow error: ${txt}`);
    }

    const data = await r.json();

    // Recherche case-insensitive sur la colonne "code_plaque"
    const found = (data.results || []).find((row) => {
      const v = (row.code_plaque || "").toString().trim().toLowerCase();
      return v === code.toLowerCase();
    });

    if (!found || !found.url_google) {
      return res
        .status(404)
        .send("Code non trouvé ou URL Google manquante dans Baserow.");
    }

    const target = normHttps(found.url_google);

    // 302 Redirect
    res.statusCode = 302;
    res.setHeader("Location", target);
    return res.end();
  } catch (e) {
    return res.status(500).send(`Server error: ${e.message}`);
  }
}
