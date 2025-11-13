// api/menu.js
export const config = {
  runtime: "edge",
};

const BASEROW_API_URL =
  process.env.BASEROW_API_URL || "https://api.baserow.io";
const BASEROW_API_TOKEN = process.env.BASEROW_API_TOKEN;
// ⚠️ à créer dans ton .env
const BASEROW_MENU_TABLE_ID = process.env.BASEROW_MENU_TABLE_ID; 

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try:
  {
    const form = await req.formData();
    const code = (form.get("code") || "").toString().trim();
    const pdfUrlFromForm = (form.get("pdfUrl") || "").toString().trim();
    const file = form.get("pdfFile");

    if (!code) {
      return new Response("Missing code", { status: 400 });
    }

    if (!BASEROW_API_TOKEN || !BASEROW_MENU_TABLE_ID) {
      return new Response("Baserow not configured", { status: 500 });
    }

    let finalPdfUrl = pdfUrlFromForm || "";

    // 1) Si un fichier PDF est envoyé, on l'upload vers Baserow
    if (file && file instanceof File && file.size > 0) {
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

    // 2) Création de la ligne dans la table "menus"
    // Adapte les noms des champs à ta table Baserow :
    // ex. "Code" (texte) + "Menu PDF" (champ fichier) ou "Lien PDF" (texte)
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

    // Tu peux aussi faire une redirection vers une page de succès
    return new Response("Menu enregistré avec succès", { status: 200 });
  } catch (e) {
    console.error("api/menu error:", e);
    return new Response("Internal error", { status: 500 });
  }
}
