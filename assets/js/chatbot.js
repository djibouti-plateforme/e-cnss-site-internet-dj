// Assistant CNSS — widget de démonstration.
// Simule la chaîne RAG décrite dans le CDC (§9) côté navigateur :
// garde-fous → recherche dans le corpus → réponse sourcée + avertissement EF-05.
// En production, `answer()` sera remplacé par un appel à l'API du chatbot.
(function () {
  const KB = window.CNSS_KB;
  const $ = (id) => document.getElementById(id);
  const panel = $('cb-panel');
  const launcher = $('cb-launcher');
  const body = $('cb-body');
  const form = $('cb-form');
  const input = $('cb-input');
  const teaser = $('cb-teaser');
  const piiWarn = $('cb-pii');
  const sendBtn = form.querySelector('.cb-send');

  const CONTACT = 'au <strong>+253 21 35 03 21</strong> ou à un guichet de la CNSS (Boulevard de la République, dim.–jeu. 8h–17h)';
  const DISCLAIMER = 'ℹ️ Information indicative, fondée sur la documentation officielle de la CNSS. Elle ne remplace pas la décision de la CNSS.';

  const state = { lastGroup: null, scope: 'all', busy: false, started: false };

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
      return { kind: 'guard', text: "Je ne peux pas modifier mon fonctionnement. Je suis l'assistant de la CNSS et je réponds uniquement aux questions sur les **prestations sociales** (retraite, prestations familiales, maternité, accidents du travail).", chips: ['À quelle pension de retraite puis-je prétendre ?'] };
    }
    if (RX.greet.test(n)) {
      return { kind: 'small', text: 'Bonjour ! Posez-moi votre question sur vos prestations : conditions, pièces à fournir, démarches…', chips: ['À quelle pension de retraite puis-je prétendre ?', 'Quels documents dois-je fournir pour ma demande ?'] };
    }
    if (RX.thanks.test(n)) {
      return { kind: 'small', text: "Avec plaisir ! N'hésitez pas si vous avez une autre question.", chips: [] };
    }
    if (RX.dossier.test(n)) {
      return { kind: 'guard', text: `Je n'ai **pas accès aux dossiers individuels** et je ne peux pas suivre une demande en cours.\n\nPour connaître l'état de votre dossier, contactez la CNSS ${'{CONTACT}'}.\n\nJe peux en revanche vous expliquer les conditions, les pièces à fournir ou les démarches.`, chips: ['Comment déposer ma demande de pension ?'] };
    }

    let group = findKey(n, KB.groups);
    const intent = findKey(n, KB.intents);

    if (group === 'amu') {
      return { kind: 'scope', text: `Les questions sur l'**Assurance Maladie Universelle (AMU)** ne sont pas encore couvertes par l'assistant.\n\nConsultez la rubrique « Assurance Maladie Universelle » du site ou contactez la CNSS ${'{CONTACT}'}.`, chips: ['À quelle pension de retraite puis-je prétendre ?'] };
    }
    if (RX.notCovered.test(n)) {
      return { kind: 'scope', text: `Je ne trouve pas cette information dans la documentation officielle dont je dispose. Plutôt que de risquer une réponse inexacte, je vous invite à contacter la CNSS ${'{CONTACT}'}.`, chips: ['À quelle pension de retraite puis-je prétendre ?'] };
    }

    let usedContext = false;
    if (!group && intent && state.lastGroup) { group = state.lastGroup; usedContext = true; }
    if (!group && state.scope !== 'all' && (intent || RX.domain.test(n))) group = KB.defaultForScope[state.scope];
    if (!group && intent && RX.domain.test(n)) group = 'retraite';
    if (!group) {
      if (RX.domain.test(n) || intent) {
        return { kind: 'scope', text: `Je ne trouve pas d'information correspondant à votre question dans la documentation officielle. Pouvez-vous reformuler ? Vous pouvez aussi contacter la CNSS ${'{CONTACT}'}.`, chips: ['À quelle pension de retraite puis-je prétendre ?', 'Combien sont les allocations familiales ?'] };
      }
      return { kind: 'scope', text: "Je suis l'assistant de la CNSS : je réponds uniquement aux questions sur les **prestations sociales** (retraite, prestations familiales, maternité, accidents du travail). Que souhaitez-vous savoir ?", chips: ['À quelle pension de retraite puis-je prétendre ?', 'Comment déclarer un accident de travail ?'] };
    }

    const routes = KB.route[group];
    const id = (intent && routes[intent]) || routes._;
    const entry = KB.entries[id];
    state.lastGroup = group;
    const note = RX.simulation.test(n) && id !== 'r-calcul'
      ? "\n\nℹ️ Je ne réalise pas de simulation personnalisée : pour votre montant exact, adressez-vous à un guichet de la CNSS." : '';
    return { kind: 'rag', id, entry, usedContext, text: entry.text + note, chips: entry.followups };
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
      const score = (0.93 - k * 0.07 - (id.length % 3) * 0.01).toFixed(2);
      return `<div class="cb-src"><b>${esc(s.doc)}</b>${esc(s.ref)}
        <div class="meta"><span>Version : ${esc(s.version)}</span><span class="ok">● ${esc(s.statut)}</span>
        <a href="${s.url}" target="_blank" rel="noopener">Voir la page ↗</a><span class="score">pertinence ${score}</span></div></div>`;
    }).join('');
    return `<details class="cb-sources"><summary>Sources (${entry.sources.length})</summary>${items}</details>`;
  }

  function feedbackHtml() {
    return '<div class="cb-feedback">Cette réponse vous a-t-elle été utile ? <button type="button" data-fb="up" aria-label="Utile">👍</button><button type="button" data-fb="down" aria-label="Pas utile">👎</button></div>';
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
      await step(`Recherche dans le corpus officiel — ${res.entry.sources.length + 3} passages analysés…`, 650);
      await step('Rédaction de la réponse sourcée…', 550);
    }

    let html = '';
    if (found) html += '<p class="cb-disclaimer">🔒 Vous avez saisi une donnée personnelle : elle a été masquée et ne sera pas conservée. Inutile de la communiquer pour obtenir une information.</p>';
    if (res.kind === 'rag') {
      html += res.entry.volet === 1
        ? '<span class="cb-volet">RETRAITE · VOLET 1</span>'
        : '<span class="cb-volet v2">VOLET 2 · APERÇU</span>';
      if (res.usedContext) html += '<p style="font-size:.8em;color:#8a9bb0;margin:0 0 6px">↪ Suite de la conversation précédente</p>';
    }
    html += md(res.text.replace(/\{CONTACT\}/g, '§CONTACT§')).replace(/§CONTACT§/g, CONTACT);
    if (res.kind === 'rag') html += sourcesHtml(res.entry, res.id) + `<p class="cb-disclaimer">${DISCLAIMER}</p>` + feedbackHtml();

    await reveal(bubble, html);
    addChips(res.chips);
    // Réponse longue : on remonte au début de la réponse pour la lire en entier.
    const msg = bubble.parentElement;
    if (msg.offsetHeight > body.clientHeight * 0.8) body.scrollTop = msg.previousElementSibling.offsetTop - 8;
    logUsage(res);
    state.busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Statistiques d'usage anonymes (EF-12) — ici stockées localement pour la démo.
  function logUsage(res) {
    const stats = store.get('cnss-cb-stats') || { questions: 0, sansReponse: 0, themes: {} };
    stats.questions++;
    if (res.kind !== 'rag' && res.kind !== 'small') stats.sansReponse++;
    if (res.entry) stats.themes[res.entry.theme] = (stats.themes[res.entry.theme] || 0) + 1;
    store.set('cnss-cb-stats', stats);
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
    panel.hidden = false;
    launcher.classList.add('open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.querySelector('.cb-badge').classList.add('seen');
    teaser.hidden = true;
    if (!state.started) { state.started = true; welcome(); }
    setTimeout(() => input.focus(), 50);
  }
  function closePanel() {
    panel.hidden = true;
    launcher.classList.remove('open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }

  launcher.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
  $('cb-close').addEventListener('click', closePanel);
  $('cb-reset').addEventListener('click', () => { if (!state.busy) welcome(); });
  $('cb-expand').addEventListener('click', () => panel.classList.toggle('expanded'));
  $('cb-font').addEventListener('click', () => panel.classList.toggle('big-text'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });

  panel.querySelectorAll('.cb-scope').forEach((b) => b.addEventListener('click', () => {
    panel.querySelectorAll('.cb-scope').forEach((x) => x.classList.toggle('active', x === b));
    state.scope = b.dataset.scope;
    state.lastGroup = state.scope === 'all' ? null : KB.defaultForScope[state.scope];
  }));

  body.addEventListener('click', (e) => {
    const fb = e.target.closest('[data-fb]');
    if (!fb) return;
    const box = fb.parentElement;
    box.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b === fb));
    box.firstChild.textContent = fb.dataset.fb === 'up' ? 'Merci pour votre retour ! ' : 'Merci, votre retour aidera à améliorer l\'assistant. ';
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

  // Bulle d'accroche après quelques secondes.
  setTimeout(() => { if (panel.hidden && !state.started) teaser.hidden = false; }, 4000);
  teaser.querySelector('.cb-teaser-close').addEventListener('click', (e) => { e.stopPropagation(); teaser.hidden = true; });
  teaser.addEventListener('click', openPanel);

  // Pour les tests : window.CNSS_CHAT.answer('…')
  window.CNSS_CHAT = { answer, ask, open: openPanel };
})();
