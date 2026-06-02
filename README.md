# AgentMemory.fyi

> Visual memory manager for AI agents. One source of truth for Claude Code, Cursor, Cline, Continue.

## 100% free, forever

AgentMemory is open source under MIT. No paywalls, no premium tiers, no limits.

- **Free for everyone** — unlimited memories, unlimited projects
- **Self-hostable** — run locally forever, no telemetry, no lock-in
- **MCP-native** — works as a Model Context Protocol server in Claude Desktop, Cursor, Cline, etc.
- **Visual** — graph view of all memories and their semantic relations
- **Portable** — import/export to `.cursorrules`, `CLAUDE.md`, MemGPT JSON, Claude Code `.jsonl` sessions
- **Optional cloud sync** — sign in to sync your memories across devices via Supabase

## Support the project

AgentMemory is built and maintained in spare time. If it saves you time, consider supporting development:

- **[Donate on DonationAlerts](https://dalink.to/agentmemory)** — cards, SBP, YooMoney, crypto, 100+ methods
- Star the repo — the best $0 donation
- [Report bugs or request features](https://github.com/Obidel/Agentmemory/issues)
- [Contribute PRs](https://github.com/Obidel/Agentmemory/fork)
- Spread the word on Twitter / Reddit / HackerNews

## Quick start

### Web UI (local-only mode)

```bash
npm install
npm run dev
# → http://localhost:5173
```

Works without any backend. Memories are stored in `localStorage` (browser) or `~/.agentmemory/` (stdio MCP).

### MCP server (stdio, local)

```bash
npm run mcp
```

Configures in `claude_desktop_config.json` (the script runs `mcp/index.ts` via `tsx` — no build step):

```json
{
  "mcpServers": {
    "agentmemory": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/agentmemory/mcp/index.ts"],
      "env": { "AGENTMEMORY_HOME": "/absolute/path/to/storage" }
    }
  }
}
```

8 tools: `add_memory`, `search_memories`, `list_memories`, `find_similar`, `delete_memory`, `list_projects`, `switch_project`, `get_project_context`, `import_jsonl`. 3 resources: `agentmemory://rules`, `agentmemory://graph`, `agentmemory://projects`. 100% free, no license keys.

## Features

### Memory decay & access tracking

Memories follow an exponential decay curve (`strength = 0.5^(days/30) × importance/5`) and get a boost every time they're read. Each memory falls into one of four tiers, displayed as a colored badge on the card:

| Tier   | Strength  | Color  | Meaning                                 |
| ------ | --------- | ------ | --------------------------------------- |
| hot    | ≥ 0.70    | red    | Recently created or frequently accessed |
| warm   | ≥ 0.40    | amber  | Still relevant                          |
| cold   | ≥ 0.15    | blue   | Fading, but kept for context            |
| dead   | < 0.15    | grey   | Auto-candidate for forgetting           |

- `runAutoForget()` runs on app boot and removes memories matching any of: TTL expired, OR `(strength < 0.05 AND access_count < 3)`, OR `(importance ≤ 2 AND age > 180 days)`.
- `MemoryCard` calls `touchMemory(id)` on mount, bumping `access_count` and refreshing `last_accessed_at`.
- Survives across all backends: local (zustand), Supabase (Postgres `strength` column + `runAutoForget` from `useAuth`).

### Hybrid search (BM25 + RRF)

Two free, on-device sources fuse via Reciprocal Rank Fusion (`k=60`) in `src/utils/rrf.ts`:

- **BM25** (weight 0.4) — Porter-stemmed inverted index, k1=1.2, b=0.75. Source: `src/utils/bm25.ts`.
- **Vector cosine** (weight 0.6) — 20-dim feature-hash embeddings (LLM-free). Source: `src/utils/memoryDecay.ts::jaccard` neighborhood.
- **Graph** (weight 0.3) — 1-hop expansion via the `relations` table. Only active on the Supabase backend.

Top results from each source are joined with `RRF(d) = Σᵢ wᵢ / (k + rankᵢ(d))` and the top-N are returned. The BM25 index caches by `(count, max(updated_at))` and invalidates on every add/update/delete/auto-forget.

For the cloud backend, `search_memories` is a server-side `pg_trgm` similarity function (see `supabase/schema.sql`); the Supabase client in `mcp/backends/supabase.ts` calls it and fuses with graph expansion in app code.

### JSONL import from Claude Code sessions

Drop a Claude Code session file (`~/.claude/projects/-my-project/<uuid>.jsonl`) into the import page, or call the MCP `import_jsonl` tool. The parser:

1. Reads one JSON object per line
2. Drops `tool_use` / `tool_result` blocks (keeps only `user` / `assistant` messages)
3. Filters user messages: 20–600 chars, drops system-reminders and shell commands (`ok`, `./run-build.sh`, etc.)
4. Auto-categorises with regex hints: `decision` > `constraint` > `preference` > `architecture` > `context` (default)
5. Extracts tags from `#hashtags` and file-extension hints (`*.ts` → `typescript`)
6. Caps at 200 memories per file

MCP usage (works in both stdio and HTTP modes):

```json
{
  "name": "import_jsonl",
  "arguments": {
    "path": "/Users/you/.claude/projects/-my-project/abc123.jsonl"
  }
}
```

Returns `{ imported: N, total: M, user_messages: K, accepted: K }`.

## Cloud sync (Supabase + Vercel)

Run your own private sync backend in ~5 minutes.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Once provisioned, open **SQL Editor** → paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) → **Run**
3. In **Authentication → Providers**, enable **Email** (magic link) and **GitHub** (optional)
4. In **Settings → API**, copy your `Project URL` and `anon` key

### 2. Configure environment

Copy `public/.env.example` to `.env` (or set variables on Vercel):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
# Service role key NOT used — RLS scopes everything to auth.uid()
```

### 3. Deploy to Vercel

```bash
npm i -g vercel
vercel
# accept defaults; add the SUPABASE_* env vars when prompted
```

The web app is a static single-file build (`dist/index.html`) at the root.
The MCP server is exposed as a serverless function at `/mcp` and `/api/mcp`.

### 4. Use the remote MCP

Clients (Claude Desktop, Cursor, custom) can connect to your hosted MCP server over HTTP. Send the user's Supabase JWT in the `Authorization: Bearer <jwt>` header:

```json
{
  "mcpServers": {
    "agentmemory-cloud": {
      "url": "https://your-app.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer <supabase-access-token>"
      }
    }
  }
}
```

The function validates the JWT via Supabase, then queries Postgres with RLS so each user only sees their own data. **No service-role key is ever needed for user requests** — RLS does the work.

## Architecture

```
src/
  store/memoryStore.ts        # Zustand store + pure logic helpers (hybridSearch, decay)
  utils/
    bm25.ts                   # BM25 inverted index
    rrf.ts                    # Reciprocal Rank Fusion
    stemmer.ts                # Compact Porter stemmer
    memoryDecay.ts            # calculateStrength, tierOf, touchMemory, runAutoForget
    jsonlImport.ts            # Claude Code session parser
  lib/supabase.ts             # Supabase browser client
  lib/cloudSync.ts            # Pull/push helpers used by memoryStore
  hooks/useAuth.ts            # Wires Supabase auth state to the store
  components/
    MemoryCard.tsx            # Tier badge + touch-on-mount
    Layout.tsx                # Sidebar with sign-in / cloud status
  pages/
    AuthPage.tsx              # Magic-link + GitHub OAuth sign-in
    ImportPage.tsx            # .jsonl + .md/.txt/.cursorrules dropzone
    SupportPage.tsx           # Donate CTA

mcp/
  server.ts                   # Transport-agnostic MCP server (9 tools + 3 resources)
  backends/
    local.ts                  # Reads/writes the zustand store on disk
    supabase.ts               # RRF search + relations, RLS-scoped via caller's JWT
  index.ts                    # Stdio entrypoint (uses LocalBackend)

api/
  mcp.ts                      # Vercel serverless handler (Streamable HTTP)

supabase/
  schema.sql                  # Tables, RLS policies, search_memories / find_similar_memories RPCs
```

Local mode and cloud mode share the same `Memory` type and the same `memoryStore` actions. The only difference is whether mutations are mirrored to Supabase.

## Development

```bash
npm run dev                 # Vite dev server
npm run build               # Production web build
npm run mcp                 # Run stdio MCP server (tsx, no build step)
npm run typecheck:mcp       # tsc --noEmit on the MCP workspace
npx tsc --noEmit            # tsc --noEmit on the web workspace
```

## License

MIT — see [LICENSE](./LICENSE).
