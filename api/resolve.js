// api/resolve.js

export const config = {
  runtime: "edge",
};

const BASEROW_API_URL =
  process.env.BASEROW_API_URL || "https://api.baserow.io";

// On accepte tes différents noms de token déjà présents
const BASEROW_API_TOKEN =
  process.env.BASEROW_API_TOKEN ||
  process.env.BASEROW_TOKEN ||
  process.env.BASEROW_API_KEY;

// Table PLAQUES (ancienne table, déjà utilisée par /api/activate)
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

// Table MENUS (celle qu’on vient de créer)
const BASEROW_MENU_TABLE_ID = process.env.BASEROW_MENU_TABLE_ID;

function json(data) {
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();

  if (!code) {
    return json({ ok: false, step: "no_code", error: "Missing ?code" });
  }

  if (!BASEROW_API_TOKEN) {
    return json({
      ok: false,
      step: "env",
      error: "Missing Baserow token",
    });
  }

  // 1) On regarde d’abord dans la table MENUS (PDF)
  if (BASEROW_MENU_TABLE_ID) {
    try {
      const r = await fetch(
        `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_MENU_TABLE_ID}/?user_field_names=true&search=${encodeURIComponent(
          code
        )}&size=1`,
        {
          headers: { Authorization: `Token ${BASEROW_API_TOKEN}` },
        }
      );

      const list = await r.json();
      const row = Array.isArray(list?.results) ? list.results[0] : null;

      if (row && row["Lien PDF"]) {
        return json({
          ok: true,
          type: "menu",
          code,
          url: row["Lien PDF"],
        });
      }
    } catch (e) {
      return json({
        ok: false,
        step: "menu_fetch",
        error: String(e),
      });
    }
  }

  // 2) Sinon on regarde dans la table PLAQUES (BASEROW_TABLE_ID)
  if (BASEROW_TABLE_ID) {
    try {
      const r = await fetch(
        `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&search=${encodeURIComponent(
          code
        )}&size=1`,
        {
          headers: { Authorization: `Token ${BASEROW_API_TOKEN}` },
        }
      );

      const list = await r.json();
      const row = Array.isArray(list?.results) ? list.results[0] : null;

      if (row) {
        // On essaye de deviner le bon champ lien dans la table Plaques
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

        if (target) {
          return json({
            ok: true,
            type: "plaque",
            code,
            url: target,
          });
        }
      }
    } catch (e) {
      return json({
        ok: false,
        step: "plaque_fetch",
        error: String(e),
      });
    }
  }

  // 3) Rien trouvé → on laisse la page de config s’occuper du reste
  return json({
    ok: false,
    step: "not_found",
    code,
  });
}
