export default async function handler(req, res) {
  // 1) Méthode autorisée
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', detail: 'Utilisez POST' });
  }

  // 2) Entrées requises (+ petit check URL)
  const { id_plaque, url_google } = req.body || {};
  if (!id_plaque || !url_google) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      detail: 'id_plaque et url_google sont requis.'
    });
  }
  if (!/^https?:\/\//i.test(url_google)) {
    return res.status(400).json({
      error: 'INVALID_URL',
      detail: 'url_google doit commencer par http(s)://'
    });
  }

  // 3) ENV
  const apiUrl  = (process.env.BASEROW_API_URL || 'https://api.baserow.io').replace(/\/$/, '');
  const tableId = process.env.BASEROW_TABLE_ID;
  const token   = process.env.BASEROW_TOKEN;

  if (!tableId || !token) {
    return res.status(500).json({
      error: 'CONFIG_MISSING',
      detail: 'BASEROW_TABLE_ID ou BASEROW_TOKEN manquent dans Vercel.'
    });
  }

  // Helper : GET toutes les lignes (avec noms de colonnes)
  async function fetchAllRows() {
    let results = [];
    let next = `${apiUrl}/api/database/rows/table/${tableId}/?user_field_names=true`;

    while (next) {
      const r = await fetch(next, {
        headers: { Authorization: `Token ${token}` }
      });
      const text = await r.text();
      if (!r.ok) {
        throw new Error(`GET ${r.status}: ${text}`);
      }
      const data = JSON.parse(text);
      results = results.concat(data.results || []);
      next = data.next;
    }
    return results;
  }

  try {
    // 4) Récupérer la ligne correspondant à id_plaque
    const rows = await fetchAllRows();
    const row = rows.find(r => String(r.id_plaque ?? '').trim() === String(id_plaque).trim());

    if (!row) {
      return res.status(404).json({
        error: 'PLAQUE_NOT_FOUND',
        detail: `Aucune ligne avec id_plaque="${id_plaque}".`,
        sampleHead: ['id','order','Name','id_plaque','url_google','actif','date_activation']
      });
    }

    if (row.actif ==
