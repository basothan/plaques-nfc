// /app.js
(function () {
  const form = document.getElementById("activationform");
  const codeInput = document.getElementById("code");
  const urlInput = document.getElementById("url_google");
  const statusEl = document.getElementById("status");
  const okEl = document.getElementById("ok");
  const prefillBox = document.getElementById("prefillBox");
  const overlay = document.getElementById("redirectOverlay");

  const params = new URLSearchParams(window.location.search);
  const preCode = params.get("code");

  function showRedirectOverlay() {
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
  }

  function hideRedirectOverlay() {
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
  }

  // Normalise une URL (ajoute https si manquant)
  function normalizeUrl(u) {
    const s = (u || "").trim();
    if (!s) return s;
    return /^https?:\/\//i.test(s) ? s : "https://" + s;
  }

  // Check si plaque existante et redirige automatiquement si elle a un url_google
  if (preCode) {
    // Préremplissage du champ code (même si on redirige ensuite)
    if (codeInput) {
      codeInput.value = preCode;
      if (prefillBox) {
        prefillBox.classList.remove("hidden");
        prefillBox.textContent = `Numéro détecté : ${preCode}`;
      }
    }

    // Vérification côté serveur
    fetch(`/api/debug?id=${encodeURIComponent(preCode)}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.found && data.found.url_google) {
          // Montre l'overlay, petit délai pour laisser le rendu, puis redirection
          showRedirectOverlay();
          setTimeout(() => {
            // redirige vers l'URL Google (déjà normalisée côté Baserow normalement)
            window.location.href = data.found.url_google;
          }, 160);
        } else {
          // pas d'URL -> reste sur la page d'activation
          hideRedirectOverlay();
        }
      })
      .catch(err => {
        console.error("Erreur vérif activation:", err);
        hideRedirectOverlay();
      });
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

      okEl.scrollIntoView({ behavior: "smooth", block: "center" });

      // Si tu veux rediriger automatiquement après activation (décommenter) :
      // showRedirectOverlay();
      // setTimeout(() => window.location.href = `/api/qr?code=${encodeURIComponent(code_plaque)}`, 600);

    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = `❌ ${err.message || "Erreur inconnue"}`;
    }
  });
})();
