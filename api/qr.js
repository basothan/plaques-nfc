// api/qr.js

export const config = {
  runtime: "edge",
};

const BASEROW_API_URL =
  process.env.BASEROW_API_URL || "https://api.baserow.io";

const BASEROW_API_TOKEN =
  process.env.BASEROW_API_TOKEN ||
  process.env.BASEROW_TOKEN ||
  process.env.BASEROW_API_KEY;

const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

function normHttps(u = "") {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const code =
      (url.searchParams.get("code") ||
        url.searchParams.get("id") ||
        url.searchParams.get("c") ||
        "").trim().toUpperCase();
    const info = url.searchParams.get("info"); // "1" pour mode info

    if (!code) {
      return info === "1"
        ? json({ ok: false, step: "no_code", configured: false }, 400)
        : new Response("Missing ?code", { status: 400 });
    }

    if (!BASEROW_API_TOKEN || !BASEROW_TABLE_ID) {
      return info === "1"
        ? json(
            {
              ok: false,
              step: "env",
              configured: false,
              error: "Baserow not configured",
            },
            500
          )
        : new Response("Baserow not configured", { status: 500 });
    }

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

      return info === "1"
        ? json(
            {
              ok: false,
              step: "baserow",
              configured: false,
              status: r.status,
            },
            500
          )
        : new Response("Erreur Baserow", { status: 500 });
    }

    const list = await r.json();
    const row = Array.isArray(list?.results) ? list.results[0] : null;

    if (!row) {
      return info === "1"
        ? json({ ok: false, step: "no_row", configured: false })
        : new Response("Code inconnu.", { status: 404 });
    }

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

    if (info === "1") {
      // Mode info : utilisé par index.html
      return json({
        ok: true,
        code,
        hasRow: !!row,
        configured: !!target,
        url: target || null,
      });
    }

    if (!target) {
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

    return json(
      {
        ok: false,
        step: "catch",
        configured: false,
        error: String(e),
      },
      500
    );
  }
}
