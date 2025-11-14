// app.js

(function () {
  const homeSection = document.getElementById("home-section");
  const plaqueSection = document.getElementById("plaque-section");
  const menuSection = document.getElementById("menu-section");

  const globalCodeInput = document.getElementById("global-code");
  const plaqueCodeInput = document.getElementById("plaque-code");
  const menuCodeInput = document.getElementById("menu-code");

  const btnPlaque = document.getElementById("btn-plaque");
  const btnCard = document.getElementById("btn-card");
  const btnMenu = document.getElementById("btn-menu");

  const plaqueBack = document.getElementById("plaque-back");
  const menuBack = document.getElementById("menu-back");

  function show(section) {
    homeSection.classList.add("hidden");
    plaqueSection.classList.add("hidden");
    menuSection.classList.add("hidden");

    if (section === "home") homeSection.classList.remove("hidden");
    if (section === "plaque") plaqueSection.classList.remove("hidden");
    if (section === "menu") menuSection.classList.remove("hidden");
  }

  function syncCodeToForms() {
    const code = (globalCodeInput.value || "").trim().toUpperCase();
    if (code && plaqueCodeInput) plaqueCodeInput.value = code;
    if (code && menuCodeInput) menuCodeInput.value = code;
  }

  // ----- Boutons -----

  if (btnPlaque) {
    btnPlaque.addEventListener("click", function () {
      syncCodeToForms();
      show("plaque");
    });
  }

  if (btnMenu) {
    btnMenu.addEventListener("click", function () {
      syncCodeToForms();
      show("menu");
    });
  }

  if (btnCard) {
    btnCard.addEventListener("click", function () {
      // Redirection vers la plateforme Cartes de visite
      window.location.href = "https://macarte.basothan.fr/activate";
    });
  }

  if (plaqueBack) {
    plaqueBack.addEventListener("click", function () {
      show("home");
    });
  }

  if (menuBack) {
    menuBack.addEventListener("click", function () {
      show("home");
    });
  }

  if (globalCodeInput) {
    globalCodeInput.addEventListener("input", syncCodeToForms);
  }

  // ----- Au chargement : récupérer ?code= dans l'URL -----

  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = (params.get("code") || "").trim().toUpperCase();

  if (codeFromUrl && globalCodeInput) {
    globalCodeInput.value = codeFromUrl;
    syncCodeToForms();

    // On tente de résoudre automatiquement (menu ou plaque déjà configuré)
    fetch("/api/resolve?code=" + encodeURIComponent(codeFromUrl))
      .then((r) => r.json())
      .then((data) => {
        if (data && data.ok && data.url) {
          // Si déjà configuré → redirection directe vers le bon lien
          window.location.href = data.url;
        } else {
          // Sinon on laisse l'utilisateur choisir quoi faire
          show("home");
        }
      })
      .catch(() => {
        show("home");
      });
  } else {
    show("home");
  }
})();
