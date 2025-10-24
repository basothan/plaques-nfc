// /api/qr.js
function normHttps(u = "") {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function isActiveOui(actif) {
  // Compat texte ou single_select
  if (actif == null) return false;
  if (typeof actif === "string") return actif.trim().toLowerCase() === "oui";
  if (typeof actif === "object") {
    // Baserow single_select renvoie souvent un objet { id, value/name, ... } en user_field_names=true
    const v = (actif.value || actif.name || "").toString().trim().toLowerCase();
    return v === "oui";
  }
  return false;
}

export default async function handler(req, res) {
  try {
    const code =
      req.query.code?.toString().trim() ||
      req.query.id?.toString().trim() ||
      req.query.qrid?.toString().trim();

    if (!code) {
      return res.status(400).send("Missing parameter: use ?code= or ?id= or ?qrid=");
    }

    const api = process.env.BASEROW_API_URL || "https://api.baserow.io";
    const tableId = process.env.BASEROW_TABLE_ID;
    const token = process.env.BASEROW_TOKEN;

    if (!tableId || !token) {
      return res
        .status(500)
        .send("Server not configured (BASEROW_TABLE_ID / BASEROW_TOKEN missing).");
    }

    // --- Pagination illimitée ---
    async function fetchAllRows() {
      let out = [];
      let next = `${api}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`;
      while (next) {
        const r = await fetch(next, { headers: { Authorization: `Token ${token}` } });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          return res.status(r.status).send(`Baserow error: ${txt}`);
        }
        const data = await r.json();
        out = out.concat(data.results || []);
        next = data.next;
      }
      return out;
    }

    const rows = await fetchAllRows();
    if (!Array.isArray(rows)) return; // réponse déjà envoyée en cas d'erreur

    // Recherche case-insensitive sur "code_plaque"
    const found = rows.find((row) => {
      const v = (row.code_plaque || "").toString().trim().toLowerCase();
      return v === code.toLowerCase();
    });

    if (!found || !found.url_google) {
      return res
        .status(404)
        .send("Code non trouvé ou URL Google manquante dans Baserow.");
    }

    // Si tu veux forcer l'activation, dé-commente ce bloc :
    // if (!isActiveOui(found.actif)) {
    //   return res.status(404).send("Plaque inactive.");
    // }

    const target = normHttps(found.url_google);

    // 302 Redirect
    res.statusCode = 302;
    res.setHeader("Location", target);
    return res.end();
  } catch (e) {
    return res.status(500).send(`Server error: ${e.message}`);
  }
}
