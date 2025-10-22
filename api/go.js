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
    const code =
      req.query.code?.toString().trim() ||
      req.query.id?.toString().trim() ||
      req.query.c?.toString().trim();

    if (!code) return res.status(400).send("Missing ?code=");

    const api = process.env.BASEROW_API_URL || "https://api.baserow.io";
    const tableId = process.env.BASEROW_TABLE_ID;
    const token = process.env.BASEROW_TOKEN;
    if (!tableId || !token)
      return res.status(500).send("Server not configured.");

    const headers = { Authorization: `Token ${token}` };

    const r = await fetch(
      `${api}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`,
      { headers }
    );
    if (!r.ok) return res.status(r.status).send(await r.text());
    const data = await r.json();

    const row = (data.results || []).find(
      (x) =>
        (x.code_plaque || "").toString().trim().toLowerCase() ===
        code.toLowerCase()
    );

    if (!row) return redirect(res, `/erreur.html?code=${encodeURIComponent(code)}`);
    if (!row.url_google)
      return redirect(res, `/?code=${encodeURIComponent(code)}`);

    const current = Number(row.scan_count || 0);
    await fetch(
      `${api}/api/database/rows/table/${tableId}/${row.id}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ scan_count: current + 1 }),
      }
    );

    return redirect(res, normHttps(row.url_google));
  } catch (e) {
    return res.status(500).send(`Server error: ${e.message}`);
  }
}
