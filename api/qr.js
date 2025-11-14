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

// Normalise les URL (ajoute https si manquant)
function normHttps(u = "") {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// Helper JSON
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
    const info = url.searchParams.get("info"); // "1" => mode info

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

    // 🔥 NOUVEAU : on filtre explicitement sur le champ "code_plaque"
    const params = new URLSearchParams();
    params.set("user_field_names", "true");
    params.set("size", "1");
    params.set("filter__code_plaque__equal", code);

    const r = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?${params.toString()}`,
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
      // ❌ Aucune ligne avec ce code_plaque
      return info === "1"
        ? json({ ok: false, step: "no_row", configured: false })
        : new Response("Code inconnu.", { status: 404 });
    }

    // Sécurité : on relit le champ depuis la ligne
    const codeFromRow =
      (row["code_plaque"] || row["Code"] || "").toString().toUpperCase();

    if (codeFromRow && codeFromRow !== code) {
      // Si jamais ça ne match pas, on indique un mismatch
      return info === "1"
        ? json({ ok: false, step: "mismatch", configured: false })
        : new Response("Code inconnu.", { status: 404 });
    }

    // URL cible : on prend d'abord url_google, sinon qr_url en backup
    let target = "";
    if (typeof row["url_google"] === "string" && row["url_google"].trim()) {
      target = row["url_google"].trim();
    } else if (typeof row["qr_url"] === "string" && row["qr_url"].trim()) {
      target = row["qr_url"].trim();
    }

    if (info === "1") {
      // Mode info utilisé par index.html
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
