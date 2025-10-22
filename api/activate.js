// /api/activate.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { id_plaque, url_google } = req.body || {};
    if (!id_plaque || !url_google) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
    const BASEROW_API = process.env.BASEROW_API_URL || "https://api.baserow.io";

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      return res.status(500).json({
        error:
          "Variables d'environnement BASEROW_TOKEN et/ou BASEROW_TABLE_ID manquantes",
      });
    }

    // ⚠️ Adapte 'code' et 'url_google' aux noms exacts de tes champs Baserow
    const payload = {
      code: id_plaque,
      url_google: url_google,
    };

    const url = `${BASEROW_API}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${BASEROW_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(r.status).json({
        error: data || { message: "Baserow error", status: r.status },
      });
    }

    return res
      .status(200)
      .json({ ok: true, id: data?.id || null, message: "Activation réussie" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
