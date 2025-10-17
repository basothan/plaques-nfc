// activate.js

const form = document.getElementById('activationForm');
const submitBtn = document.getElementById('submitBtn');
const msg = document.getElementById('message');
const gif = document.getElementById('successGif');

function showMessage(text, type = 'info') {
  msg.textContent = text;
  msg.className = 'text-sm';
  // neutral
  let cls = 'text-gray-700';
  if (type === 'success') cls = 'text-green-600 font-medium';
  if (type === 'error') cls = 'text-red-600 font-medium';
  msg.classList.add(cls);
}

function showGif() {
  if (!gif) return;
  gif.classList.remove('hidden');
  // On masque le gif après 4 secondes
  setTimeout(() => gif.classList.add('hidden'), 4000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const codePlaque = document.getElementById('codePlaque').value.trim();
  const urlGoogle = document.getElementById('urlGoogle').value.trim();

  // Reset UI
  showMessage('');
  gif && gif.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.7';

  try {
    const res = await fetch('/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_plaque: codePlaque,  // côté API on attend id_plaque
        url_google: urlGoogle
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Messages d'erreurs “propres”
      if (res.status === 404) {
        showMessage('Plaque introuvable. Vérifie ton numéro.', 'error');
      } else if (res.status === 409) {
        showMessage('Cette plaque est déjà activée.', 'error');
      } else if (res.status === 400) {
        showMessage(data?.error || 'Champs manquants ou invalides.', 'error');
      } else {
        showMessage('Erreur interne. Réessaie dans un instant.', 'error');
      }
      return;
    }

    // Succès logique renvoyé par l’API
    if (data?.ok) {
      showMessage('Plaque activée avec succès !', 'success');
      showGif();

      // On vide les champs après succès
      form.reset();
    } else {
      // Cas où le backend répond 200 sans ok:true (peu probable)
      showMessage(data?.error || 'Activation non confirmée. Réessaie.', 'error');
    }
  } catch (err) {
    showMessage('Erreur réseau. Vérifie ta connexion et réessaie.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }
});
