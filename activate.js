export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { id_plaque, url_google } = req.body;

  if (!id_plaque || !url_google) {
    return res.status(400).json({ error: 'Champs manquants: id_plaque et url_google sont requis.' });
  }

  // Variables d'environnement
  const apiUrl = process.env.BASEROW_API_URL || 'https://api.baserow.io';
  const tableId = process.env.BASEROW_TABLE_ID;
  const token = process.env.BASEROW_TOKEN;

  if (!tableId || !token) {
    return res.status(500).json({ error: 'Configuration manquante (BASEROW_TABLE_ID ou BASEROW_TOKEN).' });
  }

  // Fonction pour récupérer toutes les lignes
  async function fetchAllRows() {
    let results = [];
    let next = `${apiUrl}/api/database/rows/table/${tableId}/?user_field_names=true`;

    while (next) {
      const r = await fetch(next, {
        headers: { Authorization: `Token ${token}` }
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Erreur API Baserow (GET): ${r.status} ${txt}`);
      }

      const data = await r.json();
      results = results.concat(data.results || []);
      next = data.next;
    }

    return results;
  }

  try {
    // 🔍 Étape 1 : Récupérer la ligne correspondant à la plaque
    const rows = await fetchAllRows();
    const row = rows.find(r => String(r.id_plaque || '').trim() === id_plaque.trim());

    if (!row) {
      return res.status(404).json({ error: 'Numéro de plaque introuvable.' });
    }

    if (row.actif === true) {
      return res.status(400).json({ error: 'Plaque déjà activée.' });
    }

    // 🗓️ Étape 2 : Préparer la mise à jour
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const patchUrl = `${apiUrl}/api/database/rows/table/${tableId}/${row.id}/?user_field_names=true`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url_google,
        actif: true, // ✅ booléen, pas 'oui'
        date_activation: today
      })
    });

    if (!patchRes.ok) {
      const txt = await patchRes.text();
      throw new Error(`Erreur API Baserow (PATCH): ${patchRes.status} ${txt}`);
    }

    const updated = await patchRes.json();

    // ✅ Succès
    return res.status(200).json({
      ok: true,
      message: 'Plaque activée avec succès.',
      updated
    });

  } catch (error) {
    console.error('Erreur /api/activate.js →', error);
    return res.status(500).json({ error: error.message || 'Erreur interne du serveur.' });
  }
}
