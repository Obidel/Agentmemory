import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Memory, MemoryCategory } from '../../src/types/index.js';
import type { MemoryBackend } from '../server.js';
import type { Embedder } from '../embeddings.js';
import { memoryToText } from '../embeddings.js';

interface MemoryRow {
  id: string;
  user_id: string;
  project_id: string | null;
  project_name: string;
  content: string;
  category: Memory['category'];
  importance: number;
  tags: string[];
  concepts: string[];
  source: Memory['source'];
  strength: number;
  access_count: number;
  last_accessed_at: string;
  is_latest: boolean;
  forget_after: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  active_project: string | null;
}

/**
 * SupabaseBackend: queries Postgres via RLS using the caller's JWT.
 * The `supabase` client is created with the user's access token so RLS
 * policies filter everything down to their own rows.
 */
export class SupabaseBackend implements MemoryBackend {
  private readonly sb: SupabaseClient;
  private activeProject: string | null = null;
  private embedder: Embedder | null = null;
  private readonly maxPerHour: number;

  constructor(supabaseUrl: string, supabaseAnonKey: string, jwt: string, embedder: Embedder | null = null, opts: { maxEmbeddingPerHour?: number } = {}) {
    this.sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.embedder = embedder;
    this.maxPerHour = opts.maxEmbeddingPerHour ?? 0;
  }

  private async checkQuota(cost: number): Promise<void> {
    if (this.maxPerHour <= 0) return;
    const user = (await this.sb.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await this.sb.rpc('consume_rate_limit', {
      p_user_id: user.id,
      p_cost: cost,
      p_max: this.maxPerHour,
    });
    if (error) {
      // Fail open if the rate-limit table is missing (user didn't run schema.sql
      // section yet). Log and continue so the rest of the search still works.
      if (/relation .* does not exist|function .* does not exist/i.test(error.message)) {
        console.warn('[supabase] rate-limit RPC missing, allowing embed:', error.message);
        return;
      }
      throw error;
    }
    type Row = { allowed: boolean; used: number; reset_at: string };
    const row = (data as Row[] | null)?.[0];
    if (row && row.allowed === false) {
      throw new Error(
        `Embedding rate limit reached: ${this.maxPerHour} calls/hour. ` +
        `Resets at ${row.reset_at}. Run backfill_embeddings later or upgrade your plan.`
      );
    }
  }

  private async safeEmbed(texts: string[]): Promise<number[][] | null> {
    if (!this.embedder || texts.length === 0) return null;
    const cost = Math.max(1, Math.ceil(texts.length / 32));
    await this.checkQuota(cost);
    return this.embedder.embed(texts);
  }

  private async ensureProject(name: string): Promise<string> {
    const user = (await this.sb.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');
    const found = await this.sb.from('projects').select('id').eq('user_id', user.id).eq('name', name).maybeSingle();
    if (found.data) return found.data.id as string;
    const ins = await this.sb.from('projects').insert({ user_id: user.id, name }).select('id').single();
    if (ins.error) throw ins.error;
    return ins.data!.id as string;
  }

  private async loadActiveProject(): Promise<string> {
    if (this.activeProject) return this.activeProject;
    const user = (await this.sb.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');
    const r = await this.sb.from('profiles').select('active_project').eq('id', user.id).maybeSingle();
    const p = r.data as Pick<ProfileRow, 'active_project'> | null;
    this.activeProject = p?.active_project ?? 'default';
    return this.activeProject;
  }

  private async persistActiveProject(name: string): Promise<void> {
    const user = (await this.sb.auth.getUser()).data.user;
    if (!user) return;
    await this.sb.from('profiles').update({ active_project: name }).eq('id', user.id);
    this.activeProject = name;
  }

  async addMemory(input: { content: string; category: MemoryCategory; project?: string; tags?: string[]; importance?: number }): Promise<Memory> {
    const projectName = input.project ?? (await this.loadActiveProject());
    const projectId = await this.ensureProject(projectName);
    const id = 'mem-' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const tags = input.tags ?? [];
    let embedding: number[] | null = null;
    if (this.embedder) {
      try {
        const vecs = await this.safeEmbed([memoryToText({ content: input.content, category: input.category, tags, project_name: projectName })]);
        embedding = vecs?.[0] ?? null;
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('rate limit')) throw e;
        console.warn('[supabase] embedder failed, storing without embedding:', msg);
      }
    }
    const row: Record<string, unknown> = {
      id,
      project_id: projectId,
      project_name: projectName,
      content: input.content,
      category: input.category,
      importance: input.importance ?? 3,
      tags,
      concepts: extractConcepts(input.content, tags),
      source: 'agent',
      strength: 1.0,
      access_count: 0,
      last_accessed_at: now,
      is_latest: true,
    };
    if (embedding) {
      row.embedding = this.toPgVector(embedding);
    }
    const { data, error } = await this.sb.from('memories').insert(row).select('*').single();
    if (error) throw error;
    const m = data as MemoryRow;
    return this.rowToMemory(m);
  }

  private toPgVector(vec: number[]): string {
    return '[' + vec.map(n => Number.isFinite(n) ? n.toFixed(6) : '0').join(',') + ']';
  }

  async searchMemories(input: { query: string; project?: string; category?: MemoryCategory; limit?: number }): Promise<Memory[]> {
    const limit = input.limit ?? 10;
    const query = input.query ?? '';
    if (!query.trim()) {
      return this.listMemories({ project: input.project, category: input.category }).then(m => m.slice(0, limit));
    }

    // 1. BM25 source: pg_trgm similarity (server-side, RLS-scoped)
    const { data: bm25Rows, error: bm25Err } = await this.sb.rpc('search_memories', {
      p_query: query,
      p_limit: Math.max(limit * 2, 20),
      p_project: input.project ?? null,
      p_category: input.category ?? null,
    });
    if (bm25Err) throw bm25Err;
    const bm25List = (bm25Rows ?? []) as Array<{ id: string; score: number; [k: string]: unknown }>;
    const bm25Ranks = new Map<string, number>();
    bm25List.forEach((r, i) => bm25Ranks.set(r.id, i + 1));

    // 2. Vector source: pgvector cosine (only if embedder available)
    const vectorRanks = new Map<string, number>();
    if (this.embedder) {
      try {
        const vecs = await this.safeEmbed([query]);
        const qVec = vecs?.[0];
        if (qVec) {
          const { data: vecRows, error: vecErr } = await this.sb.rpc('semantic_search_memories', {
            p_query_embedding: this.toPgVector(qVec),
            p_project: input.project ?? null,
            p_category: input.category ?? null,
            p_limit: Math.max(limit * 2, 20),
          });
          if (vecErr) throw vecErr;
          ((vecRows ?? []) as Array<{ id: string }>).forEach((r, i) => vectorRanks.set(r.id, i + 1));
        }
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('rate limit')) throw e;
        console.warn('[supabase] embedder failed, skipping vector source:', msg);
      }
    }

    // 3. Graph source: 1-hop neighbours of top-3 BM25 hits via relations table
    const seedIds = bm25List.slice(0, 3).map(r => r.id);
    let graphIds: string[] = [];
    if (seedIds.length > 0) {
      const { data: rels, error: relErr } = await this.sb
        .from('relations')
        .select('from_memory_id, to_memory_id')
        .or(`from_memory_id.in.(${seedIds.join(',')}),to_memory_id.in.(${seedIds.join(',')})`);
      if (relErr) throw relErr;
      const related = new Set<string>();
      for (const r of (rels ?? []) as Array<{ from_memory_id: string; to_memory_id: string }>) {
        if (!seedIds.includes(r.from_memory_id)) related.add(r.from_memory_id);
        if (!seedIds.includes(r.to_memory_id))   related.add(r.to_memory_id);
      }
      graphIds = [...related].filter(id => !bm25Ranks.has(id) && !vectorRanks.has(id));
    }

    let graphRanks = new Map<string, number>();
    if (graphIds.length > 0) {
      const { data: graphRows, error: gErr } = await this.sb
        .from('memories')
        .select('*')
        .in('id', graphIds);
      if (gErr) throw gErr;
      (graphRows ?? []).forEach((row, i) => graphRanks.set((row as MemoryRow).id, i + 1));
    }

    // 4. RRF fusion (k=60, weights: BM25=0.4, vector=0.6, graph=0.3)
    const K = 60;
    const W_BM25 = 0.4;
    const W_VECTOR = 0.6;
    const W_GRAPH = 0.3;
    const scores = new Map<string, number>();
    const allIds = new Set<string>([...bm25Ranks.keys(), ...vectorRanks.keys(), ...graphRanks.keys()]);
    for (const id of allIds) {
      const bm25Rank   = bm25Ranks.get(id);
      const vectorRank = vectorRanks.get(id);
      const graphRank  = graphRanks.get(id);
      let s = 0;
      if (bm25Rank)   s += W_BM25   * (1 / (K + bm25Rank));
      if (vectorRank) s += W_VECTOR * (1 / (K + vectorRank));
      if (graphRank)  s += W_GRAPH  * (1 / (K + graphRank));
      scores.set(id, s);
    }

    // 5. Fetch full memory rows for the winners (preserves category/project filters via IN)
    const winnerIds = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    if (winnerIds.length === 0) return [];
    const { data: winners, error: wErr } = await this.sb
      .from('memories')
      .select('*')
      .in('id', winnerIds);
    if (wErr) throw wErr;
    const byId = new Map((winners as MemoryRow[]).map(r => [r.id, this.rowToMemory(r)]));
    return winnerIds.map(id => byId.get(id)!).filter(Boolean);
  }

  async listMemories(input: { project?: string; category?: MemoryCategory }): Promise<Memory[]> {
    let q = this.sb.from('memories').select('*').order('created_at', { ascending: false });
    const project = input.project ?? 'all';
    if (project !== 'all') q = q.eq('project_name', project);
    if (input.category) q = q.eq('category', input.category);
    const { data, error } = await q;
    if (error) throw error;
    return (data as MemoryRow[]).map(this.rowToMemory);
  }

  async findSimilar(input: { text?: string; memoryId?: string; topK?: number }): Promise<Array<Memory & { score: number }>> {
    const target = input.text ?? '';
    if (!target && !input.memoryId) return [];
    const { data, error } = await this.sb.rpc('find_similar_memories', {
      p_query: target,
      p_limit: input.topK ?? 5,
    });
    if (error) throw error;
    type Row = { id: string; project_name: string; content: string; category: MemoryCategory; score: number };
    return (data as Row[]).map(r => ({
      id: r.id,
      user_id: '',
      project_name: r.project_name,
      content: r.content,
      category: r.category,
      importance: 3,
      tags: [],
      concepts: [],
      source: 'agent' as const,
      strength: 1,
      access_count: 0,
      last_accessed_at: new Date().toISOString(),
      is_latest: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      score: r.score,
    }));
  }

  async deleteMemory(id: string): Promise<void> {
    const { error } = await this.sb.from('memories').delete().eq('id', id);
    if (error) throw error;
  }

  async listProjects(): Promise<string[]> {
    const { data, error } = await this.sb.from('projects').select('name').order('name', { ascending: true });
    if (error) throw error;
    return (data as Array<{ name: string }>).map(r => r.name);
  }

  async getActiveProject(): Promise<string> {
    return this.loadActiveProject();
  }

  async switchProject(name: string): Promise<void> {
    await this.ensureProject(name);
    await this.persistActiveProject(name);
  }

  async getProjectContextMarkdown(): Promise<{ project: string; markdown: string }> {
    const project = await this.loadActiveProject();
    const mems = await this.listMemories({ project });
    if (mems.length === 0) return { project, markdown: '' };
    const byCat: Record<string, Memory[]> = {};
    for (const m of mems) (byCat[m.category] ??= []).push(m);
    const sections = Object.entries(byCat)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, items]) => {
        const lines = items
          .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
          .map(m => `- (★${m.importance}) ${m.content}${m.tags.length ? ` _[${m.tags.join(', ')}]_` : ''}`);
        return `## ${cat}\n\n${lines.join('\n')}`;
      });
    return { project, markdown: `# Rules for ${project}\n\n${sections.join('\n\n')}\n` };
  }

  async getRules(): Promise<string> {
    const project = await this.loadActiveProject();
    const mems = await this.listMemories({ project });
    return mems.map(m => `- (★${m.importance}) [${m.category}] ${m.content}`).join('\n') || 'No rules.';
  }

  async getGraphJson(): Promise<string> {
    const { data, error } = await this.sb.from('relations').select('*');
    if (error) throw error;
    return JSON.stringify({ relations: data }, null, 2);
  }

  async getProjectsJson(): Promise<string> {
    const projects = await this.listProjects();
    const active = await this.getActiveProject();
    return JSON.stringify({ projects, active }, null, 2);
  }

  /**
   * Backfill embeddings for memories that have none. Uses the same
   * rate-limited HF embedder as the rest of the backend. Returns counts
   * so the caller (MCP tool) can decide whether to invoke again.
   *
   * Designed to be called repeatedly until remaining = 0:
   *   backfill_embeddings({ limit: 64 })
   *   backfill_embeddings({ limit: 64 })
   *   ...
   */
  async backfillEmbeddings(input: { limit?: number }): Promise<{ scanned: number; embedded: number; failed: number; remaining: number; rateLimited: boolean; resetAt: string | null }> {
    const limit = Math.min(input.limit ?? 64, 256);
    if (!this.embedder) {
      return { scanned: 0, embedded: 0, failed: 0, remaining: -1, rateLimited: false, resetAt: null };
    }

    const { data: rows, error: fetchErr } = await this.sb
      .from('memories')
      .select('id, content, category, tags, project_name')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (fetchErr) throw fetchErr;
    const list = (rows ?? []) as Array<Pick<MemoryRow, 'id' | 'content' | 'category' | 'tags' | 'project_name'>>;
    if (list.length === 0) {
      return { scanned: 0, embedded: 0, failed: 0, remaining: 0, rateLimited: false, resetAt: null };
    }

    let embedded = 0;
    let failed = 0;
    let rateLimited = false;
    let resetAt: string | null = null;

    // Process in batches of 32 (HF max). safeEmbed handles the quota check
    // and the HF call; on rate limit we stop early and report the reset.
    for (let i = 0; i < list.length; i += 32) {
      const batch = list.slice(i, i + 32);
      const texts = batch.map(m => memoryToText(m));
      let vecs: number[][] | null = null;
      try {
        vecs = await this.safeEmbed(texts);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('rate limit')) {
          rateLimited = true;
          const m = msg.match(/Resets at (.*?)\./);
          resetAt = m?.[1] ?? null;
          break;
        }
        throw e;
      }
      if (!vecs) break;
      for (let j = 0; j < batch.length; j++) {
        const vec = vecs[j];
        if (!vec || vec.length !== 384) { failed++; continue; }
        const { error: upErr } = await this.sb
          .from('memories')
          .update({ embedding: this.toPgVector(vec) })
          .eq('id', batch[j].id);
        if (upErr) { failed++; continue; }
        embedded++;
      }
    }

    const user = (await this.sb.auth.getUser()).data.user;
    let remaining = -1;
    if (user) {
      const { data: cnt } = await this.sb.rpc('count_memories_without_embedding', { p_user_id: user.id });
      remaining = (cnt as number | null) ?? 0;
    }
    return { scanned: list.length, embedded, failed, remaining, rateLimited, resetAt };
  }

  private rowToMemory = (r: MemoryRow): Memory => ({
    id: r.id,
    user_id: r.user_id,
    project_name: r.project_name,
    content: r.content,
    category: r.category,
    importance: r.importance,
    tags: r.tags ?? [],
    concepts: r.concepts ?? [],
    source: r.source,
    strength: r.strength ?? 1.0,
    access_count: r.access_count ?? 0,
    last_accessed_at: r.last_accessed_at ?? r.created_at,
    is_latest: r.is_latest ?? true,
    forget_after: r.forget_after ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  });
}

import { extractConcepts } from '../../src/utils/memoryDecay.js';
