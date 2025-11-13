// app.js

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const initialCode = (params.get("code") || "").toUpperCase();

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

  // Pré-remplir le code si present dans l'URL
  if (initialCode) {
    globalCodeInput.value = initialCode;
    plaqueCodeInput.value = initialCode;
    menuCodeInput.value = initialCode;
  }

  function showHome() {
    homeSection.classList.remove("hidden");
    plaqueSection.classList.add("hidden");
    menuSection.classList.add("hidden");
  }

  function showPlaque() {
    // Sync du code global vers la plaque
    plaqueCodeInput.value = globalCodeInput.value.toUpperCase();
    homeSection.classList.add("hidden");
    plaqueSection.classList.remove("hidden");
    menuSection.classList.add("hidden");
  }

  function showMenu() {
    menuCodeInput.value = globalCodeInput.value.toUpperCase();
    homeSection.classList.add("hidden");
    plaqueSection.classList.add("hidden");
    menuSection.classList.remove("hidden");
  }

  btnPlaque.addEventListener("click", () => {
    showPlaque();
  });

  btnMenu.addEventListener("click", () => {
    showMenu();
  });

  btnCard.addEventListener("click", () => {
    const code = globalCodeInput.value.trim().toUpperCase();
    const base = "https://macarte.basothan.fr/activate";
    // Si tu veux passer le code en paramètre :
    const url = code ? `${base}?code=${encodeURIComponent(code)}` : base;
    window.location.href = url;
  });

  plaqueBack.addEventListener("click", showHome);
  menuBack.addEventListener("click", showHome);
});
