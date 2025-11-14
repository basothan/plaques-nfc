// api/menu.js

export const config = {
  runtime: "edge",
};

const BASEROW_API_URL =
  process.env.BASEROW_API_URL || "https://api.baserow.io";
const BASEROW_API_TOKEN = process.env.BASEROW_API_TOKEN;
const BASEROW_MENU_TABLE_ID = process.env.BASEROW_MENU_TABLE_ID;

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 🔍 Check des env vars avec message précis
  const missing = [];
  if (!BASEROW_API_TOKEN) missing.push("BASEROW_API_TOKEN");
  if (!BASEROW_MENU_TABLE_ID) missing.push("BASEROW_MENU_TABLE_ID");

  if (missing.length) {
    return new Response(
      "Missing env: " + missing.join(", "),
      { status: 500 }
    );
  }

  try {
    const form = await req.formData();

    const code = (form.get("code") || "").toString().trim().toUpperCase();
    const pdfUrlFromForm = (form.get("pdfUrl") || "").toString().trim();
    const file = form.get("pdfFile");

    if (!code) {
      return new Response("Missing code", { status: 400 });
    }

    let finalPdfUrl = pdfUrlFromForm;

    // 1) Upload du fichier PDF si présent
    if (file instanceof File && file.size > 0) {
      const fd = new FormData();
      fd.set("file", file, file.name);

      const upload = await fetch(
        `${BASEROW_API_URL}/api/user-files/upload-file/`,
        {
          method: "POST",
          headers: { Authorization: `Token ${BASEROW_API_TOKEN}` },
          body: fd,
        }
      );

      if (!upload.ok) {
        const txt = await upload.text();
        console.error("Baserow upload error:", upload.status, txt);
        return new Response("Upload failed", { status: 500 });
      }

      const uploaded = await upload.json();
      if (!uploaded.url) {
        return new Response("No URL returned by Baserow", { status: 500 });
      }

      finalPdfUrl = uploaded.url;
    }

    if (!finalPdfUrl) {
      return new Response("Vous devez fournir un lien ou un fichier PDF.", {
        status: 400,
      });
    }

    // 2) Création de la ligne dans la table "Menus"
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
    );

    const txt = await create.text();
    if (!create.ok) {
      console.error("Baserow create error:", create.status, txt);
      return new Response("Error saving menu", { status: 500 });
    }

    return new Response("Menu enregistré avec succès", { status: 200 });
  } catch (e) {
    console.error("api/menu error:", e);
    return new Response("Internal error", { status: 500 });
  }
}
