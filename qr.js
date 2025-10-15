export default async function handler(req, res) {
  const { id } = req.query || {};
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<h1>Paramètre manquant</h1><p>Utilisez <code>?id=0001</code>.</p>`);
  }

  const apiUrl = process.env.BASEROW_API_URL || 'https://api.baserow.io';
  const tableId = process.env.BASEROW_TABLE_ID;
  const token = process.env.BASEROW_TOKEN;

  if (!tableId || !token) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<h1>Configuration manquante</h1><p>Variables BASEROW_TABLE_ID et BASEROW_TOKEN requises.</p>`);
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
    const row = rows.find((row) => (row['id_plaque'] || '').trim() === String(id).trim());

    if (!row) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<h1>Plaque introuvable</h1><p>Aucune plaque avec l'identifiant <strong>${id}</strong>.</p>`);
    }
    const actif = (row['actif'] || '').toLowerCase() === 'oui';
    const url = (row['url_google'] || '').trim();

    if (!actif || !url) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<h1>Plaque non activée</h1><p>La plaque <strong>${id}</strong> n'est pas encore activée ou l'URL est manquante.</p>`);
    }

    // Redirection 302
    res.writeHead(302, { Location: url });
    return res.end();
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<h1>Erreur interne</h1><pre>${e.message || e}</pre>`);
  }
}
