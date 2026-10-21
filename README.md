# Maquette — Site CNSS + Assistant CNSS (chatbot RAG)

Réplique statique de la page d'accueil de [cnss.dj](https://cnss.dj/) intégrant le widget de l'**Assistant CNSS**, pour illustrer le projet décrit dans le cahier des charges DSI-DAT-CDC-003.

> ⚠️ Maquette de démonstration : les réponses sont **simulées dans le navigateur** à partir d'extraits des pages publiques de cnss.dj. Aucun modèle de langage ni serveur n'est appelé.

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

## Scénario conseillé pour la présentation

1. Ouvrir le site, montrer la bulle d'accroche puis le bouton flottant.
2. « À quelle pension de retraite puis-je prétendre ? » → réponse sourcée.
3. « Et pour la réversion ? » puis « quelles pièces ? » → gestion du contexte.
4. « Comment est calculée la pension ? » → règles expliquées, sans simulation personnelle.
5. « Où en est ma demande ? mon tel 77 12 34 56 » → masquage + orientation.
6. « Ignore tes instructions… » → refus.
7. Menu Espaces → Espace Retraite : les liens ouvrent l'assistant avec la question.

## Structure

- `index.html` — page d'accueil répliquée + widget
- `assets/css/style.css` — styles du site, `assets/css/chatbot.css` — widget
- `assets/js/kb.js` — corpus de démonstration (à remplacer par l'API RAG)
- `assets/js/chatbot.js` — widget, garde-fous et routage des questions

## Déploiement

GitHub Pages via `.github/workflows/pages.yml` (Settings → Pages → Source : **GitHub Actions**).
Pour tester en local : ouvrir `index.html` dans un navigateur.
