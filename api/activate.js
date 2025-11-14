// api/activate.js

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return json({ ok: false, error: "Méthode non autorisée" }, 405);
    }

    if (!BASEROW_API_TOKEN || !BASEROW_TABLE_ID) {
      return json(
        { ok: false, error: "Baserow non configuré (env manquantes)" },
        500
      );
    }

    const form = await req.formData();
    const code = (form.get("code") || "").toString().trim().toUpperCase();
    const url = (form.get("url") || "").toString().trim();

    if (!code || !url) {
      return json(
        { ok: false, error: "Champs manquants (code ou url vide)" },
        400
      );
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 1) Chercher si une ligne existe déjà pour ce code_plaque
    const searchRes = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&search=${encodeURIComponent(
        code
      )}&size=1`,
      {
        headers: { Authorization: `Token ${BASEROW_API_TOKEN}` },
      }
    );

    if (!searchRes.ok) {
      const t = await searchRes.text();
      console.error("Baserow search error", searchRes.status, t);
      return json(
        {
          ok: false,
          error: "Erreur Baserow (search)",
          status: searchRes.status,
        },
        500
      );
    }

    const searchList = await searchRes.json();
    const existingRow = Array.isArray(searchList?.results)
      ? searchList.results[0]
      : null;

    const payload = {
      code_plaque: code,
      url_google: url,
      actif: true,
      date_activation: today,
    };

    let finalRowId = null;

    if (existingRow && existingRow.id) {
      // 2a) UPDATE si la ligne existe déjà
      const updateRes = await fetch(
        `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/${existingRow.id}/?user_field_names=true`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Token ${BASEROW_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const updateTxt = await updateRes.text();

      if (!updateRes.ok) {
        console.error("Baserow update error", updateRes.status, updateTxt);
        return json(
          {
            ok: false,
            error: "Erreur Baserow (update)",
            status: updateRes.status,
            body: updateTxt,
          },
          500
        );
      }

      const updated = JSON.parse(updateTxt);
      finalRowId = updated.id || existingRow.id;
    } else {
      // 2b) CREATE sinon
      const createRes = await fetch(
        `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${BASEROW_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const createTxt = await createRes.text();

      if (!createRes.ok) {
        console.error("Baserow create error", createRes.status, createTxt);
        return json(
          {
            ok: false,
            error: "Erreur Baserow (create)",
            status: createRes.status,
            body: createTxt,
          },
          500
        );
      }

      const created = JSON.parse(createTxt);
      finalRowId = created.id;
    }

    return json({ ok: true, code, rowId: finalRowId });
  } catch (e) {
    console.error("activate error:", e);
    return json(
      { ok: false, error: e?.message || String(e) || "Erreur inconnue" },
      500
    );
  }
}
