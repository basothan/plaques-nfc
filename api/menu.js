// api/menu.js

export const config = {
  runtime: "edge",
};

const BASEROW_API_URL =
  process.env.BASEROW_API_URL || "https://api.baserow.io";

// On essaye plusieurs noms possibles (ceux que tu utilises déjà ailleurs)
const BASEROW_API_TOKEN =
  process.env.BASEROW_API_TOKEN ||
  process.env.BASEROW_TOKEN ||
  process.env.BASEROW_API_KEY;

// ⚠️ à définir dans Vercel : BASEROW_MENU_TABLE_ID (ID DE TABLE)
const BASEROW_MENU_TABLE_ID = process.env.BASEROW_MENU_TABLE_ID;
