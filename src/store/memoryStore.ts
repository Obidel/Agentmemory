import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { Memory, MemoryRelation, MemoryCategory, MemorySource, User } from '../types';
import { calculateStrength, touchMemory, isForgetCandidate, extractConcepts } from '../utils/memoryDecay';
import { buildBM25Index, bm25Search, type BM25Index } from '../utils/bm25';
import { rrf, topN } from '../utils/rrf';

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@agentmemory.fyi',
  name: 'Demo User',
  plan: 'free',
  memory_count: 0,
  project_count: 1,
};

const SEED_MEMORIES: Memory[] = [
  {
    id: 'mem-001',
    user_id: 'demo-user-001',
    project_name: 'My React App',
    content: 'Always use TypeScript strict mode. Enable noImplicitAny, strictNullChecks, and strictFunctionTypes in tsconfig.json.',
    category: 'constraint',
    source: 'cursor',
    tags: ['typescript', 'config', 'strict'],
    importance: 5,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-002',
    user_id: 'demo-user-001',
    project_name: 'My React App',
    content: 'Use Tailwind CSS for all styling. Never use inline styles or CSS modules unless absolutely necessary for complex animations.',
    category: 'preference',
    source: 'claude',
    tags: ['tailwind', 'styling', 'css'],
    importance: 4,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-003',
    user_id: 'demo-user-001',
    project_name: 'My React App',
    content: 'Project uses React 18 with concurrent features. Use Suspense for data fetching and lazy loading components.',
    category: 'architecture',
    source: 'manual',
    tags: ['react', 'architecture', 'suspense'],
    importance: 5,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-004',
    user_id: 'demo-user-001',
    project_name: 'My React App',
    content: 'API calls use React Query (TanStack Query v5). Never use useEffect for data fetching. Always define query keys in a separate constants file.',
    category: 'architecture',
    source: 'claude',
    tags: ['react-query', 'api', 'data-fetching'],
    importance: 4,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-005',
    user_id: 'demo-user-001',
    project_name: 'My React App',
    content: 'Authentication is handled by NextAuth.js with GitHub and Google providers. JWT strategy with 30-day session expiry.',
    category: 'context',
    source: 'cursor',
    tags: ['auth', 'nextauth', 'jwt'],
    importance: 5,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-006',
    user_id: 'demo-user-001',
    project_name: 'My React App',
    content: 'Decided to use Zustand over Redux for state management. Reasoning: simpler API, less boilerplate, sufficient for current complexity.',
    category: 'decision',
    source: 'manual',
    tags: ['zustand', 'state-management', 'redux'],
    importance: 3,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-007',
    user_id: 'demo-user-001',
    project_name: 'API Service',
    content: 'All API endpoints must return consistent JSON structure: { data, error, meta }. Never return raw arrays at the top level.',
    category: 'constraint',
    source: 'claude',
    tags: ['api', 'json', 'structure'],
    importance: 5,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-008',
    user_id: 'demo-user-001',
    project_name: 'API Service',
    content: 'Database is PostgreSQL 15 with Supabase. Use row-level security (RLS) for all tables. Never bypass RLS in application code.',
    category: 'constraint',
    source: 'cursor',
    tags: ['postgresql', 'supabase', 'rls', 'security'],
    importance: 5,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-009',
    user_id: 'demo-user-001',
    project_name: 'API Service',
    content: 'Error handling: use custom AppError class extending Error. Include error code, HTTP status, and user-friendly message.',
    category: 'architecture',
    source: 'manual',
    tags: ['error-handling', 'typescript', 'api'],
    importance: 4,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-010',
    user_id: 'demo-user-001',
    project_name: 'My React App',
    content: 'Prefer functional components with hooks over class components. Use forwardRef for components that need ref access.',
    category: 'preference',
    source: 'cursor',
    tags: ['react', 'hooks', 'components'],
    importance: 3,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const SEED_RELATIONS: MemoryRelation[] = [
  { id: 'rel-001', from_memory_id: 'mem-001', to_memory_id: 'mem-010', relation_type: 'related', strength: 0.8 },
  { id: 'rel-002', from_memory_id: 'mem-003', to_memory_id: 'mem-004', relation_type: 'extends', strength: 0.75 },
  { id: 'rel-003', from_memory_id: 'mem-003', to_memory_id: 'mem-010', relation_type: 'related', strength: 0.7 },
  { id: 'rel-004', from_memory_id: 'mem-005', to_memory_id: 'mem-008', relation_type: 'related', strength: 0.65 },
  { id: 'rel-005', from_memory_id: 'mem-007', to_memory_id: 'mem-009', relation_type: 'related', strength: 0.85 },
  { id: 'rel-006', from_memory_id: 'mem-007', to_memory_id: 'mem-008', relation_type: 'extends', strength: 0.72 },
  { id: 'rel-007', from_memory_id: 'mem-001', to_memory_id: 'mem-009', relation_type: 'related', strength: 0.6 },
  { id: 'rel-008', from_memory_id: 'mem-002', to_memory_id: 'mem-010', relation_type: 'related', strength: 0.55 },
];

// === Pure helpers (no React, no Zustand) ===

export function generateId(): string {
  return 'mem-' + Math.random().toString(36).substring(2, 11);
}

export function generateRelationId(): string {
  return 'rel-' + Math.random().toString(36).substring(2, 9);
}

export function simpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const vec = new Array(20).fill(0);
  words.forEach((word, i) => {
    for (let j = 0; j < word.length; j++) {
      vec[(i + j) % 20] += word.charCodeAt(j) / 1000;
    }
  });
  const mag = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return vec.map((v: number) => v / mag);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((s, ai, i) => s + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  return dot / (magA * magB) || 0;
}

const SIMILARITY_THRESHOLD = 0.7;

export function buildRelationsFor(
  newMemory: Memory,
  existing: Memory[],
  currentRelations: MemoryRelation[]
): MemoryRelation[] {
  if (!newMemory.embedding) return [];
  const created: MemoryRelation[] = [];
  for (const other of existing) {
    if (other.id === newMemory.id) continue;
    if (!other.embedding) continue;
    const sim = cosineSimilarity(newMemory.embedding, other.embedding);
    if (sim <= SIMILARITY_THRESHOLD) continue;
    const dup = currentRelations.some(
      r => (r.from_memory_id === newMemory.id && r.to_memory_id === other.id) ||
           (r.from_memory_id === other.id && r.to_memory_id === newMemory.id)
    );
    if (dup) continue;
    created.push({
      id: generateRelationId(),
      from_memory_id: newMemory.id,
      to_memory_id: other.id,
      relation_type: 'related',
      strength: sim,
    });
  }
  return created;
}

// ─── RRF hybrid search (BM25 + Vector + Graph) ──────────────────────

/** Pre-built BM25 index, lazy-initialized and kept in sync via getBm25Index(). */
let _bm25Cache: { id: string; index: BM25Index } | null = null;

export function getBm25Index(memories: Memory[]): BM25Index {
  // Cache key: count + max(updated_at) — cheap change detection.
  const sig = `${memories.length}:${memories.reduce((m, x) => Math.max(m, new Date(x.updated_at).getTime()), 0)}`;
  if (_bm25Cache && _bm25Cache.id === sig) return _bm25Cache.index;
  const index = buildBM25Index(memories.map(m => ({ id: m.id, text: m.content })));
  _bm25Cache = { id: sig, index };
  return index;
}

export function invalidateBm25Index() { _bm25Cache = null; }

export interface SearchWeights { bm25: number; vector: number; graph: number }
const DEFAULT_WEIGHTS: SearchWeights = { bm25: 0.4, vector: 0.6, graph: 0.3 };

/**
 * Hybrid RRF search. Combines:
 *  - BM25 over content (fast, lexical)
 *  - Cosine similarity over the cheap 20-dim embeddings (semantic)
 *  - Graph proximity: memories connected to the top-1 BM25 hit by a relation
 * Returns the original Memory objects sorted by fused score.
 */
export function hybridSearch(
  query: string,
  memories: Memory[],
  relations: MemoryRelation[],
  options: { weights?: SearchWeights; project?: string; category?: MemoryCategory; limit?: number } = {}
): Array<Memory & { rrfScore: number; bm25: number; vector: number; graph: number }> {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const limit = options.limit ?? 20;
  if (!query.trim()) return [];

  let candidates = memories;
  if (options.project) candidates = candidates.filter(m => m.project_name === options.project);
  if (options.category) candidates = candidates.filter(m => m.category === options.category);
  if (candidates.length === 0) return [];

  // 1) BM25
  const bm25Idx = getBm25Index(candidates);
  const bm25Hits = bm25Search(bm25Idx, query, Math.min(50, candidates.length));
  const bm25Ranks = bm25Hits.map(h => h.id);
  const bm25ScoreMap = new Map(bm25Hits.map(h => [h.id, h.score]));

  // 2) Vector
  const queryEmb = simpleEmbedding(query);
  const vectorRanks = candidates
    .filter(m => m.embedding)
    .map(m => ({ id: m.id, score: cosineSimilarity(queryEmb, m.embedding!) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map(x => x.id);
  const vectorScoreMap = new Map(
    candidates
      .filter(m => m.embedding)
      .map(m => [m.id, cosineSimilarity(queryEmb, m.embedding!)] as const)
  );

  // 3) Graph: gather all memories related to the top-3 BM25 hits, push to front
  const graphRelated = new Set<string>();
  for (const id of bm25Ranks.slice(0, 3)) {
    for (const r of relations) {
      if (r.from_memory_id === id) graphRelated.add(r.to_memory_id);
      if (r.to_memory_id === id) graphRelated.add(r.from_memory_id);
    }
  }
  const graphRanks = [...graphRelated];

  // 4) RRF fusion
  const fused = rrf([
    { ids: bm25Ranks,    weight: weights.bm25 },
    { ids: vectorRanks,  weight: weights.vector },
    { ids: graphRanks,   weight: weights.graph },
  ]);
  const ranked = topN(fused, limit);

  const byId = new Map(candidates.map(m => [m.id, m]));
  return ranked
    .map(r => byId.get(r.id))
    .filter((m): m is Memory => Boolean(m))
    .map(m => ({
      ...m,
      rrfScore: rrfFuseScore(m.id, bm25Ranks, vectorRanks, graphRanks, weights),
      bm25: bm25ScoreMap.get(m.id) ?? 0,
      vector: vectorScoreMap.get(m.id) ?? 0,
      graph: graphRelated.has(m.id) ? 1 : 0,
    }));
}

function rrfFuseScore(id: string, bm25Ids: string[], vecIds: string[], graphIds: string[], w: SearchWeights): number {
  const r = (arr: string[]) => arr.indexOf(id);
  const total = w.bm25 + w.vector + w.graph || 1;
  const s = (arr: string[], weight: number) => {
    const i = r(arr);
    return i < 0 ? 0 : (weight / total) * (1 / (60 + i + 1));
  };
  return s(bm25Ids, w.bm25) + s(vecIds, w.vector) + s(graphIds, w.graph);
}

const seedMemoriesWithEmbeddings: Memory[] = SEED_MEMORIES.map(m => ({
  ...m,
  embedding: simpleEmbedding(m.content),
  concepts: extractConcepts(m.content, m.tags),
  strength: 1.0,
  access_count: 0,
  last_accessed_at: m.created_at,
  is_latest: true,
}));

// === Cross-environment storage adapter ===

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function createFileStorage(): StateStorage {
  // Dynamic require keeps `fs`/`path` out of the browser bundle entirely.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path');

  const getDir = (): string => process.env.AGENTMEMORY_HOME ?? process.cwd();
  const filePath = (name: string): string => path.join(getDir(), `${name}.json`);

  return {
    getItem: (name) => {
      try {
        const p = filePath(name);
        if (!fs.existsSync(p)) return null;
        return fs.readFileSync(p, 'utf-8');
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        const dir = getDir();
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath(name), value);
      } catch (err) {
        console.error('agentmemory: fileStorage.setItem failed', err);
      }
    },
    removeItem: (name) => {
      try {
        const p = filePath(name);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (err) {
        console.error('agentmemory: fileStorage.removeItem failed', err);
      }
    },
  };
}

const memoryStorage = createJSONStorage(() =>
  isBrowser() ? localStorage : createFileStorage()
);

// === Plan limits ===
// AgentMemory is fully free and open source. The plan metadata lives in
// utils/planConfig.ts (used for analytics and the sponsor badge). No limits
// are enforced anywhere — see planConfig.ts for the source of truth.

// === Zustand store ===

interface MemoryStore {
  memories: Memory[];
  relations: MemoryRelation[];
  currentUser: User;
  activeProject: string;
  projects: string[];
  isCloud: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;

  addMemory: (memory: Omit<Memory, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Memory;
  updateMemory: (id: string, updates: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  addRelation: (relation: Omit<MemoryRelation, 'id'>) => void;
  deleteRelation: (id: string) => void;
  setActiveProject: (project: string) => void;
  addProject: (name: string) => void;
  importMemories: (memories: Partial<Memory>[]) => Memory[];
  getMemoriesByProject: (project: string) => Memory[];
  searchMemories: (query: string, category?: MemoryCategory, source?: MemorySource) => Memory[];
  getSimilarMemories: (memoryId: string) => Memory[];

  setCloudUser: (user: User | null) => void;
  pullFromCloud: () => Promise<void>;
  pushMemoryToCloud: (m: Memory) => Promise<void>;
  deleteMemoryFromCloud: (id: string) => Promise<void>;

  touchMemoryById: (id: string) => void;
  runAutoForget: () => number;
  getMemoryStrength: (m: Memory) => number;
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: seedMemoriesWithEmbeddings,
      relations: SEED_RELATIONS,
      currentUser: DEMO_USER,
      activeProject: 'My React App',
      projects: ['My React App', 'API Service'],
      isCloud: false,
      syncing: false,
      lastSyncedAt: null,

      addMemory: (memoryData) => {
        const now = new Date().toISOString();
        const newMemory: Memory = {
          ...memoryData,
          id: generateId(),
          user_id: get().currentUser.id,
          embedding: simpleEmbedding(memoryData.content),
          importance: memoryData.importance || 3,
          strength: 1.0,
          access_count: 0,
          last_accessed_at: now,
          is_latest: true,
          concepts: extractConcepts(memoryData.content, memoryData.tags),
          created_at: now,
          updated_at: now,
        };
        set(state => ({ memories: [...state.memories, newMemory] }));
        invalidateBm25Index();

        const { memories, relations } = get();
        const newRelations = buildRelationsFor(newMemory, memories, relations);
        if (newRelations.length > 0) {
          set(state => ({ relations: [...state.relations, ...newRelations] }));
        }

        if (get().isCloud) {
          void get().pushMemoryToCloud(newMemory);
        }

        return newMemory;
      },

      updateMemory: (id, updates) => {
        let updated: Memory | undefined;
        set(state => ({
          memories: state.memories.map(m => {
            if (m.id !== id) return m;
            updated = {
              ...m,
              ...updates,
              updated_at: new Date().toISOString(),
              embedding: updates.content ? simpleEmbedding(updates.content) : m.embedding,
            };
            return updated;
          }),
        }));
        if (updated) invalidateBm25Index();
        if (updated && get().isCloud) {
          void get().pushMemoryToCloud(updated);
        }
      },

      deleteMemory: (id) => {
        set(state => ({
          memories: state.memories.filter(m => m.id !== id),
          relations: state.relations.filter(r => r.from_memory_id !== id && r.to_memory_id !== id),
        }));
        invalidateBm25Index();
        if (get().isCloud) {
          void get().deleteMemoryFromCloud(id);
        }
      },

      addRelation: (relation) => {
        const newRelation: MemoryRelation = { ...relation, id: generateRelationId() };
        set(state => ({ relations: [...state.relations, newRelation] }));
      },

      deleteRelation: (id) => {
        set(state => ({ relations: state.relations.filter(r => r.id !== id) }));
      },

      setActiveProject: (project) => set({ activeProject: project }),

      addProject: (name) => {
        set(state => ({
          projects: state.projects.includes(name) ? state.projects : [...state.projects, name],
          activeProject: name,
        }));
      },

      importMemories: (memoriesData) => {
        const imported: Memory[] = [];
        for (const data of memoriesData) {
          if (!data.content) continue;
          const m = get().addMemory({
            project_name: data.project_name || get().activeProject,
            content: data.content,
            category: data.category || 'context',
            source: data.source || 'import',
            tags: data.tags || [],
            importance: data.importance || 3,
          });
          imported.push(m);
        }
        return imported;
      },

      getMemoriesByProject: (project) => {
        if (project === 'all') return get().memories;
        return get().memories.filter(m => m.project_name === project);
      },

      searchMemories: (query, category?, source?) => {
        const { memories, relations } = get();
        if (!query.trim()) {
          return memories.filter(m => {
            if (category && m.category !== category) return false;
            if (source && m.source !== source) return false;
            return true;
          });
        }
        const hits = hybridSearch(query, memories, relations, { category, limit: 50 });
        return hits
          .filter(m => !source || m.source === source)
          .map(m => ({ ...m, similarity: m.vector }));
      },

      getSimilarMemories: (memoryId) => {
        const { memories } = get();
        const target = memories.find(m => m.id === memoryId);
        if (!target || !target.embedding) return [];
        return memories
          .filter(m => m.id !== memoryId && m.embedding)
          .map(m => ({ ...m, similarity: cosineSimilarity(target.embedding!, m.embedding!) }))
          .filter((m): m is Memory & { similarity: number } => (m as Memory & { similarity: number }).similarity > 0.5)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);
      },

      setCloudUser: (user) => {
        if (user) {
          set({ currentUser: user, isCloud: true });
        } else {
          set({ currentUser: DEMO_USER, isCloud: false });
        }
      },

      pullFromCloud: async () => {
        if (!get().isCloud) return;
        const { pullAllFromCloud } = await import('../lib/cloudSync');
        set({ syncing: true });
        try {
          const { memories, relations, projects } = await pullAllFromCloud();
          set({
            memories: memories.length ? memories : seedMemoriesWithEmbeddings,
            relations,
            projects: projects.length ? projects : ['My React App', 'API Service'],
            activeProject: projects[0] || 'My React App',
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('agentmemory: pullFromCloud failed', err);
        } finally {
          set({ syncing: false });
        }
      },

      pushMemoryToCloud: async (m) => {
        if (!get().isCloud) return;
        const { pushToCloud } = await import('../lib/cloudSync');
        try {
          await pushToCloud(m);
          set({ lastSyncedAt: new Date().toISOString() });
        } catch (err) {
          console.error('agentmemory: pushMemoryToCloud failed', err);
        }
      },

      deleteMemoryFromCloud: async (id) => {
        if (!get().isCloud) return;
        const { deleteFromCloud } = await import('../lib/cloudSync');
        try {
          await deleteFromCloud(id);
          set({ lastSyncedAt: new Date().toISOString() });
        } catch (err) {
          console.error('agentmemory: deleteMemoryFromCloud failed', err);
        }
      },

      touchMemoryById: (id) => {
        set(state => ({
          memories: state.memories.map(m => m.id === id ? touchMemory(m) : m),
        }));
      },

      runAutoForget: () => {
        const now = Date.now();
        const before = get().memories.length;
        const survivors = get().memories.filter(m => !isForgetCandidate(m, now));
        const removed = before - survivors.length;
        if (removed > 0) {
          set(state => ({
            memories: survivors,
            relations: state.relations.filter(
              r => survivors.some(m => m.id === r.from_memory_id) &&
                   survivors.some(m => m.id === r.to_memory_id)
            ),
          }));
          invalidateBm25Index();
        }
        return removed;
      },

      getMemoryStrength: (m) => calculateStrength(m),
    }),
    {
      name: 'agent-memory-store',
      storage: memoryStorage,
      partialize: (state) => ({
        memories: state.memories,
        relations: state.relations,
        projects: state.projects,
        activeProject: state.activeProject,
        currentUser: state.currentUser,
      }),
    }
  )
);
