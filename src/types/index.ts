export type MemoryCategory = 'architecture' | 'preference' | 'constraint' | 'context' | 'decision';
export type MemorySource = 'claude' | 'cursor' | 'copilot' | 'manual' | 'import' | 'template' | 'conversation' | 'imported' | 'agent';
export type RelationType = 'related' | 'contradicts' | 'extends';
export type PlanType = 'free' | 'sponsor';

export interface Memory {
  id: string;
  user_id: string;
  project_name: string;
  content: string;
  category: MemoryCategory;
  source: MemorySource;
  tags: string[];
  concepts?: string[];          // normalized keywords for dedup / Jaccard
  embedding?: number[];
  importance?: number;          // 1-5
  strength?: number;            // 0-1, recalculated on read
  access_count?: number;        // how many times the memory was retrieved
  last_accessed_at?: string;    // for decay calculation
  is_latest?: boolean;          // false = superseded by a newer memory
  forget_after?: string;        // optional hard TTL
  created_at: string;
  updated_at: string;
}

export type MemoryTier = 'hot' | 'warm' | 'cold' | 'dead';

export interface MemoryRelation {
  id: string;
  from_memory_id: string;
  to_memory_id: string;
  relation_type: RelationType;
  strength: number;
}

export interface GraphNode {
  id: string;
  content: string;
  category: MemoryCategory;
  importance: number;
  tags: string[];
  project_name: string;
  source: MemorySource;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  relation_type: RelationType;
  strength: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rules_count: number;
  memories: Partial<Memory>[];
  tags: string[];
}

export interface ImportPreviewItem {
  content: string;
  category: MemoryCategory;
  source: MemorySource;
  tags: string[];
  selected: boolean;
}

export interface SearchResult extends Memory {
  similarity?: number;
}

export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: string;
  extension: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: PlanType;
  memory_count: number;
  project_count: number;
}
