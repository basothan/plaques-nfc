// api/activate.js  — CommonJS compatible (pas d'ESM)
// Utilise les variables d'env : BASEROW_API_URL, BASEROW_TABLE_ID, BASEROW_TOKEN

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // --- Lecture du body JSON ---
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    const id_plaque = (body?.id_plaque ?? '').toString().trim();
    const url_google = (body?.url_google ?? '').toString().trim();

    if (!id_plaque || !url_google) {
      return res
        .status(400)
        .json({ error: 'Champs manquants: id_plaque et url_google sont requis.' });
    }

    // (Facultatif) validation simple d’URL
    try {
      // Accepte tout URL http/https
      const u = new URL(url_google);
      if (!/^https?:$/.test(u.protocol)) {
        return res.status(400).json({ error: 'URL invalide (http/https requis).' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'URL invalide.' });
    }

    // --- ENV ---
    const apiUrl  = process.env.BASEROW_API_URL || 'https://api.baserow.io';
    const tableId = process.env.BASEROW_TABLE_ID;
    const token   = process.env.BASEROW_TOKEN;

    if (!apiUrl || !tableId || !token) {
      return res.status(500).json({
        error: 'Configuration manquante (BASEROW_TABLE_ID, BASEROW_TOKEN, BASEROW_API_URL).'
      });
    }

    const authHeader = { Authorization: `Token ${token}` };

    // --- Récupère les lignes (on prend un “batch” suffisant) ---
    async function listRows(offset = 0, size = 200) {
      const r = await fetch(
        `${apiUrl}/api/database/rows/table/${tableId}/?user_field_names=true&offset=${offset}&limit=${size}`,
        { headers: authHeader }
      );
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Erreur API Baserow (LIST ${r.status}) ${t}`);
      }
      return r.json();
    }

    // On boucle si la table est > 200 lignes (sécurisé)
    let all = [];
    let offset = 0;
    const size = 200;
    // 3 pages max pour éviter boucle infinie (ajuste si besoin)
    for (let i = 0; i < 3; i++) {
      const page = await listRows(offset, size);
      all = all.concat(page?.results ?? []);
      if (!page?.next) break;
      offset += size;
    }

    // Trouve la ligne correspondant à l'id_plaque (colonne 'id_plaque')
    const row = all.find(r => String(r.id_plaque ?? '').trim() === id_plaque);
    if (!row) {
      return res.status(404).json({ error: 'Numéro de plaque introuvable.' });
    }

    // Déjà actif ?
    const actifVal = (row.actif ?? '').toString().toLowerCase();
    if (actifVal === 'oui' || actifVal === 'true' || actifVal === '1' || row.actif === true) {
      return res.status(400).json({ error: 'Plaque déjà activée.' });
    }

    // --- Patch de la ligne (mise à jour) ---
    const patchUrl = `${apiUrl}/api/database/rows/table/${tableId}/${row.id}/?user_field_names=true`;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const r2 = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url_google,
        actif: 'oui',                // si ta colonne est Single select avec "oui"/"non"
        date_activation: today
      })
    });

    if (!r2.ok) {
      const t2 = await r2.text();
      throw new Error(`Erreur API Baserow (PATCH ${r2.status}) ${t2}`);
    }

    const updated = await r2.json();
    return res.status(200).json({ ok: true, id: updated?.id ?? row.id });
  } catch (err) {
    // Log serveur (visible dans Vercel > Functions > Logs)
    console.error('activate.js error:', err);
    return res.status(500).json({ error: 'Erreur interne', detail: String(err?.message || err) });
  }
};
