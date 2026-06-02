import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Memory, MemoryCategory } from '../../src/types/index.js';
import type { MemoryBackend } from '../server.js';

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

  constructor(supabaseUrl: string, supabaseAnonKey: string, jwt: string) {
    this.sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
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
    const row: Partial<MemoryRow> = {
      id,
      project_id: projectId,
      project_name: projectName,
      content: input.content,
      category: input.category,
      importance: input.importance ?? 3,
      tags: input.tags ?? [],
      concepts: extractConcepts(input.content, input.tags ?? []),
      source: 'agent',
      strength: 1.0,
      access_count: 0,
      last_accessed_at: now,
      is_latest: true,
    };
    const { data, error } = await this.sb.from('memories').insert(row).select('*').single();
    if (error) throw error;
    const m = data as MemoryRow;
    return this.rowToMemory(m);
  }

  async searchMemories(input: { query: string; project?: string; category?: MemoryCategory; limit?: number }): Promise<Memory[]> {
    let q = this.sb.from('memories').select('*').order('created_at', { ascending: false });
    if (input.project)   q = q.eq('project_name', input.project);
    if (input.category)  q = q.eq('category', input.category);
    q = q.ilike('content', `%${input.query}%`);
    if (input.limit) q = q.limit(input.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data as MemoryRow[]).map(this.rowToMemory);
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
