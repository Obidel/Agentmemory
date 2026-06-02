# AgentMemory.fyi

> Visual memory manager for AI agents. One source of truth for Claude Code, Cursor, Cline, Continue.

## 100% free, forever

AgentMemory is open source under MIT. No paywalls, no premium tiers, no limits.

- **Free for everyone** — unlimited memories, unlimited projects
- **Self-hostable** — run locally forever, no telemetry, no lock-in
- **MCP-native** — works as a Model Context Protocol server in Claude Desktop, Cursor, Cline, etc.
- **Visual** — graph view of all memories and their semantic relations
- **Portable** — import/export to `.cursorrules`, `CLAUDE.md`, MemGPT JSON
- **Optional cloud sync** — sign in to sync your memories across devices via Supabase

## Support the project

AgentMemory is built and maintained in spare time. If it saves you time, consider supporting development:

- **[Donate on DonationAlerts](https://dalink.to/agentmemory)** — cards, SBP, YooMoney, crypto, 100+ methods
- ⭐ [Star the repo](https://github.com/Obidel/Agentmemory) — the best $0 donation
- 🐛 [Report bugs or request features](https://github.com/Obidel/Agentmemory/issues)
- 🔀 [Contribute PRs](https://github.com/Obidel/Agentmemory/fork)
- 🐦 Spread the word on Twitter / Reddit / HackerNews

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
npm run build:mcp
node dist-mcp/mcp/index.js
```

Configure in `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "agentmemory": {
      "command": "node",
      "args": ["/absolute/path/to/agentmemory/dist-mcp/mcp/index.js"],
      "env": { "AGENTMEMORY_HOME": "/absolute/path/to/storage" }
    }
  }
}
```

7 tools: `add_memory`, `search_memories`, `list_memories`, `find_similar`, `delete_memory`, `list_projects`, `switch_project`, `get_project_context`. 100% free, no license keys.

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
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # server-side only, never expose
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
  store/memoryStore.ts   # Zustand store + pure logic helpers
  lib/supabase.ts        # Supabase browser client
  lib/cloudSync.ts       # Pull/push helpers used by memoryStore
  hooks/useAuth.ts       # Wires Supabase auth state to the store
  components/Layout.tsx  # Sidebar with sign-in / cloud status
  pages/AuthPage.tsx     # Magic-link + GitHub OAuth sign-in
  pages/SupportPage.tsx  # Donate CTA

mcp/
  server.ts              # Transport-agnostic MCP server (tools + resources)
  backends/
    local.ts             # Reads/writes the zustand store on disk
    supabase.ts          # Queries Postgres via RLS using the user's JWT
  index.ts               # Stdio entrypoint (uses LocalBackend)

api/
  mcp.ts                 # Vercel serverless handler (Streamable HTTP)

supabase/
  schema.sql             # Tables, RLS policies, search helpers
```

Local mode and cloud mode share the same `Memory` type and the same `memoryStore` actions. The only difference is whether mutations are mirrored to Supabase.

## License

MIT — see [LICENSE](./LICENSE).
