(function () {
  const form = document.getElementById("activationform");
  const codeInput = document.getElementById("code");
  const urlInput = document.getElementById("url_google");
  const statusEl = document.getElementById("status");
  const okEl = document.getElementById("ok");
  const prefillBox = document.getElementById("prefillBox");

  // Préremplir depuis ?code= (arrive de /api/go si pas configuré)
  const params = new URLSearchParams(window.location.search);
  const preCode = params.get("code");
  if (preCode && codeInput) {
    codeInput.value = preCode;
    if (prefillBox) {
      prefillBox.classList.remove("hidden");
      prefillBox.textContent = `Numéro détecté : ${preCode}`;
    }
  }

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

      // Succès : message + GIF + reset
      if (statusEl) statusEl.textContent = "✅ Activation réussie";
      if (okEl) okEl.classList.remove("hidden");
      form.reset();

      // Option : faire défiler jusqu'au bloc OK
      okEl.scrollIntoView({ behavior: "smooth", block: "center" });

      // Option : redirection auto vers la plaque configurée après 2s
      // setTimeout(() => window.location.href = `/api/go?code=${encodeURIComponent(code_plaque)}`, 2000);
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = `❌ ${err.message || "Erreur inconnue"}`;
    }
  });
})();
