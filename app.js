(function () {
  const form = document.getElementById("activationform");
  const codeInput = document.getElementById("code");
  const urlInput = document.getElementById("url_google");
  const statusEl = document.getElementById("status");
  const okEl = document.getElementById("ok");

  // Prérempli via /?code=<code> (envoyé par /api/go si pas configuré)
  const params = new URLSearchParams(window.location.search);
  const preCode = params.get("code");
  if (preCode && codeInput) codeInput.value = preCode;

  function normalizeUrl(u) {
    const s = (u || "").trim();
    if (!s) return s;
    return /^https?:\/\//i.test(s) ? s : "https://" + s;
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.textContent = "Activation en cours...";
    if (okEl) okEl.classList.add("hidden");

    try {
      const code_plaque = (codeInput?.value || "").trim();
      const url_google = normalizeUrl(urlInput?.value);
      if (!code_plaque || !url_google) throw new Error("Champs manquants");

      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code_plaque, url_google }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.detail || data?.error?.message || data?.error || `Erreur ${res.status}`;
        throw new Error(msg);
      }

      if (statusEl) statusEl.textContent = "✅ Activation réussie";
      if (okEl) okEl.classList.remove("hidden");

      // Option: après succès, rediriger directement vers l’URL cible
      // window.location.href = `/api/go?code=${encodeURIComponent(code_plaque)}`;
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = `❌ ${err.message || "Erreur inconnue"}`;
    }
  });
})();
