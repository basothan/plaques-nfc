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
      return res.status(500).json({
        error: "Variables d'environnement manquantes (BASEROW_TABLE_ID / BASEROW_TOKEN)."
      });
    }

    // Compose les champs de ta table
    const payload = {
      code_plaque,
      url_google,
      actif: "oui", // si ton champ est une sélection "oui/non"
      date_activation: new Date().toISOString().substring(0, 10) // YYYY-MM-DD
      // qr_url: ... (si tu veux le remplir plus tard)
    };

    const r = await fetch(`${api}/api/database/rows/table/${tableId}/?user_field_names=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data });
    }

    return res.status(200).json({ ok: true, id: data?.id || null, message: "Activation réussie" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
