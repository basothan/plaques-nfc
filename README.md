# Plaques NFC — Mini-plateforme (Vercel + Baserow)

Cette mini-plateforme vous permet :
1. D'activer une plaque via un formulaire (`/index.html`) en enregistrant l'URL Google dans Baserow.
2. De rediriger dynamiquement un QR/NFC (`/qr?id=A3HJ9` ou `0001`) vers l'URL Google associée.

## 🧩 Prérequis
- Compte **Baserow** avec une base **Plaques NFC** et une table **Plaques**.
- Colonnes de la table : `code_plaque` (texte), `url_google` (URL), `actif` (sélection: non/oui), `date_activation` (date), `qr_url` (optionnelle).
- **Token API** Baserow actif.

## 🔧 Configuration (Variables d'environnement sur Vercel)
Créez ces variables dans votre projet Vercel (Settings → Environment Variables) :

- `BASEROW_API_URL` → ex: `https://api.baserow.io` (si vous utilisez Baserow cloud)
- `BASEROW_TABLE_ID` → ID de votre table `Plaques` (ex: `12345`)
- `BASEROW_TOKEN` → votre token API (ex: `baserow_xxx...`)

> Astuce : pour trouver `BASEROW_TABLE_ID`, ouvrez votre table sur Baserow et regardez l'URL, qui contient l'ID numérique de la table.

## 🚀 Déploiement rapide
1. Créez un nouveau repo GitHub et uploadez ces fichiers.
2. Connectez le repo à **Vercel** (Import Project).
3. Ajoutez les **variables d'environnement** ci-dessus.
4. Déployez. Vercel fournira une URL (que vous pourrez remplacer par votre domaine personnalisé ensuite).

## 🌐 Utilisation
- **Activer une plaque** : ouvrez `/index.html`, entrez `code_plaque` et l'URL Google, puis validez.
- **Redirection QR** : scannez ou ouvrez `/qr?id=A3HJ9` (ou `0001` selon votre format).

## 🔒 Sécurité / Anti-abus (recommandations)
- Option : ajouter un **code d’activation** livré avec la plaque (colonne `code_secret`) et valider qu’il correspond.
- Option : limiter un domaine autorisé pour les URL (ex. seulement des liens `https://g.page/...`).

## 🆘 Dépannage
- Erreur 404 sur `/qr` : vérifier que la plaque existe (colonne `code_plaque`) et que l’ID passé en `?id=` correspond exactement (casse ignorée).
- Redirection ne fonctionne pas : vérifier `actif = "oui"` et que `url_google` est bien remplie.
- API Baserow 401/403 : vérifier le **token** et les **droits** du token sur la base.

---

Fichiers clés :
- `index.html` : formulaire d’activation (français) — **envoie `code_plaque`**
- `api/activate.js` : enregistre l’URL, passe `actif` à `oui`, renseigne la date
- `api/qr.js` : redirection dynamique vers l’URL si activée (recherche par **`code_plaque`**)
- `vercel.json` : configuration (facultatif)
