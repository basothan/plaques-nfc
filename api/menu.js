// api/menu.js

export const config = {
  runtime: "edge",
};

const BASEROW_API_URL =
  process.env.BASEROW_API_URL || "https://api.baserow.io";

// On accepte tes différents noms de token
const BASEROW_API_TOKEN =
  process.env.BASEROW_API_TOKEN ||
  process.env.BASEROW_TOKEN ||
  process.env.BASEROW_API_KEY;

// ID de la table MENUS
const BASEROW_MENU_TABLE_ID = process.env.BASEROW_MENU_TABLE_ID;

// Réponse JSON (pour ne plus voir la grosse page 500)
function json(data) {
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ ok: false, step: "method", error: "Use POST only" });
  }

  // Vérif env vars
  const missing = [];
  if (!BASEROW_API_TOKEN)
    missing.push("BASEROW_API_TOKEN / BASEROW_TOKEN / BASEROW_API_KEY");
  if (!BASEROW_MENU_TABLE_ID) missing.push("BASEROW_MENU_TABLE_ID");

  if (missing.length) {
    return json({
      ok: false,
      step: "env",
      error: "Missing env vars",
      missing,
    });
  }

  try {
    const form = await req.formData().catch((e) => {
      throw new Error("formData error: " + String(e));
    });

    const code = (form.get("code") || "").toString().trim().toUpperCase();
    const file = form.get("pdfFile");

    if (!code) {
      return json({
        ok: false,
        step: "validation",
        error: "Missing code",
      });
    }

    if (!(file instanceof File) || file.size === 0) {
      return json({
        ok: false,
        step: "validation",
        error: "Fichier PDF obligatoire",
      });
    }

    // 1) Upload du fichier PDF vers Baserow
    const fd = new FormData();
    fd.set("file", file, file.name);

    const upload = await fetch(
      `${BASEROW_API_URL}/api/user-files/upload-file/`,
      {
        method: "POST",
        headers: { Authorization: `Token ${BASEROW_API_TOKEN}` },
        body: fd,
      }
    ).catch((e) => {
      throw new Error("upload fetch error: " + String(e));
    });

    const uploadTxt = await upload.text();
    let uploaded = null;
    try {
      uploaded = uploadTxt ? JSON.parse(uploadTxt) : null;
    } catch {
      uploaded = null;
    }

    if (!upload.ok) {
      return json({
        ok: false,
        step: "upload_response",
        status: upload.status,
        body: uploadTxt,
      });
    }

    if (!uploaded || !uploaded.url) {
      return json({
        ok: false,
        step: "upload_no_url",
        raw: uploaded,
      });
    }

    const finalPdfUrl = uploaded.url;

    // 2) Création de la ligne dans la table MENUS
    // Champs attendus : "Code" (texte) + "Lien PDF" (texte)
    const payload = {
      Code: code,
      "Lien PDF": finalPdfUrl,
    };

    const create = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_MENU_TABLE_ID}/?user_field_names=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${BASEROW_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    ).catch((e) => {
      throw new Error("create fetch error: " + String(e));
    });

    const createdTxt = await create.text();
    let created = null;
    try {
      created = createdTxt ? JSON.parse(createdTxt) : null;
    } catch {
      created = null;
    }

    if (!create.ok) {
      return json({
        ok: false,
        step: "create_response",
        status: create.status,
        body: createdTxt,
        sent: payload,
      });
    }

    // ✅ Succès
    return json({
      ok: true,
      step: "done",
      code,
      pdf: finalPdfUrl,
      baserow: created,
    });
  } catch (e) {
    return json({
      ok: false,
      step: "catch",
      error: String(e),
    });
  }
}
