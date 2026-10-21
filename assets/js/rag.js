// Recherche dans le corpus documentaire (étape ④ de la chaîne RAG, CDC §9).
// BM25 sur les passages extraits de cnss.dj et des sources validées (corpus/corpus.js).
// En production, cette recherche sera faite par la base vectorielle (Chroma) côté serveur.
window.CNSS_RAG = (function () {
  const C = window.CNSS_CORPUS;
  if (!C) return null;

  const STOP = new Set(('a au aux avec ce ces cet cette dans de des du elle en et eux il ils je la le les leur leurs lui ma mais me mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y ete etre est sont suis es etes ai as avons avez ont avoir fait faire faut peut peuvent puis puisje pourquoi comment quel quelle quels quelles quand combien quoi dois doit doivent veux voudrais savoir est-ce estce si cas quelque chose plus moins tres tout tous toute toutes aussi bien car donc alors ainsi sans sous chez entre apres avant depuis cela ca celui celle ceux ici la-bas bonjour merci svp sil plait madame monsieur cnss').split(' '));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ');
  function stem(w) {
    if (/^\d/.test(w) || w.length <= 4) return w;
    w = w.replace(/[sx]$/, '');
    for (const suf of ['issement', 'ement', 'ations', 'ation', 'atrice', 'ateur', 'iques', 'ique', 'euse', 'eur', 'ee', 'er', 'ez', 'e']) {
      if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
    }
    return w;
  }
  const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w) && (w.length > 1 || /\d/.test(w))).map(stem);
  // Termes trop généraux pour juger si une question est couverte.
  const GENERIC = new Set('toucher touche touchent recevoir recoit percevoir percoit verse couvert concerne possible savoir faire droit droits demande caisse nationale securite sociale information obtenir beneficier avoir prestation prestations quel conditions'.split(' ').map(stem));
  // Synonymes (mots de l'assuré → mots des documents).
  const SYN_RAW = {
    retraite: 'pension vieillesse', pension: 'retraite vieillesse', minimum: 'minimal', minimal: 'minimum', veuve: 'reversion conjoint', veuf: 'reversion conjoint',
    deces: 'reversion', enfant: 'familiale allocation', enfants: 'familiale allocation', bebe: 'maternite naissance', enceinte: 'maternite grossesse',
    grossesse: 'maternite', accouchement: 'maternite', maladie: 'amu soins', soins: 'amu', medecin: 'soins', hopital: 'soins', patron: 'employeur',
    entreprise: 'employeur', taux: 'cotisation', cotiser: 'cotisation', argent: 'montant', payer: 'paiement', payee: 'paiement', paye: 'paiement',
    carte: 'biometrique', meurt: 'deces survivant', mort: 'deces survivant', decede: 'deces survivant', famille: 'survivant', orphelin: 'survivant', blessure: 'accident', mari: 'mariage', epouse: 'mariage conjoint', femme: 'epouse', salaire: 'remuneration',
  };
  const SYN = {};
  Object.entries(SYN_RAW).forEach(([k, v]) => { SYN[stem(k)] = v.split(' ').map(stem); });

  // ---------- Index ----------
  const docs = Object.fromEntries(C.docs.map((d) => [d.id, d]));
  const TYPE_W = { 'Page du site cnss.dj': 1, 'Source externe': 0.95, Brochure: 1, Barème: 1, Procédure: 1, Actualité: 0.85, Loi: 0.8, Décret: 0.7, Arrêté: 0.8, Formulaire: 0.8, Guide: 0.7, Notice: 0.8, Charte: 0.7 };
  const P = C.passages.map(([id, doc, section, texte]) => {
    const d = docs[doc];
    const toks = tokens(texte).concat(tokens(section), tokens(section), tokens(d.titre));
    const tf = new Map();
    toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    return { id, doc: d, section, texte, tf, len: toks.length, title: new Set(tokens(d.titre + ' ' + section)) };
  });
  const N = P.length;
  const avgLen = P.reduce((s, p) => s + p.len, 0) / N;
  const df = new Map();
  P.forEach((p) => p.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
  const idf = (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));

  const SCOPE = { retraite: ['retraite', 'multi'], famille: ['famille', 'multi'], maternite: ['maternite', 'multi'], atmp: ['atmp', 'multi'] };

  function search(question, scope, k = 6) {
    const q = tokens(question);
    const terms = new Map();
    q.forEach((t) => {
      terms.set(t, Math.max(terms.get(t) || 0, 1));
      (SYN[t] || []).forEach((s) => terms.set(s, Math.max(terms.get(s) || 0, 0.5)));
    });
    const allowed = SCOPE[scope];
    const k1 = 1.2;
    const b = 0.75;
    const res = [];
    for (const p of P) {
      if (allowed && !allowed.includes(p.doc.prestation)) continue;
      let score = 0;
      const hit = [];
      terms.forEach((w, t) => {
        const f = p.tf.get(t);
        if (!f) return;
        score += w * idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * p.len) / avgLen)));
        hit.push(t);
      });
      // Bonus quand la question reprend le titre du document ou de la section.
      const inTitle = q.filter((t) => p.title.has(t)).length;
      if (score > 0) res.push({ p, score: score * (TYPE_W[p.doc.type] || 0.8) * Math.min(1.7, 1 + 0.2 * inTitle), hit });
    }
    res.sort((a, b2) => b2.score - a.score);
    const top = res.slice(0, k);
    // Couverture : part des termes spécifiques de la question retrouvés dans le meilleur passage.
    const specific = [...new Set(q)].filter((t) => !GENERIC.has(t));
    const coverage = top.length && specific.length ? specific.filter((t) => top[0].p.tf.has(t) || (SYN[t] || []).some((s) => top[0].p.tf.has(s))).length / specific.length : 0;
    return { results: top, coverage, terms: [...terms.keys()], qlen: specific.length };
  }

  // Sélectionne les phrases du passage qui répondent le mieux à la question.
  function excerpt(p, terms, max = 4) {
    const parts = p.texte.split(/\n|(?<=[.;!?])\s+(?=[A-ZÀ-Ü•])/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (p.texte.split(/\s+/).length <= 70 || parts.length <= max) return parts;
    const set = new Set(terms);
    const scored = parts.map((s, i) => ({ s, i, sc: tokens(s).filter((t) => set.has(t)).length + (i === 0 ? 0.3 : 0) }));
    const keep = scored.slice().sort((a, b) => b.sc - a.sc).slice(0, max).filter((x) => x.sc > 0);
    // Garde les lignes de liste qui suivent une phrase retenue se terminant par « : ».
    const idx = new Set(keep.map((x) => x.i));
    keep.forEach((x) => { if (/:\s*$/.test(x.s)) for (let j = x.i + 1; j < parts.length && parts[j].startsWith('•') && idx.size < max + 6; j++) idx.add(j); });
    return [...idx].sort((a, b) => a - b).map((i) => parts[i]);
  }

  function compose(question, found) {
    const top = found.results[0];
    const chosen = [top];
    for (const r of found.results.slice(1)) {
      if (chosen.length >= 3) break;
      if (r.score >= top.score * 0.62 && !chosen.some((c) => c.p.doc.id === r.p.doc.id && c.p.section === r.p.section)) chosen.push(r);
    }
    const seen = new Set();
    const blocks = chosen.map((r) => {
      const lines = excerpt(r.p, found.terms)
        .filter((s) => { const k = norm(s).replace(/[^a-z0-9]/g, ''); if (seen.has(k)) return false; seen.add(k); return true; })
        .map((s) => (s.startsWith('•') ? '- ' + s.replace(/^•\s*/, '') : s));
      if (!lines.length) return null;
      const head = r.p.section && r.p.section !== r.p.doc.titre ? `**${r.p.section}** — ${r.p.doc.titre}` : `**${r.p.doc.titre}**`;
      return head + (r.p.doc.type === 'Actualité' ? ` (actualité du ${r.p.doc.date.split('-').reverse().join('/')})` : '') + '\n' + lines.join('\n');
    });
    const kept = chosen.filter((_, i) => blocks[i]);
    return { text: 'Voici ce qu\'indique la documentation de la CNSS :\n\n' + blocks.filter(Boolean).join('\n\n'), chosen: kept };
  }

  // Une question est considérée couverte si le meilleur passage reprend l'essentiel de ses termes.
  const covered = (f) => !!f.results.length && ((f.qlen === 1 && f.coverage === 1 && f.results[0].score >= 3) || (f.coverage >= 0.75 && f.results[0].score >= 4.5) || (f.coverage >= 0.6 && f.results[0].score >= 15));

  return { search, compose, covered, tokens, docs: C.docs, meta: C.meta, count: (scope) => C.docs.filter((d) => !SCOPE[scope] || SCOPE[scope].includes(d.prestation)).length };
})();
