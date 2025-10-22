// /app.js
const form = document.getElementById("activationform");
const codeInput = document.getElementById("code");
const urlInput = document.getElementById("url_google");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const okGif = document.getElementById("okGif");

function setStatus(msg, ok = false) {
  statusEl.textContent = msg;
  statusEl.className =
    "text-sm " + (ok ? "text-green-600" : "text-red-600");
  if (ok) okGif.classList.remove("hidden");
}

function isLikelyGoogleUrl(u) {
  try {
    const url = new URL(u);
    // accepte g.page, maps.app.goo.gl, maps.google.*, link g.page
    return (
      /(^|\.)g\.page$/.test(url.hostname) ||
      /(^|\.)maps\.app\.goo\.gl$/.test(url.hostname) ||
      /(^|\.)google\./.test(url.hostname)
    );
  } catch (_) {
    return false;
  }
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    okGif.classList.add("hidden");
    setStatus("");

    const id_plaque = codeInput.value.trim();
    const url_google = urlInput.value.trim();

    if (!id_plaque || !url_google) {
      return setStatus("Veuillez remplir les deux champs.");
    }
    if (!isLikelyGoogleUrl(url_google)) {
      return setStatus("Veuillez entrer un lien Google valide (g.page, maps, etc.).");
    }

    submitBtn.disabled = true;
    statusEl.className = "text-sm text-gray-600";
    statusEl.textContent = "Activation en cours...";

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_plaque, url_google }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : JSON.stringify(data?.error || data || {});
        throw new Error(msg || "Erreur serveur");
      }

      setStatus("Activation réussie ✅", true);
      codeInput.value = "";
      urlInput.value = "";
    } catch (err) {
      console.error(err);
      setStatus(`Échec de l’activation : ${err.message || err}`);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
