-- AgentMemory.fyi — Supabase Database Migration
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================
-- MEMORIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL DEFAULT 'default',
  content text NOT NULL,
  category text CHECK (category IN ('architecture', 'preference', 'constraint', 'context', 'decision')),
  source text CHECK (source IN ('claude', 'cursor', 'copilot', 'manual', 'import', 'template')),
  tags text[] DEFAULT '{}',
  embedding vector(1536),          -- OpenAI text-embedding-3-small
  importance integer DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================
-- MEMORY RELATIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS memory_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_memory_id uuid REFERENCES memories(id) ON DELETE CASCADE,
  to_memory_id uuid REFERENCES memories(id) ON DELETE CASCADE,
  relation_type text CHECK (relation_type IN ('related', 'contradicts', 'extends')),
  strength float DEFAULT 0.5 CHECK (strength BETWEEN 0 AND 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_memory_id, to_memory_id)
);

-- =====================
-- INDEXES
-- =====================

-- Vector similarity index (IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Standard indexes
CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);
CREATE INDEX IF NOT EXISTS memories_project_name_idx ON memories(project_name);
CREATE INDEX IF NOT EXISTS memories_category_idx ON memories(category);
CREATE INDEX IF NOT EXISTS memories_created_at_idx ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS memories_tags_idx ON memories USING gin(tags);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_relations ENABLE ROW LEVEL SECURITY;

-- Memories: users can only access their own
CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- Memory relations: inherit from memories
CREATE POLICY "Users can view own memory relations"
  ON memory_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = from_memory_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own memory relations"
  ON memory_relations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = from_memory_id AND m.user_id = auth.uid()
    )
  );

-- =====================
-- FUNCTIONS
-- =====================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Semantic similarity search function
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  query_user_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_project text DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  category text,
  source text,
  tags text[],
  project_name text,
  importance integer,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.category,
    m.source,
    m.tags,
    m.project_name,
    m.importance,
    m.created_at,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM memories m
  WHERE
    m.user_id = query_user_id
    AND m.embedding IS NOT NULL
    AND (filter_project IS NULL OR m.project_name = filter_project)
    AND (filter_category IS NULL OR m.category = filter_category)
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Find related memories by specific memory ID
CREATE OR REPLACE FUNCTION find_related_memories(
  target_memory_id uuid,
  query_user_id uuid,
  similarity_threshold float DEFAULT 0.7,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_embedding vector(1536);
BEGIN
  SELECT embedding INTO target_embedding
  FROM memories
  WHERE id = target_memory_id AND user_id = query_user_id;

  IF target_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.category,
    1 - (m.embedding <=> target_embedding) as similarity
  FROM memories m
  WHERE
    m.user_id = query_user_id
    AND m.id != target_memory_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> target_embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT limit_count;
END;
$$;
