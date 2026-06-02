import { tokenize } from './stemmer';

export interface BM25Index {
  /** term -> { docId: termFrequency } */
  inverted: Map<string, Map<string, number>>;
  /** docId -> token count */
  lengths: Map<string, number>;
  avgDl: number;
  N: number;
}

const K1 = 1.2;
const B  = 0.75;

export function buildBM25Index(docs: Array<{ id: string; text: string }>): BM25Index {
  const inverted = new Map<string, Map<string, number>>();
  const lengths = new Map<string, number>();
  let total = 0;

  for (const doc of docs) {
    const tokens = tokenize(doc.text);
    lengths.set(doc.id, tokens.length);
    total += tokens.length;
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [term, freq] of tf) {
      let posting = inverted.get(term);
      if (!posting) { posting = new Map(); inverted.set(term, posting); }
      posting.set(doc.id, freq);
    }
  }

  return { inverted, lengths, avgDl: docs.length === 0 ? 0 : total / docs.length, N: docs.length };
}

export function bm25Score(index: BM25Index, docId: string, queryTokens: string[]): number {
  if (index.N === 0 || index.avgDl === 0) return 0;
  const dl = index.lengths.get(docId) ?? 0;
  if (dl === 0) return 0;
  let score = 0;
  for (const term of queryTokens) {
    const posting = index.inverted.get(term);
    if (!posting) continue;
    const tf = posting.get(docId) ?? 0;
    if (tf === 0) continue;
    const df = posting.size;
    const idf = Math.log(1 + (index.N - df + 0.5) / (df + 0.5));
    const norm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * dl) / index.avgDl));
    score += idf * norm;
  }
  return score;
}

export function bm25Search(index: BM25Index, query: string, limit = 50): Array<{ id: string; score: number }> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const scores = new Map<string, number>();
  for (const term of queryTokens) {
    const posting = index.inverted.get(term);
    if (!posting) continue;
    for (const [docId, _tf] of posting) {
      const s = bm25Score(index, docId, queryTokens);
      if (s > 0) scores.set(docId, s);
    }
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
