# Changelog

All notable changes to AgentMemory will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-02

### Added
- MCP server with 10 tools (`add_memory`, `search_memories`, `list_memories`, `find_similar`, `delete_memory`, `list_projects`, `switch_project`, `get_project_context`, `import_jsonl`, `backfill_embeddings`) and 3 resources (`agentmemory://rules`, `agentmemory://graph`, `agentmemory://projects`)
- Hybrid search: BM25 (Postgres FTS) + pgvector (HF MiniLM embeddings) + graph relations fused with Reciprocal Rank Fusion
- Self-hosted Supabase backend with row-level security, no service-role key required for user requests
- Vercel serverless deployment with 60s timeout for `/mcp` and `/api/mcp`
- Streamable HTTP transport (in addition to stdio) for remote MCP clients
- 20 tool integrations: Claude Desktop, Cursor, Cline, Continue, Zed, Windsurf, OpenCode, Aider, Cody, Codex, Goose, Bolt, OpenHands, Void, PearAI, and more
- Memory decay (30-day half-life) with hot/warm/cold/dead tier classification and auto-forget
- Light and dark themes with FOUC prevention via inline script
- JSONL import from Claude Code, Cursor, and other agents
- Backfill UI for generating embeddings for existing memories
- Rate-limited HuggingFace Inference API integration (free tier, 384-dim MiniLM-L6-v2)
- GitHub OAuth and email magic-link authentication via Supabase Auth
- Visual memory graph with D3 force-directed layout
- 5 built-in memory templates and full-text + semantic + graph search
- Public hosted demo at https://agentmemory-dusky.vercel.app
- Comprehensive README with quickstart, 20-tool setup guides, cloud sync guide, and architecture overview

### Security
- RLS policies on `memories`, `relations`, and `api_rate_limits` tables, scoped by `auth.uid()`
- No service-role key on server: all requests use anon key + user JWT, validated by Supabase
- Atomic rate-limit counter via `SELECT ... FOR UPDATE` on `api_rate_limits`
- All secrets are env-driven; `.env.example` documents every required variable
