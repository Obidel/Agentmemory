import type { Memory, MemoryTier } from '../types';

const HALF_LIFE_DAYS = 30;   // strength halves every ~30 days without access
const ACCESS_BOOST_THRESHOLD = 10;
const ACCESS_BOOST = 0.2;

/**
 * Time-based decay: every `HALF_LIFE_DAYS` of inactivity, strength halves.
 * strength = 0.95 ^ daysSinceAccess.
 * Importance (1-5) is folded in as a floor — an "★5" memory never fully decays.
 */
export function calculateStrength(m: Memory, now: number = Date.now()): number {
  const lastTouch = m.last_accessed_at || m.created_at;
  const daysSince = Math.max(0, (now - new Date(lastTouch).getTime()) / 86_400_000);
  const decay = Math.pow(0.5, daysSince / HALF_LIFE_DAYS);
  const importance = (m.importance ?? 3) / 5;
  const accessBoost = (m.access_count ?? 0) > ACCESS_BOOST_THRESHOLD ? ACCESS_BOOST : 0;
  return Math.min(1, importance * decay + accessBoost);
}

export function tierOf(m: Memory): MemoryTier {
  const s = calculateStrength(m);
  if (s >= 0.7) return 'hot';
  if (s >= 0.4) return 'warm';
  if (s >= 0.15) return 'cold';
  return 'dead';
}

/**
 * Tag a memory as accessed: bump access_count and update last_accessed_at.
 * Caller is responsible for persisting the result.
 */
export function touchMemory(m: Memory): Memory {
  return {
    ...m,
    access_count: (m.access_count ?? 0) + 1,
    last_accessed_at: new Date().toISOString(),
  };
}

/**
 * Pick memories eligible for auto-forgetting:
 *  - importance <= 2 AND not accessed in 180 days, OR
 *  - strength < 0.05 AND access_count < 3, OR
 *  - forget_after in the past
 */
const LOW_VALUE_IMPORTANCE = 2;
const LOW_VALUE_AGE_DAYS = 180;
export function isForgetCandidate(m: Memory, now: number = Date.now()): boolean {
  if (m.forget_after && new Date(m.forget_after).getTime() < now) return true;
  if (m.is_latest === false) return false; // already superseded
  const s = calculateStrength(m, now);
  if (s < 0.05 && (m.access_count ?? 0) < 3) return true;
  if ((m.importance ?? 3) <= LOW_VALUE_IMPORTANCE) {
    const last = m.last_accessed_at || m.created_at;
    const days = (now - new Date(last).getTime()) / 86_400_000;
    if (days > LOW_VALUE_AGE_DAYS) return true;
  }
  return false;
}

/**
 * Pairwise Jaccard similarity over concept tags.
 * Returns 0-1. Used for cheap contradiction / dedup detection.
 */
export function jaccard(a: string[] = [], b: string[] = []): number {
  if (a.length === 0 || b.length === 0) return 0;
  const A = new Set(a.map(s => s.toLowerCase()));
  const B = new Set(b.map(s => s.toLowerCase()));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Heuristic concept extraction from free text. Cheap, no LLM.
 * Pulls out: explicit tags + lowercased content keywords ≥ 4 chars + filter stopwords.
 */
const STOPWORDS = new Set([
  'this','that','with','from','have','were','they','them','what','when','where','which',
  'their','there','will','would','could','should','about','because','these','those','into',
  'than','then','also','only','over','after','before','just','like','more','some','such',
]);
export function extractConcepts(content: string, tags: string[] = []): string[] {
  const out = new Set<string>();
  for (const t of tags) out.add(t.toLowerCase().trim());
  const words = content.toLowerCase().match(/[a-zа-яё0-9_-]{4,}/giu) ?? [];
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return [...out].slice(0, 20);
}
