// /api/activate.js  (CommonJS)

const API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const TABLE_ID = process.env.BASEROW_TABLE_ID;
const TOKEN   = process.env.BASEROW_TOKEN;

// Petite aide pour répondre proprement
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

// Récupère toutes les lignes de la table (pagination simple)
async function fetchAllRows() {
  let results = [];
  let url = `${API_URL}/api/database/rows/table/${TABLE_ID}/?user_field_names=true`;
  // Si besoin de pagination, on enchaîne les "next"
  while (url) {
    const r = await fetch(url, {
      headers: { Authorization: `Token ${TOKEN}` }
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Erreur API Baserow (GET ${r.status}): ${txt}`);
    }
    const data = await r.json();
    results = results.concat(data.results || []);
    url = data.next || null;
  }
  return results;
}

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, { error: 'Méthode non autorisée' });
    }

    // Vérif ENV côté runtime
    if (!TABLE_ID || !TOKEN || !API_URL) {
      return send(res, 500, {
        error: 'Configuration manquante (BASEROW_TABLE_ID / BASEROW_TOKEN / BASEROW_API_URL)'
      });
    }

    // Lecture du body
    let body = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => (body += chunk));
      req.on('end', resolve);
    });

    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      return send(res, 400, { error: 'Corps JSON invalide' });
    }

    const id_plaque = (payload.id_plaque ?? '').toString().trim();
    const url_google = (payload.url_google ?? '').toString().trim();

    if (!id_plaque || !url_google) {
      return send(res, 400, { error: 'Champs manquants : id_plaque et url_google sont requis.' });
    }

    // Récupère la ligne correspondant à l’id_plaque
    const rows = await fetchAllRows();
    const row = rows.find(
      (r) => (r['id_plaque'] ?? '').toString().trim() === id_plaque
    );

    if (!row) {
      return send(res, 404, { error: 'Numéro de plaque introuvable.' });
    }

    // Si déjà actif = "oui", on bloque
    const actif = (row['actif'] ?? '').toString().toLowerCase();
    if (actif === 'oui') {
      return send(res, 400, { error: 'Plaque déjà activée.' });
    }

    // Patch de la ligne (user_field_names=true pour utiliser les noms de colonnes)
    const patchUrl = `${API_URL}/api/database/rows/table/${TABLE_ID}/${row.id}/?user_field_names=true`;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const r2 = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Token ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url_google,
        actif: 'oui',
        date_activation: today
      })
    });

    if (!r2.ok) {
      const txt = await r2.text();
      return send(res, 502, { error: `Erreur API Baserow (PATCH ${r2.status})`, details: txt });
    }

    const updated = await r2.json();

    return send(res, 200, {
      ok: true,
      id: updated.id,
      message: 'Plaque activée avec succès.'
    });
  } catch (e) {
    return send(res, 500, { error: 'Erreur interne', details: e.message });
  }
};
