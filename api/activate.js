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

    // --- Helpers ---
    async function fetchAllRows() {
      let out = [];
      let next = `${api}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`;
      while (next) {
        const r = await fetch(next, { headers: { Authorization: `Token ${token}` } });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`Baserow list failed: ${r.status} ${txt}`);
        }
        const data = await r.json();
        out = out.concat(data.results || []);
        next = data.next;
      }
      return out;
    }

    async function resolveActifOuiValue() {
      // Essaie de trouver l'ID de l'option "oui" si 'actif' est un single_select.
      try {
        const r = await fetch(`${api}/api/database/fields/table/${tableId}/?user_field_names=true`, { headers });
        if (!r.ok) return "oui";
        const fields = await r.json();
        const actifField = (fields || []).find(f => (f.name || "").toLowerCase() === "actif" && f.type === "single_select");
        const optionOui = actifField?.select_options?.find(o =>
          ((o.value || o.name || "") + "").trim().toLowerCase() === "oui"
        );
        return optionOui?.id ?? "oui";
      } catch {
        return "oui"; // fallback: champ texte
      }
    }

    // 1) Chercher une ligne existante par code_plaque (pagination illimitée)
    const rows = await fetchAllRows();
    const existing = rows.find(
      (x) => (x.code_plaque || "").toString().trim().toLowerCase() === code_plaque.toLowerCase()
    );

    // 2) Prépare payload (actif compatible texte/select)
    const actifOui = await resolveActifOuiValue();
    const payload = {
      code_plaque,
      url_google,
      actif: actifOui, // "oui" (si texte) ou ID (si select)
      date_activation: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    };

    if (existing?.id) {
      // Mise à jour
      const r2 = await fetch(`${api}/api/database/rows/table/${tableId}/${existing.id}/?user_field_names=true`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      const d2 = await r2.json().catch(() => ({}));
      if (!r2.ok) return res.status(r2.status).json({ error: d2 });
      return res.status(200).json({ ok: true, id: d2.id, message: "Activation mise à jour" });
    } else {
      // Création
      const r3 = await fetch(`${api}/api/database/rows/table/${tableId}/?user_field_names=true`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const d3 = await r3.json().catch(() => ({}));
      if (!r3.ok) return res.status(r3.status).json({ error: d3 });
      return res.status(200).json({ ok: true, id: d3.id, message: "Activation créée" });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
