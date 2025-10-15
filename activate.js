export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const { id_plaque, url_google } = req.body || {};
  if (!id_plaque || !url_google) {
    return res.status(400).json({ error: 'Champs manquants: id_plaque et url_google sont requis.' });
  }

  const apiUrl = process.env.BASEROW_API_URL || 'https://api.baserow.io';
  const tableId = process.env.BASEROW_TABLE_ID;
  const token = process.env.BASEROW_TOKEN;

  if (!tableId || !token) {
    return res.status(500).json({ error: 'Configuration manquante (BASEROW_TABLE_ID, BASEROW_TOKEN).' });
  }

  async function fetchAllRows() {
    let results = [];
    let next = `${apiUrl}/api/database/rows/table/${tableId}/?user_field_names=true`;
    while (next) {
      const r = await fetch(next, {
        headers: { Authorization: `Token ${token}` }
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Erreur API Baserow (GET): ${r.status} ${t}`);
      }
      const data = await r.json();
      results = results.concat(data.results || []);
      next = data.next;
    }
    return results;
  }

  try {
    const rows = await fetchAllRows();
    const row = rows.find((row) => (row['id_plaque'] || '').trim() === id_plaque.trim());
    if (!row) {
      return res.status(404).json({ error: 'Numéro de plaque introuvable.' });
    }
    if ((row['actif'] || '').toLowerCase() === 'oui') {
      return res.status(400).json({ error: 'Plaque déjà activée.' });
    }

    // Mettre à jour la ligne correspondante
    const patchUrl = `${apiUrl}/api/database/rows/table/${tableId}/${row.id}/?user_field_names=true`;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const r2 = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url_google: url_google,
        actif: 'oui',
        date_activation: today
      })
    });
    if (!r2.ok) {
      const t2 = await r2.text();
      throw new Error(`Erreur API Baserow (PATCH): ${r2.status} ${t2}`);
    }
    const updated = await r2.json();
    return res.status(200).json({ ok: true, id: updated.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Erreur interne' });
  }
}
