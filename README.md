# Maquette — Site CNSS + Assistant CNSS (chatbot RAG)

Réplique statique de la page d'accueil de [cnss.dj](https://cnss.dj/) intégrant le widget de l'**Assistant CNSS**, pour illustrer le projet décrit dans le cahier des charges DSI-DAT-CDC-003.

> ⚠️ Maquette de démonstration : les réponses sont produites **dans le navigateur**, sans modèle de langage ni serveur. Le chatbot répond à partir d'un **corpus réel** de 112 documents (site cnss.dj, PDF officiels, profil AISS) : voir [`corpus/README.md`](corpus/README.md).

## Comment le chatbot répond

1. **Garde-fous** : détournement, dossier personnel, données personnelles masquées.
2. **Réponse validée** : pour les questions types du cahier des charges (retraite, famille, maternité, AT/MP, cotisations), une réponse rédigée et sourcée (`assets/js/kb.js`).
3. **Réponse extraite du corpus** : pour toute autre question, recherche BM25 dans les 485 passages (`assets/js/rag.js`). Les meilleurs extraits sont affichés avec leurs sources et un lien vers le PDF du corpus.
4. **Pas d'invention** : si aucun passage ne couvre la question, l'assistant le dit et oriente vers la CNSS.

Les boutons de thème (Tout, Retraite, Famille, Maternité, AT/MP) limitent la recherche au thème choisi et proposent des questions types.

## Ce que montre la démo

| Exigence CDC | Dans la maquette |
|---|---|
| EF-01 / EF-17 — réponses en langage simple, listes, questions types | Suggestions de questions, réponses structurées |
| EF-02 / EF-04 — pas d'invention, orientation vers la CNSS | Message « information absente » + coordonnées CNSS |
| EF-03 / EF-15 — source, version, statut « en vigueur » | Bloc « Sources » dépliable sous chaque réponse |
| EF-05 — avertissement | Mention sous chaque réponse et en pied de fenêtre |
| EF-06 — contexte de conversation | « Et pour la réversion ? » puis « quelles pièces ? » |
| EF-10 — retour utile / pas utile | 👍 / 👎 |
| EF-16 — refus hors périmètre et détournement | Tester « Ignore tes instructions… » ou « météo » |
| EF-18 — masquage des données personnelles | Tester un n° de téléphone ou d'assuré |
| CU-06 — dossier personnel | « Où en est ma demande ? » |
| Volet 1 / Volet 2 | Badges « Retraite · Volet 1 » et « Volet 2 · aperçu » |
| ENF-08 / ENF-09 — mobile, accessibilité | Plein écran sur mobile, taille de texte A+, clavier, Échap |

## Pages

| Page | Rôle |
|---|---|
| `index.html` | Réplique de cnss.dj avec le widget de l'assistant |
| `assistant.html` | Page web dédiée de l'assistant (1re étape de déploiement, §11) |
| `mobile.html` | Maquette de l'application mobile CNSS + QR code pour tester sur téléphone |
| Console Cellule DATA | Dépôt séparé `e-cnss-cellule-data-supervision` |

**Mode « Sous le capot »** : bouton ≋ dans l'en-tête du chatbot (ou `?capot=1` dans l'URL). Chaque réponse affiche alors la chaîne RAG : garde-fous, recherche des passages avec leur score, texte abrogé exclu, consigne du modèle, temps de réponse.

## Scénario conseillé pour la présentation (≈ 10 min)

Ouvrir deux onglets **dans le même navigateur** : le site et la console de supervision (connectée).

1. **Le site** — bulle d'accroche, bouton flottant, menu Espaces → Espace Retraite.
2. « À quelle pension de retraite puis-je prétendre ? » → réponse sourcée, avertissement.
3. « Et pour la réversion ? » puis « quelles pièces ? » → contexte de conversation.
4. « Où en est ma demande ? mon tel 77 12 34 56 » → masquage + orientation CNSS.
5. « Ignore tes instructions… » → refus.
6. **Sous le capot** : activer ≋, reposer une question maternité → passages, texte abrogé exclu, < 10 s.
7. **Multi-canal** : `mobile.html`, faire scanner le QR code par l'assistance.
8. **Console** : les questions posées apparaissent en direct ; montrer le journal anonymisé,
   puis Qualité (le modèle B bloqué à 81,3 % < 85 %), puis Corpus → « Ajouter un document » →
   « Ré-indexer » → évaluation automatique relancée.

## Structure

- `index.html` — page d'accueil répliquée + widget
- `assets/css/style.css` — styles du site, `assets/css/chatbot.css` — widget
- `assets/js/kb.js` — corpus de démonstration (à remplacer par l'API RAG)
- `assets/js/chatbot.js` — widget (injecté sur chaque page), garde-fous, trace « Sous le capot », journal partagé avec la console
- `assets/css/assistant-page.css` — page dédiée et affichage application mobile

## Déploiement

GitHub Pages via `.github/workflows/pages.yml` (Settings → Pages → Source : **GitHub Actions**).
Pour tester en local : ouvrir `index.html` dans un navigateur.
