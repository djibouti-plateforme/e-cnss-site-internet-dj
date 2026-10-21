"""Construit le corpus documentaire de l'Assistant CNSS.

Entrées (corpus/raw/) :
  - pages-cnss-dj.json : pages et actualités extraites de cnss.dj
  - pdf-texte/*.txt    : texte des PDF officiels publiés sur cnss.dj
  - manuel/*.txt       : transcriptions de documents scannés et sources externes

Sorties :
  - corpus/documents.json : catalogue des documents avec leurs métadonnées (CDC §8)
  - corpus/passages.json  : passages indexés par le chatbot
  - corpus/pdf/*.pdf      : un dossier PDF par prestation + un catalogue

Usage : python3 tools/build_corpus.py
"""
import json
import os
import re
import unicodedata
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'corpus', 'raw')
OUT = os.path.join(ROOT, 'corpus')
LOGO = os.path.join(ROOT, 'assets', 'img', 'logo-cnss.png')
COLLECTE = '21/10/2026'

PRESTATIONS = {
    'retraite': ('Retraite', 'Volet 1'),
    'famille': ('Prestations familiales', 'Volet 2'),
    'maternite': ('Maternité', 'Volet 2'),
    'atmp': ('Accidents du travail et maladies professionnelles', 'Volet 2'),
    'amu': ('Assurance maladie (AMU, AMO, PASS)', 'Hors périmètre CDC'),
    'employeur': ('Employeurs, immatriculation et cotisations', 'Hors périmètre CDC'),
    'cnss': ('La CNSS : institution, structures et services', 'Hors périmètre CDC'),
    'multi': ('Toutes prestations', 'Volets 1-2'),
}
DOSSIERS = [
    ('01-retraite', 'retraite'), ('02-prestations-familiales', 'famille'), ('03-maternite', 'maternite'),
    ('04-accidents-du-travail', 'atmp'), ('05-assurance-maladie', 'amu'), ('06-employeurs-cotisations', 'employeur'),
    ('07-cnss-institution-services', 'cnss'), ('08-textes-et-sources-transverses', 'multi'),
]


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


# ---------------------------------------------------------------- classement
EXCLUDE = ['recrutement', 'appel d offres', "appel d'offres", 'football', 'voeux', 'vœux', 'video', 'galerie', 'photos',
           'jeune afrique', 'privacy', 'posters', 'brochures', 'telechargement', 'chartes', 'decores', 'aid el',
           'aid-el', 'aîd', 'arche de la paix', 'hassan_robleh', 'visite de travail', 'operation-cite', 'lancement de pass',
           'lancement e-service', 'formulaires', 'actualites', 'espaces', 'covid', 'infarctus', 'chinois', 'diabete',
           'diabète', 'colloque', 'reanimation', 'urgence dans', 'soins avances', 'nouveau directeur', 'nommee a la tete',
           'prise de contacts', 'bci', 'mensur', 'gx explore', 'centre des aides', 'nileof', 'caravane', 'decrochez',
           'strategie annuelle', 'reorganisation', 'semaine medicale', 'j+6', 'deconfinement', 'formation en ligne',
           'formation sur la sante', 'formation lancee', 'nouvelle formation', 'endocrinologie', 'ratification',
           'accord de financement', 'comite de pilotage', 'projet d etablissement', "projet d'etablissement",
           'coup d envoie du projet', "coup d'envoie du projet", 'vamed', 'enregistrer un nouvel employe', 'rendez vous online',
           'tele-declarer', 'circulaire', 'demande d indeminisation', "demande d'indeminisation", 'smi2', 'espoir a vue']

RULES = [
    ('maternite', ['maternit', 'conge de couche', 'enceinte']),
    ('retraite', ['retraite', 'pension', 'retraites', 'pensionnes', 'bancarisation', 'reversion']),
    ('famille', ['prestation familiale', 'prestations familiales', 'allocations familiales', 'allocation familiale',
                 'mariage', 'prestation familiales', 'dockers']),
    ('atmp', ['accident de travail', 'accident-de-travail', 'vision zero', 'sante au travail', 'securite et sante',
              'medecine du travail', 'prevention en milieu', 'maladie professionnelle']),
    ('amu', ['amu', 'assurance maladie', 'assistance sociale de sante', 'etudiant', 'biometrique', 'besoins speciaux',
             'policiers', 'taxis', 'transport en commun', 'bus et minibus', 'hopital militaire', 'conventionnement',
             'cite nassib', 'carnet de sante', 'esante', 'adhesion']),
    ('employeur', ['employeur', 'affiliation', 'immatriculation', 'cotisation', 'penalite', 'recouvrement', 'guichets',
                   'e-service', 'service en ligne', 'teleservice', 'entreprises', 'controle partiel', 'contrôl partiel']),
    ('cnss', ['historique', 'missions', 'financement', 'directrice', 'directeur', 'structures', 'centre de soins',
              'hopital', 'pole', 'djibpharma', 'dji-pharma', 'annuaire', 'soins offerts', 'myafia', 'antenne medicale',
              'affilies', 'caisse nationale']),
]


def classify(text):
    n = norm(text)
    for key, kws in RULES:
        if any(k in n for k in kws):
            return key
    return None


# ---------------------------------------------------------------- documents
def clean_title(t):
    t = re.sub(r'\s*[-–]\s*CNSS\s*$', '', t).strip()
    return t[:1].upper() + t[1:] if t else t


def load_pages():
    docs, by_title = [], {}
    for p in json.load(open(os.path.join(RAW, 'pages-cnss-dj.json'))):
        title = clean_title(p['title'])
        key = norm(title + ' ' + p['url'])
        if not p['blocks'] or p['chars'] < 120 or any(x in key for x in EXCLUDE):
            continue
        presta = 'multi' if 'textes-legislatifs' in p['url'] else classify(title + ' ' + p['url']) or classify(' '.join(t for _, t in p['blocks'][:6]))
        if not presta:
            continue
        is_news = bool(re.search(r'/20\d\d/\d\d/', p['url'])) and p['date'] >= '2017'
        blocks = [b for b in p['blocks'] if not re.match(r'^(Posted by|Tags|Share|Partager|ACTU|Retour)\b', b[1])]
        doc = {
            'titre': title, 'prestation': presta,
            'type': 'Actualité' if is_news else 'Page du site cnss.dj',
            'reference': ('Actualité du ' + fr_date(p['date'])) if is_news else 'Page « ' + title + ' »',
            'url': p['url'], 'date': p['date'] or p['modified'] or '',
            'statut': 'Archive — information datée' if is_news else 'En vigueur (publié sur cnss.dj)',
            'blocks': blocks,
        }
        # Doublons : les pages du site existent aussi en articles de 2016 ; on garde la version la plus complète.
        k = title_key(title)
        if k in by_title:
            old = by_title[k]
            if sum(len(t) for _, t in blocks) > sum(len(t) for _, t in old['blocks']):
                old.update(doc)
            continue
        by_title[k] = doc
        docs.append(doc)
    return docs


def title_key(t):
    words = re.findall(r'[a-z0-9]+', norm(t))
    stop = {'le', 'la', 'les', 'de', 'des', 'du', 'l', 'd', 'pension', 'pensions', 'cnss'}
    return ' '.join(sorted(w.rstrip('s') for w in words if w not in stop))


def fr_date(d):
    return f'{d[8:10]}/{d[5:7]}/{d[:4]}' if len(d) >= 10 else d


PDF_META = {
    'demande_pension_retraite': ('Formulaire de demande de pension de retraite', 'retraite', 'Formulaire'),
    'demande_pension_reversion': ('Formulaire de demande de pension de réversion', 'retraite', 'Formulaire'),
    'demande_prestation_familiale': ('Formulaire de demande de prestations familiales', 'famille', 'Formulaire'),
    'MODALITES_DE_DEPOT_DES_PIECES_A_FOURNIR_DES_CONGES_DE_MATERNIT1': ('Modalités de dépôt et pièces à fournir — congé de maternité', 'maternite', 'Procédure'),
    'declaration_accident_maladie': ("Déclaration d'accident du travail ou de maladie professionnelle", 'atmp', 'Formulaire'),
    'guide-prevention-milieu-prof1': ('Guide de prévention en milieu professionnel', 'atmp', 'Guide'),
    'Loi_n24AN147eme_L_Portant_creation_de_lamu': ("Loi n°24/AN/14/7ème L portant mise en place d'un système d'assurance maladie universelle", 'amu', 'Loi'),
    'LOI_N_109_AN_2015_7_EME_LOI': ('Loi n°109/AN/15/7ème L modifiant la loi sur l\'assurance maladie universelle', 'amu', 'Loi'),
    'Decret-_N_2019-237PRMTRA': ('Décret n°2019-237/PR/MTRA — Fonds de solidarité santé de l\'AMU', 'amu', 'Décret'),
    'Decret_N_2019-236PRMTRA': ('Décret n°2019-236/PR/MTRA — Commission nationale de l\'assurance maladie', 'amu', 'Décret'),
    'formulaire_AMU_adhesion': ("Formulaire d'adhésion à l'AMU", 'amu', 'Formulaire'),
    'LOI_108_AN_15_7_EME_LOI_ET_LOI_N_109': ("Loi n°108/AN/15/7ème L abrogeant l'impôt de solidarité sur les prestations et pensions", 'retraite', 'Loi'),
    'LOI_N_111_AN_2015_7EME_L': ('Loi n°111/AN/15/7ème L renforçant le recouvrement des cotisations sociales', 'employeur', 'Loi'),
    'ARR_N_2015_605_PR_MTRA': ('Arrêté n°2015-605/PR/MTRA — plafonnement des rémunérations soumises à cotisation', 'employeur', 'Arrêté'),
    'Tableau_modalite_de_calcul_pour_les_nouvelles_dispositions_textuelles_zone_franche': ('Tableau de calcul des cotisations — régime zone franche', 'employeur', 'Barème'),
    'texte-du-borderau-verso': ('Bordereau de déclaration des cotisations — notice (verso)', 'employeur', 'Notice'),
    'demande_immatriculation': ("Demande d'immatriculation", 'employeur', 'Formulaire'),
    'certificat_emploi': ("Certificat d'emploi", 'employeur', 'Formulaire'),
    'Charte-Securite-sociale-2': ('Charte de confidentialité de l\'application « CNSS & Moi »', 'cnss', 'Charte'),
    'clauses_generales_utilisation_portail': ("Clauses générales d'utilisation du portail en ligne", 'cnss', 'Charte'),
}


def clean_ocr(text):
    out = []
    for line in text.split('\n'):
        line = re.sub(r'\s{2,}', ' ', line).strip()
        letters = sum(c.isalpha() for c in line)
        if len(line) < 3 or letters < 0.6 * len(line.replace(' ', '')):
            continue
        out.append(line)
    # Recolle les lignes coupées en paragraphes.
    paras, cur = [], ''
    for line in out:
        starts = re.match(r'^(Article|ARTICLE|Art\.|TITRE|CHAPITRE|VU |[-•➔◆▪]|\d+[.)-] )', line)
        if starts and cur:
            paras.append(cur)
            cur = line
        else:
            cur = (cur[:-1] if cur.endswith('-') else cur + ' ') + line if cur else line
        if cur.endswith('.') and len(cur) > 220:
            paras.append(cur)
            cur = ''
    if cur:
        paras.append(cur)
    return [p.strip() for p in paras if len(p) > 25]


def load_pdf_texts(urls):
    docs = []
    for name, (titre, presta, typ) in PDF_META.items():
        path = os.path.join(RAW, 'pdf-texte', name + '.txt')
        if not os.path.exists(path):
            continue
        paras = clean_ocr(open(path, encoding='utf-8', errors='ignore').read())
        url = next((u for u in urls if os.path.basename(u)[:-4] == name), '')
        m = re.search(r'/storage/(\d{4})/(\d\d)/', url)
        blocks, section = [], None
        for p in paras:
            if re.match(r'^(Article|ARTICLE)\s*\d', p):
                head = re.match(r'^((?:Article|ARTICLE)\s*\d+\s*(?:er)?)', p).group(1)
                blocks.append(['h', head.capitalize()])
                p = p[len(head):].lstrip(' :.-')
            blocks.append(['p', p])
        docs.append({
            'titre': titre, 'prestation': presta, 'type': typ, 'reference': titre, 'url': url,
            'date': f'{m.group(1)}-{m.group(2)}' if m else '', 'blocks': blocks,
            'statut': 'En vigueur (publié sur cnss.dj)' + (' — texte issu d\'une numérisation, à relire' if typ in ('Loi', 'Arrêté') else ''),
        })
    return docs


def load_manual():
    docs = []
    for fn in sorted(os.listdir(os.path.join(RAW, 'manuel'))):
        meta, blocks = {}, []
        for line in open(os.path.join(RAW, 'manuel', fn), encoding='utf-8'):
            line = line.rstrip('\n')
            if line.startswith('@'):
                k, v = line[1:].split(':', 1)
                meta[k.strip()] = v.strip()
            elif line.startswith('## '):
                blocks.append(['h', line[3:].strip()])
            elif line.startswith('- '):
                blocks.append(['li', line[2:].strip()])
            elif line.strip() and not line.startswith('# '):
                blocks.append(['p', line.strip()])
        docs.append({'titre': meta['titre'], 'prestation': meta['prestation'], 'type': meta['type'],
                     'reference': meta['reference'], 'url': meta['url'], 'date': meta['date'],
                     'statut': meta['statut'], 'blocks': blocks})
    return docs


# ---------------------------------------------------------------- passages
def chunk(doc, max_words=170):
    out, section, buf, words = [], doc['titre'], [], 0

    def flush():
        nonlocal buf, words
        if buf:
            out.append({'section': section, 'texte': '\n'.join(buf)})
        buf, words = [], 0

    for kind, text in doc['blocks']:
        if kind == 'h':
            if len(text) < 140:
                flush()
                section = text.rstrip(' :')
                continue
        n = len(text.split())
        if words and words + n > max_words:
            flush()
        buf.append(('• ' if kind == 'li' else '') + text)
        words += n
    flush()
    return out


# ---------------------------------------------------------------- PDF
def esc(t):
    t = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    t = t.replace('➔', '→').replace('◆', '•').replace('▪', '•')
    return ''.join(c if ord(c) < 0x2500 or c in '→•' else ' ' for c in t)


def build_pdfs(docs):
    os.makedirs(os.path.join(OUT, 'pdf'), exist_ok=True)
    ss = getSampleStyleSheet()
    navy = colors.HexColor('#1f3a5f')
    teal = colors.HexColor('#0da781')
    st = {
        'title': ParagraphStyle('t', parent=ss['Title'], textColor=navy, fontSize=22, leading=27),
        'sub': ParagraphStyle('s', parent=ss['Normal'], alignment=TA_CENTER, textColor=colors.HexColor('#4d7184'), fontSize=11, leading=15),
        'h1': ParagraphStyle('h1', parent=ss['Heading1'], textColor=navy, fontSize=15, leading=19, spaceBefore=6, spaceAfter=6),
        'h2': ParagraphStyle('h2', parent=ss['Heading3'], textColor=teal, fontSize=11.5, leading=14, spaceBefore=8, spaceAfter=3),
        'p': ParagraphStyle('p', parent=ss['Normal'], fontSize=9.6, leading=13.4, spaceAfter=4),
        'li': ParagraphStyle('li', parent=ss['Normal'], fontSize=9.6, leading=13.4, leftIndent=12, bulletIndent=2, spaceAfter=2),
        'meta': ParagraphStyle('m', parent=ss['Normal'], fontSize=8.4, leading=11),
        'small': ParagraphStyle('sm', parent=ss['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#737588')),
    }

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(colors.HexColor('#737588'))
        canvas.drawString(2 * cm, 1.2 * cm, 'CNSS — Corpus documentaire de l\'Assistant CNSS (maquette) — collecte du ' + COLLECTE)
        canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f'Page {doc_.page}')
        canvas.setStrokeColor(colors.HexColor('#dbe4fe'))
        canvas.line(2 * cm, A4[1] - 1.4 * cm, A4[0] - 2 * cm, A4[1] - 1.4 * cm)
        canvas.drawString(2 * cm, A4[1] - 1.2 * cm, 'Usage interne — Cellule DATA / DSI')
        canvas.restoreState()

    def meta_table(d):
        rows = [['Référence', esc(d['reference'])], ['Type', d['type']], ['Prestation', PRESTATIONS[d['prestation']][0] + ' — ' + PRESTATIONS[d['prestation']][1]],
                ['Date', d['date'] or 'non datée'], ['Statut', d['statut']], ['Source', esc(d['url'])],
                ['Collecté le', COLLECTE], ['Validation', 'À valider par le référent métier (CDC §8)']]
        t = Table([[Paragraph('<b>%s</b>' % a, st['meta']), Paragraph(b, st['meta'])] for a, b in rows], colWidths=[3 * cm, 13.6 * cm])
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eef2fe')), ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#dbe4fe')),
                               ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
        return t

    def cover(story, title, subtitle, lines):
        if os.path.exists(LOGO):
            story.append(Image(LOGO, width=3 * cm, height=3.2 * cm))
        story += [Spacer(1, 0.6 * cm), Paragraph('CAISSE NATIONALE DE SÉCURITÉ SOCIALE', st['sub']), Spacer(1, 0.3 * cm),
                  Paragraph(title, st['title']), Paragraph(subtitle, st['sub']), Spacer(1, 0.8 * cm)]
        for line in lines:
            story.append(Paragraph(line, st['p']))

    files = {}
    for fname, presta in DOSSIERS:
        ds = [d for d in docs if d['prestation'] == presta]
        if not ds:
            continue
        ds.sort(key=lambda d: (d['type'] == 'Actualité', d['type'] != 'Page du site cnss.dj', d['titre']))
        path = os.path.join(OUT, 'pdf', fname + '.pdf')
        story = []
        label, volet = PRESTATIONS[presta]
        cover(story, 'Corpus documentaire — ' + esc(label), f'{volet} · {len(ds)} documents · collecte du {COLLECTE}', [
            'Ce dossier rassemble les informations publiques de la CNSS utilisées pour alimenter l\'Assistant CNSS (chatbot RAG, '
            'cahier des charges DSI-DAT-CDC-003). Chaque document porte ses métadonnées : référence, type, prestation, date, statut et source.',
            '<b>Avertissement :</b> document de travail généré automatiquement à partir du site cnss.dj et de sources publiques. '
            'Les textes numérisés et les sources externes doivent être relus et validés par le référent métier avant toute mise en production.',
        ])
        story.append(Spacer(1, 0.6 * cm))
        story.append(Paragraph('<b>Sommaire</b>', st['h2']))
        for i, d in enumerate(ds, 1):
            story.append(Paragraph(f'{i}. {esc(d["titre"])} <font color="#737588">— {d["type"]}{", " + d["date"] if d["date"] else ""}</font>', st['li']))
        for i, d in enumerate(ds, 1):
            story.append(PageBreak())
            story.append(Paragraph(f'{i}. {esc(d["titre"])}', st['h1']))
            story.append(meta_table(d))
            story.append(Spacer(1, 0.3 * cm))
            for kind, text in d['blocks']:
                if kind == 'h':
                    story.append(Paragraph(esc(text), st['h2']))
                elif kind == 'li':
                    story.append(Paragraph(esc(text), st['li'], bulletText='•'))
                else:
                    story.append(Paragraph(esc(text), st['p']))
            d['pdf'] = 'corpus/pdf/' + fname + '.pdf'
        SimpleDocTemplate(path, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
                          title='Corpus CNSS — ' + label, author='CNSS — Cellule DATA (maquette)').build(story, onFirstPage=footer, onLaterPages=footer)
        files[fname] = len(ds)

    # Catalogue
    story = []
    cover(story, 'Catalogue du corpus documentaire', f'{len(docs)} documents · collecte du {COLLECTE}', [
        'Inventaire des documents indexés par l\'Assistant CNSS, avec leurs métadonnées (CDC §8 : prestation, type, référence, date, statut).'])
    for fname, presta in DOSSIERS:
        ds = [d for d in docs if d['prestation'] == presta]
        if not ds:
            continue
        story.append(Paragraph(f'{esc(PRESTATIONS[presta][0])} — {PRESTATIONS[presta][1]} <font color="#737588">({fname}.pdf)</font>', st['h2']))
        rows = [[Paragraph('<b>Document</b>', st['meta']), Paragraph('<b>Type</b>', st['meta']), Paragraph('<b>Date</b>', st['meta']), Paragraph('<b>Statut</b>', st['meta'])]]
        rows += [[Paragraph(esc(d['titre']), st['meta']), Paragraph(d['type'], st['meta']), Paragraph(d['date'] or '—', st['meta']), Paragraph(d['statut'], st['meta'])] for d in ds]
        t = Table(rows, colWidths=[8.4 * cm, 2.8 * cm, 2 * cm, 3.4 * cm], repeatRows=1)
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eef2fe')), ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#dbe4fe')), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        story.append(t)
    SimpleDocTemplate(os.path.join(OUT, 'pdf', '00-catalogue.pdf'), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm,
                      bottomMargin=2 * cm, title='Catalogue du corpus CNSS').build(story, onFirstPage=footer, onLaterPages=footer)
    return files


def main():
    urls = [u.strip() for u in open(os.path.join(RAW, 'pdf-urls.txt')) if u.strip()]
    docs = load_pages() + load_pdf_texts(urls) + load_manual()
    for i, d in enumerate(docs):
        d['id'] = f'D{i + 1:03d}'
    files = build_pdfs(docs)

    passages = []
    for d in docs:
        for k, c in enumerate(chunk(d)):
            passages.append({'id': f'{d["id"]}-{k + 1}', 'doc': d['id'], 'section': c['section'], 'texte': c['texte']})
    catalog = [{k: d.get(k) for k in ('id', 'titre', 'prestation', 'type', 'reference', 'url', 'date', 'statut', 'pdf')} | {
        'passages': sum(1 for p in passages if p['doc'] == d['id']), 'volet': PRESTATIONS[d['prestation']][1]} for d in docs]
    meta = {'collecte': COLLECTE, 'genere_le': date.today().isoformat(), 'documents': len(docs), 'passages': len(passages),
            'dossiers': files, 'prestations': {k: v[0] for k, v in PRESTATIONS.items()}}
    json.dump({'meta': meta, 'documents': catalog}, open(os.path.join(OUT, 'documents.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(passages, open(os.path.join(OUT, 'passages.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    # Version chargeable par <script> : le chatbot fonctionne aussi hors serveur (file://).
    bundle = {'meta': meta, 'docs': [{k: d[k] for k in ('id', 'titre', 'prestation', 'type', 'url', 'date', 'statut', 'pdf', 'volet')} for d in catalog],
              'passages': [[p['id'], p['doc'], p['section'], p['texte']] for p in passages]}
    with open(os.path.join(OUT, 'corpus.js'), 'w') as f:
        f.write('// Généré par tools/build_corpus.py — ne pas modifier à la main.\nwindow.CNSS_CORPUS = ')
        json.dump(bundle, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(json.dumps(meta, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
