// /api/qr.js  (CommonJS)
// Ex: https://www.basothanmyconnect.fr/qr?id=A3HJ9  -> 302 vers url_google

module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).send('Method not allowed');

    const { id } = req.query || {};
    if (!id) return res.status(400).send('Missing id');

    const apiUrl  = process.env.BASEROW_API_URL || 'https://api.baserow.io';
    const tableId = process.env.BASEROW_TABLE_ID;
    const token   = process.env.BASEROW_TOKEN;
    if (!tableId || !token) return res.status(500).send('Server config error');

    const url = `${apiUrl}/api/database/rows/table/${tableId}/?size=200&user_field_names=true`;
    const r = await fetch(url, { headers: { Authorization: `Token ${token}` }});
    if (!r.ok) return res.status(500).send('Baserow list error');
    const data = await r.json();

    const code = String(id).toUpperCase().trim();
    const row = (data.results || []).find(x => String(x.code_plaque || '').toUpperCase().trim() === code);
    if (!row) return res.status(404).send('Plaque non trouvée');
    if (!row.url_google) return res.status(404).send('Lien non configuré');

    res.writeHead(302, { Location: row.url_google });
    return res.end();
  } catch (e) {
    console.error('QR_ERROR', e);
    return res.status(500).send('Internal error');
  }
};
