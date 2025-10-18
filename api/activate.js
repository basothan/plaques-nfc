import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { code_plaque, url_google } = req.body;

  if (!code_plaque || !url_google) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  try {
    const tableId = "{ID_DE_TA_TABLE_BASEROW}"; // ⬅️ Remplace par ton ID de table
    const baseUrl = `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true`;
    const apiKey = process.env.BASEROW_API_KEY;

    // Recherche la plaque existante
    const searchUrl = `${baseUrl}&filter__code_plaque__equal=${code_plaque}`;
    const check = await fetch(searchUrl, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    const data = await check.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: "Plaque introuvable" });
    }

    const rowId = data.results[0].id;

    // Mise à jour
    const updateUrl = `https://api.baserow.io/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
    const patch = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url_google,
        actif: "oui",
        date_activation: new Date().toISOString().split("T")[0],
      }),
    });

    if (!patch.ok) {
      const errText = await patch.text();
      throw new Error(errText);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
