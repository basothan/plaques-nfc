// api/qr.js  (CommonJS – Vercel Node runtime)

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
    }

    const { id = '', debug = '' } = req.query || {};
    const code = String(id).trim();

    if (!code) {
      return res.status(400).json({ ok: false, error: 'Paramètre id manquant' });
    }

    const apiUrl  = process.env.BASEROW_API_URL || 'https://api.baserow.io';
    const tableId = process.env.BASEROW_TABLE_ID;
    const token   = process.env.BASEROW_TOKEN;

    if (!tableId || !token) {
      return res.status(500).json({
        ok: false,
        error: 'Configuration manquante (BASEROW_TABLE_ID / BASEROW_TOKEN).'
      });
    }

    const url = `${apiUrl}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`;
    const r = await fetch(url, { headers: { Authorization: `Token ${token}` } });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return res.status(502).json({
        ok: false,
        error: `Erreur Baserow (${r.status})`,
        detail: txt
      });
    }

    const data = await r.json();
    const rows = Array.isArray(data?.results) ? data.results : [];

    const norm = s => String(s || '').trim().toUpperCase();
    const row = rows.find(x => norm(x.id_plaque) === norm(code));

    if (!row) {
      if (debug) return res.status(404).json({ ok: false, error: 'Plaque non trouvée', query: code });
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!doctype html><meta charset="utf-8"><title>Plaque non trouvée</title>
        <style>body{font-family:ui-sans-serif,system-ui;max-width:720px;margin:8vh auto;padding:24px;color:#0f172a}</style>
        <h1>Plaque introuvable</h1><p>Le code <strong>${escapeHtml(code)}</strong> n'existe pas.</p>`);
    }

    const isActive = (() => {
      const v = row.actif;
      if (typeof v === 'boolean') return v;
      if (Array.isArray(v)) return v.map(norm).includes('OUI');
      return norm(v) === 'OUI';
    })();

    if (!isActive) {
      if (debug) return res.status(409).json({ ok: false, error: 'Plaque non activée', row });
      res.statusCode = 409;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!doctype html><meta charset="utf-8"><title>Plaque non activée</title>
        <style>body{font-family:ui-sans-serif,system-ui;max-width:720px;margin:8vh auto;padding:24px;color:#0f172a}</style>
        <h1>Plaque non activée</h1><p>Cette plaque n'est pas encore activée.</p>`);
    }

    const target = String(row.url_google || '').trim();
    if (!/^https?:\/\//i.test(target)) {
      if (debug) return res.status(400).json({ ok: false, error: 'URL Google invalide', row });
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!doctype html><meta charset="utf-8"><title>URL invalide</title>
        <style>body{font-family:ui-sans-serif,system-ui;max-width:720px;margin:8vh auto;padding:24px;color:#0f172a}</style>
        <h1>URL de destination invalide</h1><p>Aucune URL valide n'est renseignée.</p>`);
    }

    if (debug) return res.status(200).json({ ok: true, id: code, redirect: target, row });

    res.statusCode = 302;
    res.setHeader('Location', target);
    return res.end();

  } catch (e) {
    console.error('QR_ERROR', e);
    return res.status(500).json({ ok: false, error: e.message || 'Erreur interne' });
  }
};

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
