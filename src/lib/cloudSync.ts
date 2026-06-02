import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import type { Memory, MemoryRelation } from '../types';
import { supabase } from './supabase';

interface ProjectRow { id: string; name: string }
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
interface RelationRow {
  id: string;
  user_id: string;
  from_memory: string;
  to_memory: string;
  type: MemoryRelation['relation_type'];
  weight: number;
  created_at: string;
}

function sb(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

async function ensureProject(name: string): Promise<string> {
  // Try the RPC first; fall back to a manual upsert if the function isn't installed.
  const r = await sb().rpc('ensure_project', { p_name: name });
  if (!r.error && r.data) return r.data as string;

  const user = (await sb().auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const found = await sb().from('projects').select('id').eq('user_id', user.id).eq('name', name).maybeSingle();
  if (found.data) return found.data.id as string;
  const ins = await sb().from('projects').insert({ user_id: user.id, name }).select('id').single();
  if (ins.error) throw ins.error;
  return ins.data!.id as string;
}

export async function pullAllFromCloud(): Promise<{
  memories: Memory[];
  relations: MemoryRelation[];
  projects: string[];
}> {
  const [memRes, relRes, projRes] = await Promise.all([
    sb().from('memories').select('*').order('created_at', { ascending: false }),
    sb().from('relations').select('*'),
    sb().from('projects').select('id,name').order('created_at', { ascending: true }),
  ]);

  if (memRes.error) throw memRes.error;
  if (relRes.error) throw relRes.error;
  if (projRes.error) throw projRes.error;

  const memories: Memory[] = (memRes.data as MemoryRow[]).map(r => ({
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
  }));

  const relations: MemoryRelation[] = (relRes.data as RelationRow[]).map(r => ({
    id: r.id,
    from_memory_id: r.from_memory,
    to_memory_id: r.to_memory,
    relation_type: r.type,
    strength: r.weight,
  }));

  const projects = (projRes.data as ProjectRow[]).map(p => p.name);

  return { memories, relations, projects };
}

export async function pushToCloud(m: Memory): Promise<void> {
  const projectId = await ensureProject(m.project_name);
  const row: Partial<MemoryRow> = {
    id: m.id,
    project_id: projectId,
    project_name: m.project_name,
    content: m.content,
    category: m.category,
    importance: m.importance,
    tags: m.tags ?? [],
    concepts: m.concepts ?? [],
    source: m.source,
    strength: m.strength ?? 1.0,
    access_count: m.access_count ?? 0,
    last_accessed_at: m.last_accessed_at ?? m.created_at,
    is_latest: m.is_latest ?? true,
    forget_after: m.forget_after ?? null,
  };
  const { error } = await sb().from('memories').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteFromCloud(id: string): Promise<void> {
  const { error } = await sb().from('memories').delete().eq('id', id);
  if (error) throw error;
}

export async function getCloudUser(): Promise<SupabaseUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signOutCloud(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
