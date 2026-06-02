-- AgentMemory — Supabase schema
-- Run this in Supabase SQL editor: https://app.supabase.com/project/_/sql
-- Idempotent: safe to re-run.

-- ─── Extensions ──────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
-- pgvector is included in every Supabase project; if the line below errors
-- with "extension vector is not allow-listed", enable it under
-- Database → Extensions → "vector" first, then re-run this script.
create extension if not exists "vector";

-- ─── profiles (1:1 with auth.users) ─────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  plan            text not null default 'free' check (plan in ('free','sponsor')),
  active_project  text not null default 'default',
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── projects ────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists projects_user_idx on public.projects(user_id);

alter table public.projects enable row level security;

drop policy if exists "projects_all_own" on public.projects;
create policy "projects_all_own"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── memories ────────────────────────────────────────────────────────
create table if not exists public.memories (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  project_name text not null,
  content      text not null,
  category     text not null check (category in ('architecture','preference','constraint','context','decision')),
  importance   int  not null default 3 check (importance between 1 and 5),
  tags         text[] not null default '{}',
  source       text not null default 'manual' check (source in ('manual','claude','cursor','copilot','import','template','conversation','imported','agent')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists memories_user_idx     on public.memories(user_id);
create index if not exists memories_project_idx  on public.memories(project_id);
create index if not exists memories_category_idx on public.memories(category);
create index if not exists memories_content_trgm on public.memories using gin (content gin_trgm_ops);
create index if not exists memories_tags_gin     on public.memories using gin (tags);

-- ─── pgvector embeddings (384-dim, all-MiniLM-L6-v2 via HF Inference) ───
-- The serverless MCP generates these and the web client sends them along on
-- add. Memories without an embedding are filtered out of semantic search.
alter table public.memories
  add column if not exists embedding vector(384);

create index if not exists memories_embedding_hnsw
  on public.memories using hnsw (embedding vector_cosine_ops);

-- ─── Decay / access tracking (borrowed from rohitg00/agentmemory) ─────
alter table public.memories
  add column if not exists concepts         text[] not null default '{}',
  add column if not exists strength         real   not null default 1.0,
  add column if not exists access_count     int    not null default 0,
  add column if not exists last_accessed_at timestamptz not null default now(),
  add column if not exists is_latest        boolean not null default true,
  add column if not exists forget_after     timestamptz;

create index if not exists memories_is_latest_idx on public.memories(user_id, is_latest);
create index if not exists memories_strength_idx  on public.memories(user_id, strength);

alter table public.memories enable row level security;

drop policy if exists "memories_all_own" on public.memories;
create policy "memories_all_own"
  on public.memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memories_touch on public.memories;
create trigger memories_touch
  before update on public.memories
  for each row execute function public.touch_updated_at();

-- ─── relations ───────────────────────────────────────────────────────
create table if not exists public.relations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  from_memory  text not null references public.memories(id) on delete cascade,
  to_memory    text not null references public.memories(id) on delete cascade,
  type         text not null default 'related' check (type in ('related','contradicts','extends','supersedes')),
  weight       real not null default 0.5,
  created_at   timestamptz not null default now()
);

create index if not exists relations_user_idx      on public.relations(user_id);
create index if not exists relations_from_idx      on public.relations(from_memory);
create index if not exists relations_to_idx        on public.relations(to_memory);

alter table public.relations enable row level security;

drop policy if exists "relations_all_own" on public.relations;
create policy "relations_all_own"
  on public.relations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Helper: BM25-style trigram-similarity search (server-side BM25) ───
-- Returns documents ranked by pg_trgm similarity. Good lexical match for
-- short queries; the client fuses it with vector + graph via RRF.
create or replace function public.search_memories(
  p_query      text,
  p_limit      int default 20,
  p_project    text default null,
  p_category   text default null
)
returns table (
  id           text,
  project_name text,
  content      text,
  category     text,
  importance   int,
  tags         text[],
  source       text,
  created_at   timestamptz,
  score        real
)
language sql
stable
as $$
  select
    m.id, m.project_name, m.content, m.category, m.importance, m.tags, m.source, m.created_at,
    similarity(m.content, p_query) as score
  from public.memories m
  where m.user_id = auth.uid()
    and (p_query = '' or m.content % p_query or m.content ilike '%' || p_query || '%')
    and (p_project  is null or m.project_name = p_project)
    and (p_category is null or m.category    = p_category)
  order by score desc, m.created_at desc
  limit p_limit;
$$;

-- Vector-search via pgvector (cosine distance). Takes a pre-computed 384-dim
-- query embedding; the serverless MCP calls HuggingFace Inference API to
-- generate it. Falls back gracefully (returns no rows) when memories have
-- no embedding yet.
create or replace function public.semantic_search_memories(
  p_query_embedding vector(384),
  p_project         text    default null,
  p_category        text    default null,
  p_limit           int     default 20
)
returns table (
  id           text,
  project_name text,
  content      text,
  category     text,
  importance   int,
  tags         text[],
  source       text,
  created_at   timestamptz,
  score        real
)
language sql
stable
as $$
  select
    m.id, m.project_name, m.content, m.category, m.importance, m.tags, m.source, m.created_at,
    1 - (m.embedding <=> p_query_embedding) as score
  from public.memories m
  where m.user_id = auth.uid()
    and m.embedding is not null
    and (p_project  is null or m.project_name = p_project)
    and (p_category is null or m.category    = p_category)
  order by m.embedding <=> p_query_embedding
  limit p_limit;
$$;

-- ─── Helper: find similar by trigram ─────────────────────────────────
create or replace function public.find_similar_memories(
  p_query text,
  p_limit int default 5
)
returns table (
  id           text,
  project_name text,
  content      text,
  category     text,
  score        real
)
language sql
stable
as $$
  select
    m.id, m.project_name, m.content, m.category,
    similarity(m.content, p_query) as score
  from public.memories m
  where m.user_id = auth.uid()
  order by m.content <-> p_query
  limit p_limit;
$$;

-- ─── Rate limit for embedding API (protects HF free tier) ────────────
-- One row per user. Resets every hour. The consume_rate_limit RPC is
-- atomic (FOR UPDATE) so concurrent MCP calls can't both succeed past
-- the cap. Used by SupabaseBackend before every embed() call.
create table if not exists public.api_rate_limits (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  hourly_count     int     not null default 0,
  hourly_reset_at  timestamptz not null default (now() + interval '1 hour')
);

alter table public.api_rate_limits enable row level security;

-- Users can read their own row (to show "X/100 used" in UI later) but
-- can never write directly. Only the consume_rate_limit RPC mutates it.
create policy "read own rate limit"
  on public.api_rate_limits for select
  using (auth.uid() = user_id);

create or replace function public.consume_rate_limit(
  p_user_id uuid,
  p_cost    int,
  p_max     int
)
returns table (allowed boolean, used int, reset_at timestamptz)
language plpgsql
as $$
declare
  v_count  int;
  v_reset  timestamptz;
  v_now    timestamptz := now();
begin
  insert into public.api_rate_limits (user_id, hourly_count, hourly_reset_at)
    values (p_user_id, 0, v_now + interval '1 hour')
    on conflict (user_id) do nothing;

  select hourly_count, hourly_reset_at
    into v_count, v_reset
    from public.api_rate_limits
    where user_id = p_user_id
    for update;

  if v_reset <= v_now then
    v_count  := 0;
    v_reset  := v_now + interval '1 hour';
  end if;

  if v_count + p_cost > p_max then
    return query select false, v_count, v_reset;
    return;
  end if;

  v_count := v_count + p_cost;
  update public.api_rate_limits
    set hourly_count    = v_count,
        hourly_reset_at = v_reset
    where user_id = p_user_id;

  return query select true, v_count, v_reset;
end;
$$;

create or replace function public.count_memories_without_embedding(
  p_user_id uuid
)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.memories
  where user_id = p_user_id
    and embedding is null;
$$;
