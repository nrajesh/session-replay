// Typo-tolerant search that runs in the page. Plain JS so it can be inlined as-is.
// Matching per query word: exact > prefix > substring; only when a word has none of those
// anywhere does it fall back to fuzzy (edit distance), then to trigram similarity.

const FIELD_WEIGHTS = { title: 3, decisions: 2, commits: 2, prompts: 1, files: 1 };

export function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function tokenize(s) {
  return normalize(s).match(/[\p{L}\p{N}]+/gu) || [];
}

/** Damerau-Levenshtein (optimal string alignment) distance, giving up early past `max`. */
export function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

function trigrams(t) {
  const s = ` ${t} `;
  const out = new Set();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

export function buildIndex(docs) {
  const vocab = new Map(); // token -> Map(docIndex -> best field weight)
  const texts = docs.map((d) => {
    const fields = {};
    for (const [name, text] of Object.entries(d.fields)) {
      fields[name] = String(text || '');
      const w = FIELD_WEIGHTS[name] || 1;
      for (const t of new Set(tokenize(text))) {
        let m = vocab.get(t);
        if (!m) vocab.set(t, (m = new Map()));
        const i = docs.indexOf(d);
        if ((m.get(i) || 0) < w) m.set(i, w);
      }
    }
    return fields;
  });
  return { ids: docs.map((d) => d.id), texts, vocab, tokens: [...vocab.keys()] };
}

function matchesFor(idx, q) {
  const strong = [];
  for (const t of idx.tokens) {
    if (t === q) strong.push([t, 1]);
    else if (q.length >= 2 && t.startsWith(q)) strong.push([t, 0.8]);
    else if (q.length >= 3 && t.includes(q)) strong.push([t, 0.6]);
  }
  if (strong.length || q.length < 4) return strong;
  const bound = q.length >= 8 ? 2 : 1;
  const fuzzy = [];
  for (const t of idx.tokens) if (editDistance(q, t, bound) <= bound) fuzzy.push([t, 0.5]);
  if (fuzzy.length) return fuzzy;
  const qg = trigrams(q);
  const tri = [];
  for (const t of idx.tokens) if (t.length >= 3 && jaccard(qg, trigrams(t)) >= 0.4) tri.push([t, 0.3]);
  return tri;
}

function makeSnippet(fields, terms) {
  for (const name of Object.keys(FIELD_WEIGHTS)) {
    const text = fields[name] || '';
    const norm = normalize(text);
    for (const t of terms) {
      const at = norm.indexOf(t);
      if (at < 0) continue;
      const start = Math.max(0, at - 60);
      const end = Math.min(text.length, at + t.length + 80);
      return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '…' : '');
    }
  }
  return '';
}

// Words people put in questions ("which sessions touched backups?") that say nothing about content.
const FILLER = new Set(('a an the of to in on at for and or but is are was were be been do does did have has had i me my we our you your it its this that these those which what when where who whom whose why how ' +
  'show find list tell give get see about with from by as into over than then so not no any all some there here session sessions chat chats conversation conversations touched touch involve involved decide decided decisions decision each every across mention mentioned discuss discussed').split(' '));

export function queryWords(query, filler = true) {
  const all = [...new Set(tokenize(query))];
  if (!filler) return all;
  const kept = all.filter((w) => !FILLER.has(w));
  return kept.length ? kept : all;
}

export function search(idx, query, limit = 200, opts = {}) {
  const qs = queryWords(query, opts.filler !== false);
  if (!qs.length) return [];
  const phrase = normalize(query).trim();
  const scores = new Map(); // doc -> {score, hit:Set(query word), terms:Set}
  for (const q of qs) {
    const best = new Map(); // doc -> [score, term]
    for (const [t, s] of matchesFor(idx, q)) {
      for (const [doc, w] of idx.vocab.get(t)) {
        const v = s * w;
        if (!best.has(doc) || best.get(doc)[0] < v) best.set(doc, [v, t]);
      }
    }
    for (const [doc, [v, t]] of best) {
      let e = scores.get(doc);
      if (!e) scores.set(doc, (e = { score: 0, hit: new Set(), terms: new Set() }));
      e.score += v;
      e.hit.add(q);
      e.terms.add(t);
    }
  }
  let entries = [...scores.entries()];
  const full = entries.filter(([, e]) => e.hit.size === qs.length);
  if (full.length) entries = full;
  if (qs.length > 1) {
    for (const [doc, e] of entries) {
      if (Object.values(idx.texts[doc]).some((t) => normalize(t).includes(phrase))) e.score += 1;
    }
  }
  entries.sort((a, b) => b[1].score - a[1].score || a[0] - b[0]);
  return entries.slice(0, limit).map(([doc, e]) => {
    const terms = [...e.terms];
    return { id: idx.ids[doc], score: e.score, terms, snippet: makeSnippet(idx.texts[doc], terms) };
  });
}
