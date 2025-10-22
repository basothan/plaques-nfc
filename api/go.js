// /api/go.js
function normHttps(u = "") {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
function redirect(res, to) {
  res.statusCode = 302;
  res.setHeader("Location", to);
  res.end();
}

export default async function handler(req, res) {
  try {
    // Appelé via /go/<code> (via une réécriture) OU /api/go?code=
    const code =
      req.query.code?.toString().trim() ||
      req.query.id?.toString().trim() ||
      req.query.c?.toString().trim();

    if (!code) return res.status(400).send("Missing ?code=");

    const api = process.env.BASEROW_API_URL || "https://api.baserow.io";
    const tableId = process.env.BASEROW_TABLE_ID;
    const token = process.env.BASEROW_TOKEN;
    if (!tableId || !token) return res.status(500).send("Server not configured.");

    const r = await fetch(
      `${api}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`,
      { headers: { Authorization: `Token ${token}` } }
    );
    if (!r.ok) return res.status(r.status).send(await r.text());
    const data = await r.json();

    const row = (data.results || []).find(
      (x) => (x.code_plaque || "").toString().trim().toLowerCase() === code.toLowerCase()
    );

    if (row && row.url_google) {
      return redirect(res, normHttps(row.url_google));
    }
    // Non configuré → page d’activation avec code prérempli
    return redirect(res, `/?code=${encodeURIComponent(code)}`);
  } catch (e) {
    return res.status(500).send(`Server error: ${e.message}`);
  }
}
