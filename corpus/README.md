# Corpus documentaire de l'Assistant CNSS

Corpus collecté le **21/10/2026** pour alimenter le chatbot de démonstration (CDC DSI-DAT-CDC-003, §8).

## Contenu

| Dossier PDF | Prestation | Périmètre CDC |
|---|---|---|
| `pdf/01-retraite.pdf` | Retraite (normale, anticipée, proportionnelle, réversion, paiements, contrôles) | Volet 1 |
| `pdf/02-prestations-familiales.pdf` | Allocations familiales, allocation de mariage | Volet 2 |
| `pdf/03-maternite.pdf` | Congé et allocation de maternité (réforme 26 semaines) | Volet 2 |
| `pdf/04-accidents-du-travail.pdf` | Accidents du travail, maladies professionnelles, prévention | Volet 2 |
| `pdf/05-assurance-maladie.pdf` | AMU, AMO, PASS, étudiants, carte biométrique, lois et décrets AMU | Hors périmètre (démo) |
| `pdf/06-employeurs-cotisations.pdf` | Affiliation, immatriculation, cotisations, taux, pénalités | Hors périmètre (démo) |
| `pdf/07-cnss-institution-services.pdf` | Institution, structures de soins, services en ligne | Hors périmètre (démo) |
| `pdf/08-textes-et-sources-transverses.pdf` | Textes législatifs, profil AISS de Djibouti (source externe) | Volets 1-2 |
| `pdf/00-catalogue.pdf` | Inventaire de tous les documents et de leurs métadonnées | — |

Chaque document porte les métadonnées demandées par le CDC : prestation, type, référence, date, statut, source, date de collecte et validation (« à valider par le référent métier »).

## Sources

1. **Site cnss.dj** : les 53 pages et 151 articles du plan du site ont été parcourus. Les pages de service et les actualités utiles aux assurés ont été retenues ; recrutements, appels d'offres, galeries et doublons ont été écartés.
2. **PDF officiels publiés sur cnss.dj** : lois, décrets et arrêtés, formulaires, guides, barèmes (41 fichiers, 22 retenus). Les documents scannés (taux de cotisation, dépliant AMU, brochures maternité) ont été **transcrits manuellement** dans `raw/manuel/`.
3. **Source externe** : profil pays de Djibouti publié par l'AISS (Association internationale de la sécurité sociale), politiques au 1er juillet 2022, en traduction française de synthèse. Il est marqué « Source externe — à valider ».

## Fichiers

- `raw/` : textes bruts extraits (pages du site, PDF, transcriptions)
- `documents.json` : catalogue des documents et métadonnées
- `passages.json` : passages indexés par le chatbot
- `corpus.js` : même contenu, chargé par le site (fonctionne aussi hors serveur)
- `pdf/` : dossiers PDF générés

## Mettre à jour le corpus (EF-11)

```bash
pip install reportlab   # si nécessaire
python3 tools/build_corpus.py
```

Ajoutez ou modifiez un document dans `raw/manuel/` (en-têtes `@titre`, `@type`, `@prestation`, `@reference`, `@url`, `@date`, `@statut`, puis des sections `## Titre`), relancez le script, puis publiez.

> ⚠️ Les textes numérisés (lois, arrêtés) contiennent des erreurs de reconnaissance de caractères et doivent être relus par le référent métier avant tout usage en production.
