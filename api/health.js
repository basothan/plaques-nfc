// api/health.js
module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
    }

    const { BASEROW_API_URL, BASEROW_TABLE_ID, BASEROW_TOKEN } = process.env;

    const hasUrl = !!BASEROW_API_URL;
    const hasTable = !!BASEROW_TABLE_ID;
    const hasToken = !!BASEROW_TOKEN;

    // Ping Baserow (lecture simple, aucune modification)
    let ping = null;
    if (hasUrl && hasTable && hasToken) {
      const url = `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?size=1&user_field_names=true`;
      const r = await fetch(url, {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      });
      ping = { status: r.status };
      if (!r.ok) {
        ping.error = await r.text().catch(() => null);
      }
    }

    return res.status(200).json({
      ok: true,
      env: { hasUrl, hasTable, hasToken },
      ping,
    });
  } catch (e) {
    console.error('HEALTH_ERROR', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Erreur interne' });
  }
};
