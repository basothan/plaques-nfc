// qr.js

export const config = {
  runtime: "edge",
};

const BASEROW_API_URL =
  process.env.BASEROW_API_URL || "https://api.baserow.io";

// On accepte plusieurs noms de variables pour le token, selon ce que tu as déjà
const BASEROW_API_TOKEN =
  process.env.BASEROW_API_TOKEN ||
  process.env.BASEROW_TOKEN ||
  process.env.BASEROW_API_KEY;

// Table qui contient les plaques (codes + liens)
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

// Normalisation HTTPS
function normHttps(u = "") {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const code =
      (url.searchParams.get("code") ||
        url.searchParams.get("id") ||
        url.searchParams.get("c") ||
        "").trim().toUpperCase();

    if (!code) {
      return new Response("Missing ?code", { status: 400 });
    }

    if (!BASEROW_API_TOKEN || !BASEROW_TABLE_ID) {
      return new Response("Baserow not configured", { status: 500 });
    }

    // On cherche la ligne correspondant au code
    const r = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&search=${encodeURIComponent(
        code
      )}&size=1`,
      {
        headers: { Authorization: `Token ${BASEROW_API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!r.ok) {
      const t = await r.text();
      console.error("Baserow error:", r.status, t);
      return new Response("Erreur Baserow", { status: 500 });
    }

    const list = await r.json();
    const row = Array.isArray(list?.results) ? list.results[0] : null;

    if (!row) {
      return new Response("Code inconnu.", { status: 404 });
    }

    // On essaie de trouver le bon champ lien parmi plusieurs noms possibles
    const candidates = [
      "Lien",
      "URL",
      "Url",
      "Lien Google",
      "Google",
      "Lien cible",
    ];

    let target = "";
    for (const key of candidates) {
      if (typeof row[key] === "string" && row[key].trim()) {
        target = row[key].trim();
        break;
      }
    }

    if (!target) {
      // Code connu mais aucun lien configuré
      return new Response(
        "Ce code est enregistré mais aucun lien n’est configuré pour l’instant.",
        { status: 200 }
      );
    }

    const redirectTo = normHttps(target);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  } catch (e) {
    console.error("qr error:", e);
    return new Response("Erreur interne", { status: 500 });
  }
}
