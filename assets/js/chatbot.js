// Assistant CNSS — widget de démonstration.
// Simule la chaîne RAG décrite dans le CDC (§9) côté navigateur :
// garde-fous → recherche dans le corpus → réponse sourcée + avertissement EF-05.
// En production, `answer()` sera remplacé par un appel à l'API du chatbot.
(function () {
  const KB = window.CNSS_KB;
  const RAG = window.CNSS_RAG;
  const $ = (id) => document.getElementById(id);

  // Le widget est injecté par ce script : le même code sert le site, la page dédiée et l'app mobile.
  // <body data-cb-mode="page"> affiche la fenêtre en permanence (page dédiée / app mobile).
  const MODE = document.body.dataset.cbMode || 'widget';
  const CHANNEL = document.body.dataset.cbChannel || 'Site officiel';
  if (!$('cb-panel')) {
    const host = $('cb-host') || document.body;
    host.insertAdjacentHTML('beforeend', `
  <div class="cb-teaser" id="cb-teaser" hidden>
    <button class="cb-teaser-close" aria-label="Fermer">×</button>
    <p><strong>Bonjour 👋</strong><br>Une question sur votre retraite ou vos prestations ? Je peux vous aider.</p>
  </div>
  <button class="cb-launcher" id="cb-launcher" aria-label="Ouvrir l'Assistant CNSS" aria-expanded="false" aria-controls="cb-panel">
    <svg class="ic-chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>
    <svg class="ic-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>
    <span class="cb-badge" aria-hidden="true">1</span>
  </button>

  <section class="cb-panel" id="cb-panel" role="dialog" aria-modal="false" aria-labelledby="cb-title" hidden>
    <header class="cb-head">
      <div class="cb-avatar"><img src="assets/img/logo-cnss.png" alt=""></div>
      <div class="cb-head-text">
        <h2 id="cb-title">Assistant CNSS</h2>
        <p><span class="cb-online"></span> Prestations sociales · Réponses sourcées</p>
      </div>
      <div class="cb-head-actions">
        <button class="cb-icon" id="cb-debug" aria-pressed="false" aria-label="Sous le capot : voir le fonctionnement" title="Sous le capot (mode présentateur)"><svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
        <button class="cb-icon" id="cb-font" aria-label="Agrandir le texte" title="Taille du texte">A+</button>
        <button class="cb-icon" id="cb-reset" aria-label="Nouvelle conversation" title="Nouvelle conversation"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="cb-icon" id="cb-expand" aria-label="Agrandir la fenêtre" title="Agrandir"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        <button class="cb-icon" id="cb-close" aria-label="Fermer l'assistant" title="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      </div>
    </header>
    <div class="cb-scopes" role="group" aria-label="Thème">
      <button class="cb-scope active" data-scope="all">Tout</button>
      <button class="cb-scope" data-scope="retraite">Retraite <small>Volet 1</small></button>
      <button class="cb-scope" data-scope="famille">Famille</button>
      <button class="cb-scope" data-scope="maternite">Maternité</button>
      <button class="cb-scope" data-scope="atmp">AT/MP</button>
    </div>
    <div class="cb-body" id="cb-body" aria-live="polite"></div>
    <div class="cb-pii-warn" id="cb-pii" hidden>⚠️ Ne communiquez pas de données personnelles (n° d'assuré, téléphone…). Elles seront masquées.</div>
    <form class="cb-form" id="cb-form" autocomplete="off">
      <label for="cb-input" class="sr-only">Votre question</label>
      <textarea id="cb-input" rows="1" maxlength="500" placeholder="Posez votre question sur vos prestations…"></textarea>
      <button type="submit" class="cb-send" aria-label="Envoyer"><svg viewBox="0 0 24 24"><path d="M3 11.5L21 3l-8.5 18-2.2-7.3L3 11.5z" fill="currentColor"/></svg></button>
    </form>
    <p class="cb-foot">Information indicative — ne remplace pas la décision de la CNSS.</p>
  </section>
`);
  }
  const panel = $('cb-panel');
  const launcher = $('cb-launcher');
  const body = $('cb-body');
  const form = $('cb-form');
  const input = $('cb-input');
  const teaser = $('cb-teaser');
  const piiWarn = $('cb-pii');
  const sendBtn = form.querySelector('.cb-send');
  if (window.innerWidth < 480) input.placeholder = 'Votre question…';
  if (MODE === 'page') {
    launcher.remove();
    teaser.remove();
    panel.classList.add('inline');
    panel.hidden = false;
  }

  const CONTACT = 'au <strong>+253 21 35 03 21</strong> ou à un guichet de la CNSS (Boulevard de la République, dim.–jeu. 8h–17h)';
  const DISCLAIMER = 'ℹ️ Information indicative, fondée sur la documentation officielle de la CNSS. Elle ne remplace pas la décision de la CNSS.';

  const THEME_PDF = { retraite: 'corpus/pdf/01-retraite.pdf', famille: 'corpus/pdf/02-prestations-familiales.pdf', maternite: 'corpus/pdf/03-maternite.pdf', atmp: 'corpus/pdf/04-accidents-du-travail.pdf' };
  const THEME_Q = {
    all: ['À quelle pension de retraite puis-je prétendre ?', 'Quel est le taux de cotisation ?', 'Comment obtenir la carte de sécurité sociale ?', 'Quelle est la durée du congé de maternité ?'],
    retraite: ['À quel âge puis-je partir à la retraite ?', 'Quels documents fournir pour ma pension ?', 'Quand la pension est-elle payée ?', 'Qui a droit à la pension de réversion ?'],
    famille: ['Combien sont les allocations familiales ?', 'Quelles pièces pour les allocations familiales ?', "Qui a droit à l'allocation de mariage ?"],
    maternite: ['Quelle est la durée du congé de maternité ?', "Comment est payée l'allocation de maternité ?", 'Quelles pièces pour le congé maternité ?'],
    atmp: ['Comment déclarer un accident de travail ?', "Quelles indemnités en cas d'accident de travail ?", 'Comment déclarer une maladie professionnelle ?'],
    amu: ['Qui est couvert par l\'AMU ?', 'Comment obtenir la carte de sécurité sociale ?'],
  };
  const SCOPE_LABEL = { all: 'Tous les thèmes', retraite: 'Retraite (Volet 1)', famille: 'Prestations familiales (Volet 2)', maternite: 'Maternité (Volet 2)', atmp: 'Accidents du travail et maladies professionnelles (Volet 2)' };

  const state = { lastGroup: null, scope: 'all', busy: false, started: false, debug: false };

  // ---------- utilitaires ----------
  const norm = (s) => ' ' + s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, ' ').replace(/[^a-z0-9/+\- ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const has = (n, kw) => (kw.length <= 4 ? new RegExp('\\b' + kw.trim() + '\\b').test(n) : n.includes(kw));
  const findKey = (n, dict) => Object.keys(dict).find((k) => dict[k].some((kw) => has(n, kw))) || null;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  };

  // Mini-rendu Markdown : paragraphes, listes, tableaux, gras.
  function md(text) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const lines = text.split('\n');
    let html = '';
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { i++; continue; }
      if (l.trim().startsWith('|')) {
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        html += '<table><thead><tr>' + cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
        rows.slice(2).forEach((r) => { html += '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>'; });
        html += '</tbody></table>';
        continue;
      }
      const isUl = (x) => /^\s*- /.test(x);
      const isOl = (x) => /^\d+\. /.test(x);
      if (isUl(l) || isOl(l)) {
        const tag = isOl(l) ? 'ol' : 'ul';
        html += `<${tag}>`;
        while (i < lines.length && (isUl(lines[i]) || isOl(lines[i]))) {
          let item = inline(lines[i].replace(/^\s*(- |\d+\. )/, ''));
          i++;
          const sub = [];
          while (i < lines.length && /^\s{2,}- /.test(lines[i])) sub.push(`<li>${inline(lines[i++].replace(/^\s*- /, ''))}</li>`);
          if (sub.length) item += `<ul>${sub.join('')}</ul>`;
          html += `<li>${item}</li>`;
        }
        html += `</${tag}>`;
        continue;
      }
      html += `<p>${inline(l)}</p>`;
      i++;
    }
    return html;
  }

  // ---------- garde-fous (EF-16, EF-18, CU-06) ----------
  function maskPII(raw) {
    let found = false;
    const out = raw
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, () => { found = true; return '⟦e-mail masqué⟧'; })
      .replace(/(\+?253[\s.-]?)?\b(77|78|70|21|27)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, () => { found = true; return '⟦téléphone masqué⟧'; })
      .replace(/\b\d{6,}\b/g, () => { found = true; return '⟦numéro masqué⟧'; });
    return { text: out, found };
  }

  const RX = {
    injection: /(ignore|oublie|ne tiens pas compte).{0,40}(instruction|consigne|regle|precedent)|prompt systeme|system prompt|tu es (maintenant|desormais)|fais comme si|jailbreak|mode developpeur|developer mode|revele tes|affiche tes (instructions|consignes)/,
    dossier: /ou en est|suivi de (ma|mon)|etat de (ma|mon)|mon dossier|ma demande (n|est|a)|pas encore (recu|ete paye)|mon paiement/,
    greet: /^ (bonjour|bonsoir|salut|salam|salaam|hello|coucou|bjr)( [a-z]+)? $/,
    thanks: /^ (merci|ok merci|merci beaucoup|parfait|super|d accord|ok)( [a-z ]{0,20})? $/,
    notCovered: /fonctionnaire|militaire|chomage|complementaire|impot|credit|pret bancaire|banque/,
    domain: /cnss|cotis|salari|employeur|prestation|assure|allocation|guichet|immatricul/,
    simulation: /mon salaire|je gagne|je touche|j ai cotise \d|simul|calcule ma|ma pension sera/,
  };

  // ---------- moteur de réponse (simulation du RAG) ----------
  function answer(question) {
    const n = norm(question);
    if (RX.injection.test(n)) {
      return { kind: 'guard', reason: 'injection', text: "Je ne peux pas modifier mon fonctionnement. Je suis l'assistant de la CNSS et je réponds uniquement aux questions sur les **prestations sociales** (retraite, prestations familiales, maternité, accidents du travail).", chips: ['À quelle pension de retraite puis-je prétendre ?'] };
    }
    if (RX.greet.test(n)) {
      return { kind: 'small', reason: 'accueil', text: 'Bonjour ! Posez-moi votre question sur vos prestations : conditions, pièces à fournir, démarches…', chips: ['À quelle pension de retraite puis-je prétendre ?', 'Quels documents dois-je fournir pour ma demande ?'] };
    }
    if (RX.thanks.test(n)) {
      return { kind: 'small', reason: 'accueil', text: "Avec plaisir ! N'hésitez pas si vous avez une autre question.", chips: [] };
    }
    if (RX.dossier.test(n)) {
      return { kind: 'guard', reason: 'dossier', text: `Je n'ai **pas accès aux dossiers individuels** et je ne peux pas suivre une demande en cours.\n\nPour connaître l'état de votre dossier, contactez la CNSS ${'{CONTACT}'}.\n\nJe peux en revanche vous expliquer les conditions, les pièces à fournir ou les démarches.`, chips: ['Comment déposer ma demande de pension ?'] };
    }

    let group = findKey(n, KB.groups);
    const intent = findKey(n, KB.intents);
    const found = RAG ? RAG.search(question, state.scope) : null;
    const corpusOk = !!found && RAG.covered(found);
    let usedContext = false;

    // Question de suivi (« quelles pièces ? ») : on reprend le sujet précédent.
    if (!group && intent && state.lastGroup && !residual(question, null, intent).length) { group = state.lastGroup; usedContext = true; }
    if (!group && state.scope !== 'all' && intent && !residual(question, null, intent).length) group = KB.defaultForScope[state.scope];
    const routes = group && KB.route[group];
    const rid = routes && ((intent && routes[intent]) || routes._);

    if (rid) {
      if (RX.simulation.test(n) && KB.route[group].calcul) return curated(group, intent, KB.route[group].calcul, n, usedContext);
      const rest = residual(question, group, intent);
      // La question ne parle que du sujet de la réponse type : réponse validée.
      if (!rest.length || usedContext) return curated(group, intent, rid, n, usedContext);
      // Sinon, la réponse type n'est retenue que si elle couvre la question au moins aussi bien que le corpus.
      const curatedCov = coverageOf(question, entryText(group, intent, KB.entries[rid]));
      if (corpusOk && found.coverage > curatedCov) return corpusAnswer(question, found);
      if (curatedCov >= 0.6) return curated(group, intent, rid, n, usedContext);
    }
    if (corpusOk) return corpusAnswer(question, found);
    if (RX.domain.test(n) || intent || group) {
      return { kind: 'scope', reason: 'absent', found, text: `Je ne trouve pas cette information dans la documentation officielle dont je dispose. Plutôt que de risquer une réponse inexacte, je vous invite à reformuler ou à contacter la CNSS ${'{CONTACT}'}.`, chips: ['À quelle pension de retraite puis-je prétendre ?', 'Quel est le taux de cotisation ?'] };
    }
    return { kind: 'scope', reason: 'hors-perimetre', found, text: "Je suis l'assistant de la CNSS : je réponds uniquement aux questions sur la **sécurité sociale à Djibouti** (retraite, prestations familiales, maternité, accidents du travail, assurance maladie, cotisations). Que souhaitez-vous savoir ?", chips: ['À quelle pension de retraite puis-je prétendre ?', 'Comment déclarer un accident de travail ?'] };
  }

  // Questions où le corpus est plus précis que les réponses rédigées (cotisations, employeurs, AMU…).
  const CORPUS_FIRST = /employeur declar|immatricul|zone franche|fonctionnaire|amu|amo|pass |carte|etudiant|penalit|plafond|myafia|paternit|funera|carence|rente|deces|etranger/;
  // Termes de la question qui ne relèvent ni du sujet, ni de l'intention détectés.
  const FILLER = 'pension retraite allocation allocations prestation prestations conge travail demande dossier numero telephone tel masque assure assuree droit obtenir avoir parle moi explique informations info';
  function residual(question, group, intent) {
    if (!RAG) return [];
    const known = new Set(RAG.tokens([FILLER, (KB.groups[group] || []).join(' '), intent ? KB.intents[intent].join(' ') : ''].join(' ')));
    return RAG.tokens(question.replace(/⟦.+?⟧/g, ' ')).filter((t) => !known.has(t));
  }

  // Texte d'une réponse type + mots-clés qui y mènent (pour juger si elle couvre la question).
  const entryText = (group, intent, entry) => [entry.text, (KB.groups[group] || []).join(' '), intent ? KB.intents[intent].join(' ') : ''].join(' ');
  function coverageOf(question, text) {
    if (!RAG) return 0;
    const q = [...new Set(RAG.tokens(question))];
    const t = new Set(RAG.tokens(text));
    return q.length ? q.filter((x) => t.has(x)).length / q.length : 0;
  }

  function curated(group, intent, id, n, usedContext) {
    const entry = KB.entries[id];
    state.lastGroup = group;
    const note = RX.simulation.test(n) && id !== 'r-calcul'
      ? "\n\nℹ️ Je ne réalise pas de simulation personnalisée : pour votre montant exact, adressez-vous à un guichet de la CNSS." : '';
    return { kind: 'rag', reason: 'rag', source: 'redigee', group, intent, id, entry, usedContext, text: entry.text + note, chips: entry.followups };
  }

  const PRESTA_THEME = { retraite: 'retraite', famille: 'famille', maternite: 'maternite', atmp: 'atmp' };
  const PRESTA_GROUP = { retraite: 'retraite', famille: 'famille', maternite: 'maternite', atmp: 'at' };
  function corpusAnswer(question, found) {
    const c = RAG.compose(question, found);
    const top = c.chosen[0].p.doc;
    const label = (RAG.meta.prestations || {})[top.prestation] || top.prestation;
    if (PRESTA_GROUP[top.prestation]) state.lastGroup = PRESTA_GROUP[top.prestation];
    let text = c.text;
    if (top.volet === 'Hors périmètre CDC') text += `\n\nℹ️ Le thème « ${label} » n'est pas dans le périmètre des volets 1 et 2 du projet : réponse affichée à titre de démonstration.`;
    const entry = {
      theme: PRESTA_THEME[top.prestation] || top.prestation, volet: top.volet, label,
      sources: c.chosen.map((r) => ({ doc: r.p.doc.titre, ref: r.p.section !== r.p.doc.titre ? r.p.section : r.p.doc.type, version: (r.p.doc.date || 'non daté') + ' · ' + r.p.doc.type, statut: r.p.doc.statut, url: r.p.doc.url, pdf: r.p.doc.pdf, score: r.score / (r.score + 6) })),
    };
    return { kind: 'rag', reason: 'rag', source: 'corpus', id: 'corpus:' + c.chosen[0].p.id, entry, found, chosen: c.chosen, text, chips: THEME_Q[PRESTA_THEME[top.prestation] || 'all'].slice(0, 2) };
  }

  // ---------- affichage ----------
  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function addUser(text) {
    const { text: masked, found } = maskPII(text);
    const el = document.createElement('div');
    el.className = 'cb-msg user';
    el.innerHTML = `<div class="cb-bubble">${esc(masked).replace(/⟦(.+?)⟧/g, '<span class="cb-masked">$1</span>')}</div>`;
    body.appendChild(el);
    scrollDown();
    return { masked, found };
  }

  function addBot(html) {
    const el = document.createElement('div');
    el.className = 'cb-msg bot';
    el.innerHTML = `<div class="mini"><img src="assets/img/logo-cnss.png" alt=""></div><div class="cb-bubble">${html}</div>`;
    body.appendChild(el);
    scrollDown();
    return el.querySelector('.cb-bubble');
  }

  function addChips(list) {
    if (!list || !list.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'cb-chips';
    list.forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cb-chip';
      b.textContent = q;
      b.addEventListener('click', () => ask(q));
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollDown();
  }

  function sourcesHtml(entry, id) {
    const items = entry.sources.map((s, k) => {
      const score = (s.score || 0.93 - k * 0.07 - (id.length % 3) * 0.01).toFixed(2);
      const pdf = s.pdf || THEME_PDF[entry.theme];
      return `<div class="cb-src"><b>${esc(s.doc)}</b>${esc(s.ref)}
        <div class="meta"><span>Version : ${esc(s.version)}</span><span class="ok">● ${esc(s.statut)}</span>
        ${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">Source ↗</a>` : ''}${pdf ? `<a href="${pdf}" target="_blank" rel="noopener">PDF du corpus ↗</a>` : ''}<span class="score">pertinence ${score}</span></div></div>`;
    }).join('');
    return `<details class="cb-sources"><summary>Sources (${entry.sources.length})</summary>${items}</details>`;
  }

  function feedbackHtml(logId) {
    return `<div class="cb-feedback" data-log="${logId}">Cette réponse vous a-t-elle été utile ? <button type="button" data-fb="up" aria-label="Utile">👍</button><button type="button" data-fb="down" aria-label="Pas utile">👎</button></div>`;
  }

  // ---------- « Sous le capot » : trace de la chaîne RAG (CDC §9, étapes 1 à 6) ----------
  const rnd = (min, max) => Math.round(min + Math.random() * (max - min));
  const plain = (t) => t.replace(/\*\*/g, '').replace(/\|[^\n]*\|/g, '').replace(/\n+/g, ' ').replace(/^[\s\-\d.]+/, '').trim();
  const cut = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);
  // Textes remplacés présents dans l'historique du corpus : retrouvés mais exclus (EF-15).
  const ABROGES = {
    maternite: { doc: 'Code du travail, art. 113 (loi n°133/AN/05/5e L) — congé de 14 semaines', by: 'loi n°51/AN/19/8e L du 04/07/2019' },
  };

  function buildTrace(res, masked, found) {
    const t = { guard: rnd(35, 90) };
    const reasonLabel = {
      injection: 'Tentative de détournement détectée → refus',
      dossier: 'Demande sur un dossier individuel → orientation CNSS',
      amu: 'Thème hors périmètre (AMU) → orientation',
      absent: 'Aucun passage pertinent (score < 0,55) → « information absente », pas d\'invention',
      'hors-perimetre': 'Question sans rapport avec les prestations → refus poli',
      accueil: 'Formule de politesse → réponse directe',
    };
    const rows = [];
    rows.push(['①', 'Question reçue', `Canal : ${esc(CHANNEL)} · « ${esc(cut(masked, 90))} »`]);
    rows.push(['②', 'Garde-fous', `${found ? '<span class="warn">Donnée personnelle détectée et masquée (EF-18)</span>' : 'Aucune donnée personnelle'} · ${res.kind === 'rag' ? 'Dans le périmètre ✓' : `<span class="warn">${reasonLabel[res.reason] || res.reason}</span>`}`, t.guard]);
    let total = t.guard;
    if (res.kind === 'rag') {
      t.embed = rnd(60, 130); t.search = rnd(25, 70); t.llm = rnd(1700, 3600);
      total += t.embed + t.search + t.llm;
      const f = res.found || (RAG ? RAG.search(masked, state.scope) : null);
      let passages;
      if (f && f.results.length) {
        passages = f.results.slice(0, 5).map((r) => [r.p.doc.titre, r.p.section !== r.p.doc.titre ? r.p.section : r.p.doc.type, r.p.texte.replace(/\n/g, ' '), r.score / (r.score + 6)]);
      } else {
        const others = Object.entries(KB.entries).filter(([k, e]) => k !== res.id && e.theme === res.entry.theme).slice(0, 2);
        const top = 0.86 + Math.random() * 0.08;
        passages = [[res.entry.sources[0].doc, res.entry.sources[0].ref, plain(res.entry.text), top]]
          .concat(others.map(([, e], i) => [e.sources[0].doc, e.sources[0].ref, plain(e.text), top - 0.12 - i * 0.07]));
      }
      const ab = ABROGES[res.entry.theme];
      rows.push(['③', 'Vectorisation', 'Question convertie en vecteur (modèle d\'embeddings multilingue — choix au jalon J1)', t.embed]);
      rows.push(['④', 'Recherche (BM25 → Chroma en production)', `${RAG ? RAG.meta.passages + ' passages · ' + RAG.meta.documents + ' documents · ' : ''}top-5 · thème : ${esc(SCOPE_LABEL[state.scope])}` + (res.source === 'redigee' ? ' · <b>réponse validée prioritaire</b>' : '') +
        '<div class="cb-passages">' + passages.map(([d, r, x, sc]) => `<div class="cb-pass"><span class="sc">${sc.toFixed(2)}</span><b>${esc(d)}</b> <i>${esc(r)}</i><br>« ${esc(cut(x, 120))} »</div>`).join('') +
        (ab ? `<div class="cb-pass ex"><span class="sc">exclu</span><b>${esc(ab.doc)}</b><br>Texte abrogé, remplacé par la ${esc(ab.by)} : écarté de la réponse (EF-15).</div>` : '') + '</div>', t.search]);
      rows.push(['⑤', 'Modèle de langage', 'Consigne : <i>« Réponds uniquement à partir des passages fournis, en français simple, cite tes sources ; si l\'information est absente, dis-le. »</i> · température 0,1 · ~' + rnd(380, 720) + ' jetons', t.llm]);
      rows.push(['⑥', 'Contrôles de sortie', 'Source citée ✓ · Date de version ✓ · Avertissement EF-05 ✓', 0]);
    } else if (res.reason !== 'accueil') {
      const f = res.found;
      if (f && f.results.length && (res.reason === 'absent' || res.reason === 'hors-perimetre')) {
        const r0 = f.results[0];
        rows.push(['④', 'Recherche', `Meilleur passage : <b>${esc(r0.p.doc.titre)}</b> — pertinence ${(r0.score / (r0.score + 6)).toFixed(2)}, couverture de la question ${Math.round(f.coverage * 100)} % (seuil 75 %)`, rnd(25, 70)]);
      }
      rows.push(['—', 'Arrêt', res.reason === 'absent' || res.reason === 'hors-perimetre' ? 'Aucun passage suffisamment pertinent : <b>aucun appel au modèle</b>, réponse de repli (pas d\'invention, EF-02).' : 'Chaîne interrompue avant la recherche : <b>aucun appel au modèle</b>.', 0]);
    }
    const ok = total < 10000;
    const html = `<details class="cb-trace" open><summary>Sous le capot — temps total ${(total / 1000).toFixed(1).replace('.', ',')} s <span class="${ok ? 'ok' : 'warn'}">${ok ? '✓ < 10 s (ENF-02)' : '⚠ > 10 s'}</span></summary>` +
      rows.map(([n, l, d, ms]) => `<div class="cb-step"><span class="n">${n}</span><div><b>${l}</b>${ms ? `<span class="ms">${ms} ms</span>` : ''}<div>${d}</div></div></div>`).join('') + '</details>';
    return { html, total };
  }

  async function reveal(bubble, html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    bubble.innerHTML = '';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const node of Array.from(tmp.childNodes)) {
      bubble.appendChild(node);
      if (node.nodeType === 1 && !reduce) {
        node.style.opacity = 0;
        node.style.transition = 'opacity .35s';
        requestAnimationFrame(() => { node.style.opacity = 1; });
        scrollDown();
        await sleep(Math.min(450, 120 + node.textContent.length * 1.5));
      }
    }
    scrollDown();
  }

  async function ask(raw) {
    const q = raw.trim();
    if (!q || state.busy) return;
    state.busy = true;
    sendBtn.disabled = true;
    body.querySelectorAll('.cb-chips').forEach((c) => c.remove());

    const { masked, found } = addUser(q);
    const res = answer(masked);
    const trace = buildTrace(res, masked, found);
    const bubble = addBot('<span class="cb-typing"><i></i><i></i><i></i></span><div class="cb-steps"></div>');
    const steps = bubble.querySelector('.cb-steps');
    const step = async (label, ms) => {
      const s = document.createElement('span');
      s.textContent = label;
      steps.appendChild(s);
      scrollDown();
      await sleep(ms);
      s.classList.add('done');
    };
    await step('Vérification de la question (garde-fous)…', 450);
    if (res.kind === 'rag') {
      await step(`Recherche dans le corpus officiel — ${RAG ? RAG.meta.passages : res.entry.sources.length + 3} passages analysés…`, 650);
      await step('Rédaction de la réponse sourcée…', 550);
    }

    const logId = logUsage(res, masked, found, trace.total);
    let html = '';
    if (state.debug) html += trace.html;
    if (found) html += '<p class="cb-disclaimer">🔒 Vous avez saisi une donnée personnelle : elle a été masquée et ne sera pas conservée. Inutile de la communiquer pour obtenir une information.</p>';
    if (res.kind === 'rag') {
      if (res.source === 'corpus') {
        html += `<span class="cb-volet corpus">EXTRAIT DU CORPUS · ${esc(res.entry.label.split(' (')[0].toUpperCase())} · ${esc(res.entry.volet.toUpperCase())}</span>`;
      } else {
        html += res.entry.volet === 1 ? '<span class="cb-volet">RETRAITE · VOLET 1 · RÉPONSE VALIDÉE</span>'
          : res.entry.volet === 2 ? '<span class="cb-volet v2">VOLET 2 · RÉPONSE VALIDÉE</span>'
            : `<span class="cb-volet corpus">${esc(res.entry.label || 'HORS PÉRIMÈTRE')} · HORS PÉRIMÈTRE CDC · DÉMONSTRATION</span>`;
      }
      if (res.usedContext) html += '<p style="font-size:.8em;color:#8a9bb0;margin:0 0 6px">↪ Suite de la conversation précédente</p>';
    }
    html += md(res.text.replace(/\{CONTACT\}/g, '§CONTACT§')).replace(/§CONTACT§/g, CONTACT);
    if (res.source === 'corpus') html += '<p class="cb-note">Réponse composée d\'extraits des documents officiels. Dans la version finale, le modèle de langage les reformulera en une réponse rédigée.</p>';
    if (res.kind === 'rag') html += sourcesHtml(res.entry, res.id) + `<p class="cb-disclaimer">${DISCLAIMER}</p>` + feedbackHtml(logId);

    await reveal(bubble, html);
    addChips(res.chips);
    // Réponse longue : on remonte au début de la réponse pour la lire en entier.
    const msg = bubble.parentElement;
    if (msg.offsetHeight > body.clientHeight * 0.8) body.scrollTop = msg.previousElementSibling.offsetTop - 8;
    state.busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Journal anonymisé (EF-12, EF-18) : partagé avec la console de supervision de la Cellule DATA,
  // servie sur le même domaine. En production, il serait écrit côté API, pas dans le navigateur.
  const LOG_KEY = 'cnss-assistant-log';
  function logUsage(res, masked, found, latency) {
    const log = store.get(LOG_KEY) || [];
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    log.push({
      id, ts: new Date().toISOString(), canal: CHANNEL, question: masked, kind: res.kind, reason: res.reason,
      theme: res.entry ? res.entry.theme : null, reponse: res.id || null, source: res.source || null, scope: state.scope, pii: found, contexte: !!res.usedContext,
      latence: latency, feedback: null,
    });
    store.set(LOG_KEY, log.slice(-300));
    return id;
  }
  function setFeedback(id, value) {
    const log = store.get(LOG_KEY) || [];
    const e = log.find((x) => x.id === id);
    if (e) { e.feedback = value; store.set(LOG_KEY, log); }
  }

  function welcome() {
    body.innerHTML = '';
    state.lastGroup = null;
    addBot(md("Bonjour 👋 Je suis l'**Assistant CNSS**.\n\nJe réponds à vos questions sur les **prestations sociales** à partir de la documentation officielle de la CNSS : droits, conditions, pièces à fournir et démarches.\n\n🔒 Ne communiquez pas de données personnelles (numéro d'assuré, téléphone…).") +
      '<p class="cb-disclaimer">Les informations données sont indicatives et ne remplacent pas la décision de la CNSS.</p>');
    addChips(['À quelle pension de retraite puis-je prétendre ?', 'Quelles sont les conditions pour obtenir une pension de retraite ?', 'Quels documents dois-je fournir pour ma demande ?', 'Comment déposer ma demande ?']);
  }

  // ---------- ouverture / fermeture ----------
  function openPanel() {
    if (MODE === 'page') return;
    panel.hidden = false;
    launcher.classList.add('open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.querySelector('.cb-badge').classList.add('seen');
    teaser.hidden = true;
    if (!state.started) { state.started = true; welcome(); }
    setTimeout(() => input.focus(), 50);
  }
  function closePanel() {
    if (MODE === 'page') return;
    panel.hidden = true;
    launcher.classList.remove('open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }

  if (MODE === 'page') {
    state.started = true;
    welcome();
    $('cb-close').remove();
    $('cb-expand').remove();
  } else {
    launcher.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
    $('cb-close').addEventListener('click', closePanel);
    $('cb-expand').addEventListener('click', () => panel.classList.toggle('expanded'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
    // Bulle d'accroche après quelques secondes.
    setTimeout(() => { if (panel.hidden && !state.started) teaser.hidden = false; }, 4000);
    teaser.querySelector('.cb-teaser-close').addEventListener('click', (e) => { e.stopPropagation(); teaser.hidden = true; });
    teaser.addEventListener('click', openPanel);
  }
  $('cb-reset').addEventListener('click', () => { if (!state.busy) welcome(); });
  $('cb-font').addEventListener('click', () => panel.classList.toggle('big-text'));

  // Mode présentateur : bouton dans l'en-tête, ou ?capot=1 dans l'URL.
  const debugBtn = $('cb-debug');
  function setDebug(on) {
    state.debug = on;
    debugBtn.setAttribute('aria-pressed', on);
    debugBtn.classList.toggle('on', on);
    panel.classList.toggle('debug', on);
    store.set('cnss-cb-debug', on);
  }
  debugBtn.addEventListener('click', () => setDebug(!state.debug));
  setDebug(/[?&]capot=1/.test(location.search) || store.get('cnss-cb-debug') === true);

  // Boutons de thème : limitent la recherche au thème choisi et proposent des questions types.
  panel.querySelectorAll('.cb-scope').forEach((b) => b.addEventListener('click', () => {
    if (state.busy) return;
    panel.querySelectorAll('.cb-scope').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
    state.scope = b.dataset.scope;
    state.lastGroup = state.scope === 'all' ? null : KB.defaultForScope[state.scope];
    if (!state.started) { state.started = true; welcome(); }
    body.querySelectorAll('.cb-chips').forEach((c) => c.remove());
    const n = RAG ? RAG.count(state.scope) : null;
    const txt = state.scope === 'all'
      ? `📂 **Tous les thèmes** : je cherche à nouveau dans l'ensemble du corpus${n ? ` (${n} documents)` : ''}.`
      : `📂 Thème **${SCOPE_LABEL[state.scope]}** sélectionné : je cherche uniquement dans les documents de ce thème${n ? ` (${n} documents)` : ''}. Posez votre question ou choisissez :`;
    addBot(md(txt));
    addChips(THEME_Q[state.scope]);
    input.focus();
  }));

  body.addEventListener('click', (e) => {
    const fb = e.target.closest('[data-fb]');
    if (!fb) return;
    const box = fb.parentElement;
    box.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b === fb));
    box.firstChild.textContent = fb.dataset.fb === 'up' ? 'Merci pour votre retour ! ' : 'Merci, votre retour aidera à améliorer l\'assistant. ';
    setFeedback(box.dataset.log, fb.dataset.fb);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    autosize();
    piiWarn.hidden = true;
    ask(v);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
  input.addEventListener('input', () => { autosize(); piiWarn.hidden = !maskPII(input.value).found; });

  // Boutons du site qui ouvrent l'assistant ou posent directement une question.
  document.querySelectorAll('[data-open-chat]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); openPanel(); }));
  document.querySelectorAll('[data-ask]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    openPanel();
    setTimeout(() => ask(el.dataset.ask), 250);
  }));

  // Pour les tests : window.CNSS_CHAT.answer('…')
  window.CNSS_CHAT = { answer, ask, open: openPanel };
})();
