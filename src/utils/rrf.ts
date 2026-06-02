/**
 * Reciprocal Rank Fusion — combines ranked lists from different retrieval
 * sources (BM25, vector, graph) into a single ranking.
 *
 * For each ranked list, contribute `weight / (k + rank)` to the final score
 * of each document. Higher = better.
 *
 * Default k=60 follows the original Cormack et al. (2009) paper and rohitg00's
 * implementation. Weights are normalized to sum to 1 inside `rrf()`.
 */

const DEFAULT_K = 60;

export interface RankedSource {
  /** docId in descending relevance order */
  ids: string[];
  /** weight in [0, 1] before normalization */
  weight: number;
}

export function rrf(sources: RankedSource[], k: number = DEFAULT_K): Map<string, number> {
  const totalWeight = sources.reduce((s, x) => s + Math.max(0, x.weight), 0) || 1;
  const result = new Map<string, number>();
  for (const src of sources) {
    const w = src.weight / totalWeight;
    src.ids.forEach((id, i) => {
      const rank = i + 1;
      result.set(id, (result.get(id) ?? 0) + w * (1 / (k + rank)));
    });
  }
  return result;
}

/** Sort RRF result by score desc. */
export function topN(scores: Map<string, number>, n: number): Array<{ id: string; score: number }> {
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
