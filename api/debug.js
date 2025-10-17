// /api/debug.js  (CommonJS, aligne sur "code_plaque")
module.exports = async (req, res) => {
  const apiUrl = process.env.BASEROW_API_URL || 'https://api.baserow.io';
  const tableId = process.env.BASEROW_TABLE_ID;
  const token = process.env.BASEROW_TOKEN;

  if (!tableId || !token) {
    return res.status(500).json({ error: 'ENV manquantes', tableId, hasToken: !!token });
  }

  const qId = (req.query.id || '').toString().trim().toUpperCase();

  async function fetchAll() {
    let out = [], next = `${apiUrl}/api/database/rows/table/${tableId}/?user_field_names=true`;
    while (next) {
      const r = await fetch(next, { headers:{ Authorization:`Token ${token}` }});
      if (!r.ok) return res.status(r.status).json({ error: `GET ${next}`, status: r.status, text: await r.text() });
      const data = await r.json();
      out = out.concat(data.results || []);
      next = data.next;
    }
    return out;
  }

  try {
    const rows = await fetchAll();
    const head = rows[0] ? Object.keys(rows[0]) : [];
    const found = qId
      ? rows.find(r => String(r.code_plaque||'').toUpperCase().trim() === qId)
      : null;

    res.status(200).json({
      ok: true,
      count: rows.length,
      head,
      sample: rows.slice(0,3),
      query: qId || null,
      found: found ? { id: found.id, code_plaque: found.code_plaque, actif: found.actif, url_google: found.url_google } : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
};
