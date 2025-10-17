// /api/activate.js  (CommonJS)

function parseBody(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
    return {};
  } catch {
    return {};
  }
}

// Accepte 4 à 10 alphanumériques (maj/min indifférentes)
function isValidCode(code) {
  return /^[A-Z0-9]{4,10}$/.test(String(code || '').toUpperCase());
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch { return false; }
}

async function listRows(apiUrl, tableId, token) {
  const url = `${apiUrl}/api/database/rows/table/${tableId}/?size=200&user_field_names=true`;
  const r = await fetch(url, { headers: { Authorization: `Token ${token}` } });
  if (!r.ok) {
    const txt = await r.text().catch(() => null);
    throw new Error(`Erreur Baserow LIST (${r.status}) ${txt || ''}`);
  }
  const data = await r.json();
  return data?.results || [];
}

async function patchRow(apiUrl, tableId, rowId, token, payload) {
  const url = `${apiUrl}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => null);
    throw new Error(`Erreur Baserow PATCH (${r.status}) ${txt || ''}`);
  }
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
    }

    const { BASEROW_API_URL, BASEROW_TABLE_ID, BASEROW_TOKEN } = process.env;
    if (!BASEROW_API_URL || !BASEROW_TABLE_ID || !BASEROW_TOKEN) {
      console.error('ENV_MISSING', { hasUrl: !!BASEROW_API_URL, hasTable: !!BASEROW_TABLE_ID, hasToken: !!BASEROW_TOKEN });
      return res.status(500).json({ ok: false, error: 'Configuration serveur incomplète' });
    }

    const body = parseBody(req);
    let { id_plaque, url_google } = body;

    if (!id_plaque || !url_google) {
      console.error('BODY_INVALID', { body });
      return res.status(400).json({ ok: false, error: 'Champs manquants: id_plaque et url_google sont requis' });
    }

    id_plaque = String(id_plaque).toUpperCase().trim();
    url_google = String(url_google).trim();

    if (!isValidCode(id_plaque)) {
      return res.status(400).json({ ok: false, error: 'Format du numéro invalide (4–10 caractères alphanumériques)' });
    }
    if (!isValidUrl(url_google)) {
      return res.status(400).json({ ok: false, error: 'URL invalide' });
    }

    const rows = await listRows(BASEROW_API_URL, BASEROW_TABLE_ID, BASEROW_TOKEN);

    // ✅ Recherche par le bon NOM DE COLONNE: id_plaque
    const row = rows.find(r => String(r.id_plaque || '').toUpperCase().trim() === id_plaque);
    if (!row) {
      return res.status(404).json({ ok: false, error: 'Numéro de plaque introuvable' });
    }

    // Déjà activée ?
    const actifVal = String(row.actif || '').toLowerCase();
    if (actifVal === 'oui' || row.actif === true) {
      // ✅ Utiliser 409 pour coller au front
      return res.status(409).json({ ok: false, error: 'Plaque déjà activée' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const updated = await patchRow(BASEROW_API_URL, BASEROW_TABLE_ID, row.id, BASEROW_TOKEN, {
      url_google,
      actif: 'oui',
      date_activation: today
    });

    console.log('ACTIVATE_OK', { id_plaque, rowId: row.id });
    return res.status(200).json({ ok: true, id: updated?.id, message: 'Activation réussie' });

  } catch (e) {
    console.error('ACTIVATE_ERROR', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Erreur interne' });
  }
};
