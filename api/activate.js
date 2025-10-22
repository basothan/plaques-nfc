// /api/activate.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { code_plaque, url_google } = req.body || {};
    if (!code_plaque || !url_google) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const api = process.env.BASEROW_API_URL || "https://api.baserow.io";
    const tableId = process.env.BASEROW_TABLE_ID;
    const token = process.env.BASEROW_TOKEN;
    if (!tableId || !token) {
      return res.status(500).json({ error: "Env manquantes (BASEROW_*)." });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    };

    // 1) Chercher une ligne existante par code_plaque
    let existing = null;
    {
      const r = await fetch(`${api}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`, {
        headers,
      });
      const data = await r.json();
      if (r.ok) {
        existing = (data.results || []).find(
          (x) => (x.code_plaque || "").toString().trim().toLowerCase() === code_plaque.toLowerCase()
        );
      }
    }

    const payload = {
      code_plaque,
      url_google,
      actif: "oui",
      date_activation: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    };

    if (existing?.id) {
      // Mise à jour
      const r2 = await fetch(`${api}/api/database/rows/table/${tableId}/${existing.id}/?user_field_names=true`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      const d2 = await r2.json();
      if (!r2.ok) return res.status(r2.status).json({ error: d2 });
      return res.status(200).json({ ok: true, id: d2.id, message: "Activation mise à jour" });
    } else {
      // Création
      const r3 = await fetch(`${api}/api/database/rows/table/${tableId}/?user_field_names=true`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const d3 = await r3.json();
      if (!r3.ok) return res.status(r3.status).json({ error: d3 });
      return res.status(200).json({ ok: true, id: d3.id, message: "Activation créée" });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
