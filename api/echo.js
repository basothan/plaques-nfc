// /api/echo.js  (diagnostic: vérifie que le body arrive bien)
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    return res.status(200).json({ ok: true, received: body, type: typeof req.body });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Erreur interne' });
  }
};
