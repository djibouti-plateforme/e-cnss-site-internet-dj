// Corpus de démonstration — extraits des pages publiques de cnss.dj.
// Dans la solution cible (CDC DSI-DAT-CDC-003 §9), ces passages proviendront
// de la base vectorielle alimentée par le corpus officiel validé.
window.CNSS_KB = (function () {
  const LOI_RETRAITE = 'Loi n°154/AN/02/4ème L portant codification du régime général de retraite des travailleurs salariés';
  const SRC = {
    normale: { doc: 'Pensions de retraite Normale', url: 'https://cnss.dj/pensions-de-retraite-normale/' },
    anticipee: { doc: 'Pensions de retraite Anticipée', url: 'https://cnss.dj/pensions-de-retraite-anticipee/' },
    prop: { doc: 'Pensions de retraite Proportionnelle', url: 'https://cnss.dj/pensions-de-retraite-proportionnelle/' },
    reversion: { doc: 'Pensions de retraite Réversion', url: 'https://cnss.dj/pensions-de-retraite-reversion/' },
    famille: { doc: 'Prestations familiales', url: 'https://cnss.dj/prestations-familiales/' },
    mariage: { doc: 'Allocations de mariage', url: 'https://cnss.dj/allocations-de-mariage/' },
    maternite: { doc: 'Allocation de Maternité', url: 'https://cnss.dj/allocation-de-maternite/' },
    at: { doc: 'Accident de Travail', url: 'https://cnss.dj/accident-de-travail/' },
  };
  const src = (k, ref, version) => Object.assign({}, SRC[k], { ref, version, statut: 'En vigueur' });

  const entries = {
    'r-types': {
      theme: 'retraite', volet: 1,
      text: `Selon votre situation, la CNSS prévoit **4 types de pension de retraite** :

- **Pension normale** : à partir de **60 ans**, avec une durée minimale de cotisation (25 ans pour les personnes nées en 1951 et après).
- **Pension anticipée** : dès **50 ans**, en cas d'accident, de maladie professionnelle ou d'inaptitude au travail constatée par un médecin de la CNSS.
- **Pension proportionnelle** : à **55 ans**, si vous avez cotisé **au moins 15 ans** sans atteindre la durée minimale requise.
- **Pension de réversion** : versée au(x) conjoint(s) et aux orphelins d'un retraité décédé.

Pour savoir laquelle vous concerne, regardez d'abord votre âge et votre nombre d'années de cotisation.`,
      sources: [src('normale', LOI_RETRAITE + ', art. 45', 'Loi 2002 — page consultée le 21/10/2026'), src('anticipee', LOI_RETRAITE + ', art. 63', 'Loi 2002'), src('prop', 'Arrêté n°2004-0309/PR/MESN', '2004')],
      followups: ['Quelles sont les conditions de la pension normale ?', 'Qui peut partir en retraite anticipée ?', "Combien d'années faut-il avoir cotisé ?"],
    },
    'r-normale-cond': {
      theme: 'retraite', volet: 1,
      text: `Pour obtenir une **pension de retraite normale**, vous devez remplir **3 conditions** :

1. Être **immatriculé** à la CNSS.
2. Être âgé d'**au moins 60 ans** révolus.
3. Avoir cotisé un **nombre minimum d'années** au régime vieillesse, qui dépend de votre année de naissance :

| Année de naissance | Durée minimale |
|---|---|
| 1946 et avant | 15 ans |
| 1947 | 17 ans |
| 1948 | 19 ans |
| 1949 | 21 ans |
| 1950 | 23 ans |
| 1951 et après | 25 ans |

Si vous êtes « né en… » ou « né vers… », la date retenue est le **1er janvier**.`,
      sources: [src('normale', LOI_RETRAITE + ', art. 45', 'Loi 2002 — page consultée le 21/10/2026')],
      followups: ['Quels documents dois-je fournir ?', 'Comment est calculée la pension ?', "Et si je n'ai pas assez cotisé ?"],
    },
    'r-duree': {
      theme: 'retraite', volet: 1,
      text: `La **durée minimale de cotisation** exigée dépend de votre année de naissance :

| Année de naissance | Durée minimale |
|---|---|
| 1946 et avant | 15 ans |
| 1947 | 17 ans |
| 1948 | 19 ans |
| 1949 | 21 ans |
| 1950 | 23 ans |
| 1951 et après | 25 ans |

Si vous avez **55 ans** et au moins **15 ans** de cotisation sans atteindre cette durée, vous pouvez demander une **pension proportionnelle**. En dessous de 15 ans, une **allocation unique** égale à votre part salariale des cotisations vieillesse peut être versée.`,
      sources: [src('normale', LOI_RETRAITE + ', art. 45', 'Loi 2002'), src('prop', 'Arrêté n°2004-0309/PR/MESN', '2004')],
      followups: ["Qu'est-ce que la pension proportionnelle ?", 'Quelles sont les conditions de la pension normale ?'],
    },
    'r-calcul': {
      theme: 'retraite', volet: 1,
      text: `La pension normale est calculée à partir de la **moyenne des salaires bruts (plafonnés) des 10 dernières années**, multipliée par un **taux d'annuité** pour chaque année cotisée :

- **2 %** par année acquise jusqu'au 31/12/2001
- **1,8 %** par année acquise du 01/01/2002 au 31/12/2006
- **1,5 %** par année acquise à partir du 01/01/2007

La pension représente ainsi entre **30 % et 81 %** du salaire déclaré.

**Pension minimale** : 170 000 FDJ par an, soit environ **14 167 FDJ par mois** (seuil utilisé dans les exemples de la CNSS). **Pension maximale** : 81 % du salaire moyen des 10 dernières années.

**Exemple publié par la CNSS** : salaire moyen de 290 414 FDJ, 24 ans à 2 % et 5 ans à 1,8 % → 139 398 + 20 909 = **160 307 FDJ par mois**.

ℹ️ Je peux expliquer les règles de calcul, mais je ne réalise pas de simulation personnelle : pour connaître votre montant exact, adressez-vous à un guichet de la CNSS.`,
      sources: [src('normale', LOI_RETRAITE, 'Loi 2002 — page consultée le 21/10/2026'), { doc: 'Profil pays Djibouti — AISS', ref: 'Pension de vieillesse : minimum et maximum', version: 'Politiques au 01/07/2022', statut: 'Source externe', url: 'https://www.issa.int/sites/default/files/documents/2024-07/Djibouti.pdf', pdf: 'corpus/pdf/08-textes-et-sources-transverses.pdf' }],
      followups: ['Quand la pension est-elle payée ?', 'Comment est calculée la pension anticipée ?'],
    },
    'r-normale-pieces': {
      theme: 'retraite', volet: 1,
      text: `Pour une **pension de retraite normale**, préparez les pièces suivantes :

- Le formulaire de **demande de pension de retraite**, rempli par l'employeur
- Votre **carte d'immatriculation**
- La ou les **attestation(s) de travail**
- **6 photos d'identité**

Pour une pension anticipée, de réversion ou proportionnelle, la liste est différente : demandez-la moi.`,
      sources: [src('normale', 'Rubrique « Comment constituer le dossier ? »', 'Page consultée le 21/10/2026')],
      followups: ['Comment déposer ma demande ?', 'Quelles pièces pour une pension de réversion ?', 'Quelles pièces pour une retraite anticipée ?'],
    },
    'r-demarche': {
      theme: 'retraite', volet: 1,
      text: `Voici comment déposer votre demande de pension :

1. Faites remplir le **formulaire de demande de pension** par votre employeur.
2. Rassemblez les pièces (carte d'immatriculation, attestations de travail, 6 photos).
3. Déposez le dossier **aux guichets de la CNSS** : vous ou votre employeur, **contre récépissé**.

**À quel moment ?** Au plus tôt **3 mois avant vos 60 ans**. Si vous déposez après 60 ans, la pension n'est due qu'à partir du **1er jour du mois suivant le dépôt** : ne tardez pas !`,
      sources: [src('normale', LOI_RETRAITE, 'Loi 2002 — page consultée le 21/10/2026')],
      followups: ['Quels documents dois-je fournir ?', 'Quand la pension est-elle payée ?'],
    },
    'r-paiement': {
      theme: 'retraite', volet: 1,
      text: `La pension est **payée par trimestre, à terme échu**, aux dates suivantes :

- **1er janvier**
- **1er avril**
- **1er juillet**
- **1er octobre**

Le montant est remis à l'intéressé **sur justification de son identité**. Le paiement par procuration n'est admis qu'à titre exceptionnel.`,
      sources: [src('normale', LOI_RETRAITE, 'Loi 2002')],
      followups: ['Comment est calculée la pension ?', 'Comment déposer ma demande ?'],
    },
    'r-anticipee': {
      theme: 'retraite', volet: 1,
      text: `La **pension de retraite anticipée** est possible si vous avez :

- **au moins 50 ans**, et
- été victime d'un **accident** ou d'une **maladie professionnelle**, ou présentez une **inaptitude au travail**,
- un **nombre minimum de mois d'assurance** (art. 63).

La demande doit obligatoirement être accompagnée d'un **rapport médical établi par un médecin de la CNSS**. La Commission d'Inaptitude au Travail statue **dans les 6 mois**.

**Montant** : un pourcentage de la pension normale selon votre âge au dépôt :

| Âge au départ | Taux |
|---|---|
| 50 ans | 50 % |
| 51 ans | 60 % |
| 52 ans | 70 % |
| 53 ans | 80 % |
| 54 ans | 90 % |
| 55 ans | 100 % |`,
      sources: [src('anticipee', LOI_RETRAITE + ', art. 63 et 69', 'Loi 2002 — page consultée le 21/10/2026')],
      followups: ['Quelles pièces pour une retraite anticipée ?', 'Quelles sont les conditions de la pension normale ?'],
    },
    'r-anticipee-pieces': {
      theme: 'retraite', volet: 1,
      text: `Pour une **retraite anticipée**, la demande est formulée **par l'employeur**, avec le rapport médical du médecin-conseil de la CNSS. Pièces à fournir :

- **Demande de mise à la retraite anticipée** dûment remplie
- **Certificat(s) de travail**
- **Carte d'immatriculation**
- **6 photos d'identité**
- **Carte d'identité nationale**
- **Certificat d'inaptitude au travail**

Le dossier est examiné par la Commission d'Inaptitude au Travail, qui statue dans les 6 mois.`,
      sources: [src('anticipee', 'Rubrique « Comment constituer le dossier ? »', 'Page consultée le 21/10/2026')],
      followups: ['Comment est calculée la pension anticipée ?', 'Quand la pension est-elle payée ?'],
    },
    'r-prop': {
      theme: 'retraite', volet: 1,
      text: `La **pension proportionnelle** concerne les travailleurs qui :

- ont **55 ans**,
- sont **immatriculés** à la CNSS,
- ont cotisé **au moins 15 ans**, sans atteindre la durée minimale exigée pour la pension normale.

**Calcul** : pension virtuelle × durée effective de cotisation ÷ durée minimale requise.

Si vous avez 55 ans mais **moins de 15 ans** de cotisation, vous pouvez prétendre à une **allocation unique** égale à la part salariale des cotisations vieillesse que vous avez versées.

Elle est payée dans les mêmes conditions que la pension normale (par trimestre).`,
      sources: [src('prop', 'Arrêté n°2004-0309/PR/MESN', '2004 — page consultée le 21/10/2026'), src('normale', LOI_RETRAITE + ', art. 45', 'Loi 2002')],
      followups: ["Combien d'années faut-il avoir cotisé ?", 'Quels documents dois-je fournir ?'],
    },
    'r-reversion': {
      theme: 'retraite', volet: 1,
      text: `Au décès d'un retraité, une **pension de réversion** est versée :

**Au(x) conjoint(s) : 50 %** de la pension du défunt, si :
- le mariage est **antérieur** à la date de départ en retraite, et
- le mariage a eu lieu **au moins 5 ans avant le décès**.

Les 50 % sont partagés **à parts égales** entre les conjoints remplissant ces conditions. Le droit **s'éteint en cas de remariage**.

**Aux orphelins : 30 %** de la pension, partagés à parts égales (chaque part ne peut dépasser 10 %).

Si le conjoint perçoit déjà une pension de retraite CNSS, sa part de réversion est réduite de 50 %, sauf renonciation écrite à sa propre pension.`,
      sources: [src('reversion', LOI_RETRAITE + ', art. 72 et 74', 'Loi 2002 — page consultée le 21/10/2026')],
      followups: ['Quelles pièces pour une pension de réversion ?', 'Quand la pension est-elle payée ?'],
    },
    'r-reversion-pieces': {
      theme: 'retraite', volet: 1,
      text: `Pour une **pension de réversion**, les pièces principales sont :

- **Formulaire de demande** de pension de réversion
- **Acte de décès** et **acte de mariage** (mariage contracté 5 ans avant le décès)
- **Certificat de non-remariage et non-divorce**
- **Fiche familiale d'état civil** et **actes de naissance** des enfants
- **Certificat de scolarité** (enfants de plus de 15 ans)
- **Certificats de vie et de résidence**, **certificat de responsabilité**
- **Copies des cartes d'identité** de l'assuré et du ou des conjoints, **photos**

Déposez le dossier complet à un guichet de la CNSS.`,
      sources: [src('reversion', 'Rubrique « Quelles sont les pièces à fournir ? »', 'Page consultée le 21/10/2026')],
      followups: ['Qui a droit à la pension de réversion ?'],
    },

    // ---------- Volet 2 (aperçu) ----------
    'f-famille': {
      theme: 'famille', volet: 2,
      text: `Les **allocations familiales** sont versées aux salariés ayant **des enfants à charge** résidant à Djibouti (**6 enfants maximum**).

- **Montant** : **1 400 FDJ par mois et par enfant**
- **Paiement** : par **trimestre**, aux guichets de la CNSS
- Exemple avec 6 enfants : 1 400 × 3 mois × 6 = **25 200 FDJ par trimestre**

**Bénéficiaires** : le père de famille, la femme salariée ayant la charge des enfants, la femme divorcée, veuve ou dont l'époux est au chômage, la mère célibataire.`,
      sources: [src('famille', 'Rubrique « Mode de calcul »', 'Page consultée le 21/10/2026')],
      followups: ['Quelles pièces pour les allocations familiales ?', "Qui a droit à l'allocation de mariage ?"],
    },
    'f-famille-pieces': {
      theme: 'famille', volet: 2,
      text: `Pièces à fournir pour les **allocations familiales** :

- Copie lisible de la **carte d'identité nationale** (avec l'original)
- **Attestation de présence au travail** signée par l'employeur
- **Formulaire de demande** de prestation familiale
- **Extraits d'acte de naissance** des enfants
- **Contrat d'apprentissage** (enfants de 15 à 18 ans) ou **certificat de scolarité** (plus de 15 ans et moins de 21 ans)
- Selon votre situation : certificat de responsabilité, acte de divorce, acte de décès, attestation de chômage de l'époux`,
      sources: [src('famille', 'Rubrique « Pièces à fournir »', 'Page consultée le 21/10/2026')],
      followups: ['Combien sont les allocations familiales ?'],
    },
    'f-mariage': {
      theme: 'famille', volet: 2,
      text: `L'**allocation de mariage** est versée au salarié marié, déclaré et cotisant à la CNSS, ayant une épouse à charge.

**Conditions** :
- Salaire mensuel **inférieur ou égal à 50 000 FDJ**
- L'épouse n'est ni salariée, ni fonctionnaire, ni militaire, ni titulaire d'une patente

**Montant** : **2 500 FDJ par mois** (un seul mariage), soit **7 500 FDJ par trimestre**, payés aux guichets début février, mai, août et novembre.

**Pièces** : CIN, acte de mariage, attestation de l'employeur, certificat de vie et de résidence de l'épouse (annuel).`,
      sources: [src('mariage', 'Page « Allocations de mariage »', 'Page consultée le 21/10/2026')],
      followups: ['Combien sont les allocations familiales ?'],
    },
    'm-maternite': {
      theme: 'maternite', volet: 2,
      text: `Le **congé de maternité** dure **26 semaines** (loi n°51/AN/19/8e L du 04/07/2019). Il concerne toutes les salariées du secteur privé et parapublic déclarées et cotisant à la CNSS.

L'indemnisation est versée **en 3 parties** :

1. **8 semaines** avant l'accouchement — 50 % CNSS / 50 % employeur (plafond 400 000 FDJ)
2. **6 semaines** après la naissance, sur présentation de la fiche de sortie ou de l'acte de naissance — 50/50
3. **12 semaines** mensualisées : la CNSS prend en charge le **salaire net** (sans plafond), sur présentation d'un RIB

Le certificat de grossesse doit être établi par un **gynécologue de la CNSS**.`,
      sources: [src('maternite', 'Loi n°51/AN/19/8e L ; Note technique n°68 du 26/08/2019', '2019 — page consultée le 21/10/2026')],
      followups: ['Quelles pièces pour le congé maternité ?', "Comment sont calculées les indemnités de maternité ?"],
    },
    'm-calcul': {
      theme: 'maternite', volet: 2,
      text: `Calcul des **indemnités de maternité** :

- **1re partie (8 semaines)** : (56 jours × salaire mensuel brut plafonné) ÷ 60
- **2e partie (6 semaines)** : (42 jours × salaire mensuel brut plafonné) ÷ 60
- **3e partie (12 semaines)** : nombre de jours × salaire net journalier (salaire net du mois précédant l'arrêt, sans plafond)

Les deux premières parties sont partagées **50/50 entre la CNSS et l'employeur**, avec un plafond de 400 000 FDJ.`,
      sources: [src('maternite', 'Rubrique « Comment calculer ses indemnités ? »', 'Page consultée le 21/10/2026')],
      followups: ['Quelles pièces pour le congé maternité ?'],
    },
    'm-pieces': {
      theme: 'maternite', volet: 2,
      text: `Pièces à fournir pour l'**allocation de maternité** :

- Copie de la **carte de sécurité sociale**
- **Certificat médical** attestant de la grossesse
- **Attestation d'arrêt de travail**, puis **attestation de reprise**
- Copies des **3 derniers bulletins de salaire** avant l'arrêt
- **Fiche de sortie** et **acte(s) de naissance**

Le dossier complet est déposé au guichet de la CNSS contre accusé de réception.`,
      sources: [src('maternite', 'Rubrique « Pièces à fournir »', 'Page consultée le 21/10/2026')],
      followups: ['Comment est payée l\'allocation de maternité ?'],
    },
    'a-declarer': {
      theme: 'atmp', volet: 2,
      text: `En cas d'**accident de travail ou de trajet** :

1. Le salarié **informe son employeur** dans la journée, au plus tard **sous 24 heures**.
2. L'employeur **déclare l'accident** au service AT/MP de la CNSS **sous 48 heures**.
3. Si l'employeur ne le fait pas, le salarié peut déclarer lui-même l'accident **jusqu'à la fin de la 2e année** qui suit.
4. Faites constater vos blessures par un médecin (certificat médical, à **faire valider par un médecin de la CNSS**).

La CNSS statue sur le caractère professionnel **dans les 30 jours** (délai prolongeable de 2 mois).`,
      sources: [src('at', 'Rubrique « Comment déclarer un accident de travail ? »', 'Page consultée le 21/10/2026')],
      followups: ['Quelles indemnités en cas d\'accident de travail ?', 'Comment déclarer une maladie professionnelle ?'],
    },
    'a-indemn': {
      theme: 'atmp', volet: 2,
      text: `Si l'accident ou la maladie est reconnu d'origine professionnelle :

- **Soins pris en charge à 100 %** : frais médicaux, pharmacie, chirurgie, rééducation, hospitalisation, certaines prothèses
- **Indemnités journalières** dès le lendemain de l'arrêt :
  - **50 %** du salaire journalier pendant les 29 premiers jours
  - **75 %** à partir du **30e jour**
- Une **rente d'incapacité permanente** si votre capacité de travail est réduite après consolidation

Une rechute est prise en charge comme un nouvel accident de travail.`,
      sources: [src('at', 'Rubrique « Indemnités »', 'Page consultée le 21/10/2026')],
      followups: ['Comment déclarer un accident de travail ?'],
    },
    'a-mp': {
      theme: 'atmp', volet: 2,
      text: `Pour une **maladie professionnelle** :

- Déclarez-la à la CNSS **dans les 2 ans** suivant le certificat médical établissant le lien possible avec votre travail.
- Joignez le **certificat médical** à la déclaration.
- La CNSS dispose de **3 mois** (prolongeables de 3 mois) pour statuer.

Les maladies reconnues figurent dans des **tableaux** (maladie, délai de prise en charge, travaux concernés). Hors tableau, un comité de reconnaissance peut être saisi dans certains cas.`,
      sources: [src('at', 'Rubrique « Comment déclarer une maladie professionnelle ? »', 'Page consultée le 21/10/2026')],
      followups: ['Quelles indemnités en cas d\'accident de travail ?'],
    },
    // ---------- Cotisations (hors périmètre CDC — démonstration) ----------
    'c-taux': {
      theme: 'employeur', volet: 0,
      text: `Les **taux de cotisation** appliqués par la CNSS (part employeur + part salarié) sont les suivants :

| Branche (régime général) | Employeur | Salarié | Total |
|---|---|---|---|
| Prestations familiales | 5,5 % | — | 5,5 % |
| Accidents du travail | 1,2 % | — | 1,2 % |
| Retraite | 4 % | 4 % | 8 % |
| Assurance maladie (AMO) | 5 % | 2 % | 7 % |
| **Total** | **15,7 %** | **6 %** | **21,7 %** |

- **Zone franche** : 10,2 % employeur + 6 % salarié = **16,2 %** (pas de prestations familiales).
- **Travailleurs indépendants** : **7 %** pour l'assurance maladie.
- **Fonctionnaires** : 19 % employeur + 8 % agent = **27 %** (dont 14 % + 6 % pour la retraite).

Le plafond des salaires soumis à cotisation est fixé par l'arrêté n°2015-605/PR/MTRA.`,
      sources: [
        { doc: 'Les différents taux de cotisation applicables', url: 'https://cnss.dj/storage/2022/03/taux_applicables.pdf', ref: 'Document CNSS « taux applicables »', version: '2022', statut: 'En vigueur', pdf: 'corpus/pdf/06-employeurs-cotisations.pdf' },
        { doc: 'Profil pays Djibouti — AISS', url: 'https://www.issa.int/sites/default/files/documents/2024-07/Djibouti.pdf', ref: 'Sources des fonds, par branche', version: 'Politiques au 01/07/2022', statut: 'Source externe', pdf: 'corpus/pdf/08-textes-et-sources-transverses.pdf' },
      ],
      followups: ['Quelles sont les pénalités en cas de retard de déclaration ?', 'Comment immatriculer un salarié ?'],
    },
  };

  // Mots-clés par sujet (groupe) et par intention.
  const groups = {
    cotisation: ['taux de cotisation', 'taux cotisation', 'taux des cotisations', 'combien cotise', 'cotisent', 'part patronale', 'part salariale', 'cotisation retraite', 'cotisations sociales', 'cotisation employeur', 'pourcentage de cotisation'],
    reversion: ['revers', 'veuve', 'veuf', 'conjoint', 'orphelin', 'deces', 'decede', 'mort de mon mari', 'mari decede'],
    anticipee: ['anticip', 'inaptitude', 'inapte', '50 ans', 'avant 60', 'plus tot', 'invalid', 'avant l age'],
    proportionnelle: ['proportionnel', 'pas assez cotise', 'pas assez', 'allocation unique', 'moins de 25 ans', '15 ans de cotisation'],
    normale: ['normale', 'ordinaire', '60 ans'],
    retraite: ['retraite', 'pension', 'retraite', 'vieillesse', 'retraitee'],
    mariage: ['mariage', 'epouse', 'marie '],
    maternite: ['maternit', 'enceinte', 'grossesse', 'couche', 'accouch', 'bebe', 'naissance'],
    famille: ['allocations familiales', 'allocation familiale', 'prestation familiale', 'prestations familiales', 'enfant', 'familial'],
    mp: ['maladie professionnelle', 'maladies professionnelles', 'maladie pro'],
    at: ['accident', 'trajet', 'blesse', 'blessure', 'at/mp', 'atmp'],
    amu: ['amu', 'assurance maladie', 'amo', 'biometrique', 'medicament', 'carte de securite sociale', 'pass ', 'etudiant', 'remboursement de soin'],
  };
  const intents = {
    pieces: ['document', 'piece', 'papier', 'fournir', 'justificatif', 'dossier a', 'constituer', 'formulaire'],
    duree: ['duree', 'annees de cotisation', 'combien d annees', 'combien d ans', 'nombre d annees', 'avoir cotise', 'faut-il cotiser', 'faut il cotiser'],
    paiement: ['paye', 'payee', 'payes', 'paie', 'paiement', 'verse', 'versement', 'trimestre', 'quand vais', 'date de'],
    calcul: ['calcul', 'montant', 'combien', 'toucher', 'minimum', 'minimale', 'minimal', 'maximum', 'maximale', 'somme', 'indemn', 'rente', 'prise en charge', 'pourcentage'],
    demarche: ['deposer', 'demarche', 'procedure', 'comment faire', 'comment demander', 'ou aller', 'declarer', 'delai', 'quand deposer', 'faire la demande'],
    conditions: ['condition', 'droit', 'eligib', 'qui peut', 'puis-je', 'puis je', 'age', 'pretendre', 'qui a droit', 'c est quoi', 'qu est-ce', 'qu est ce'],
  };
  const route = {
    cotisation: { _: 'c-taux' },
    normale: { conditions: 'r-normale-cond', calcul: 'r-calcul', pieces: 'r-normale-pieces', demarche: 'r-demarche', paiement: 'r-paiement', duree: 'r-duree', _: 'r-normale-cond' },
    retraite: { conditions: 'r-types', calcul: 'r-calcul', pieces: 'r-normale-pieces', demarche: 'r-demarche', paiement: 'r-paiement', duree: 'r-duree', _: 'r-types' },
    anticipee: { pieces: 'r-anticipee-pieces', demarche: 'r-anticipee-pieces', paiement: 'r-paiement', duree: 'r-duree', _: 'r-anticipee' },
    proportionnelle: { pieces: 'r-anticipee-pieces', paiement: 'r-paiement', duree: 'r-duree', _: 'r-prop' },
    reversion: { pieces: 'r-reversion-pieces', demarche: 'r-reversion-pieces', paiement: 'r-paiement', duree: 'r-duree', _: 'r-reversion' },
    famille: { pieces: 'f-famille-pieces', _: 'f-famille' },
    mariage: { _: 'f-mariage' },
    maternite: { calcul: 'm-calcul', pieces: 'm-pieces', _: 'm-maternite' },
    at: { calcul: 'a-indemn', paiement: 'a-indemn', _: 'a-declarer' },
    mp: { calcul: 'a-indemn', _: 'a-mp' },
  };
  const scopeOfGroup = { normale: 'retraite', retraite: 'retraite', anticipee: 'retraite', proportionnelle: 'retraite', reversion: 'retraite', famille: 'famille', mariage: 'famille', maternite: 'maternite', at: 'atmp', mp: 'atmp' };
  const defaultForScope = { retraite: 'retraite', famille: 'famille', maternite: 'maternite', atmp: 'at' };

  return { entries, groups, intents, route, scopeOfGroup, defaultForScope };
})();
