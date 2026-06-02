# Contributing to AgentMemory

Thanks for your interest in contributing! AgentMemory is MIT-licensed and built in the open.

## Quick start

```bash
git clone https://github.com/Obidel/Agentmemory.git
cd Agentmemory
npm install
npm run dev          # web app at http://localhost:5173
npm run mcp          # MCP server (stdio) for local AI tools
```

## Project layout

```
api/                 Vercel serverless entry (HTTP MCP transport)
mcp/                 MCP server: stdio entry, embedder chain, backends
  backends/          local (zustand) + supabase (Postgres + pgvector)
  embeddings.ts      HuggingFace + local-hash embedder factories
src/                 React web app
  components/        UI (Layout, cards, modals, sidebar)
  pages/             route components (Dashboard, Search, Graph, etc.)
  store/             zustand store with persist + hybrid search
  lib/               Supabase client, cloud sync, MCP JSON-RPC client
  utils/             BM25, RRF, decay, JSONL parser, cn helper
  hooks/             useAuth, useTheme
supabase/            schema.sql (canonical migration)
public/              static assets
```

## Development workflow

1. Fork the repo
2. Create a branch: `git checkout -b feat/short-name`
3. Make your change. Run `npm run build` and `npm run typecheck:mcp` before pushing
4. Open a PR with a clear description and screenshots for UI changes

## Code style

- TypeScript strict mode is on
- No comments unless the code is genuinely non-obvious
- Tailwind utility classes only — no separate CSS files for components
- New MCP tools go in `mcp/server.ts` and need a matching description in the README tools table

## Adding a new MCP tool

1. Add the case to the `ListToolsRequestSchema` handler in `mcp/server.ts`
2. Implement the handler with the `MemoryBackend` interface
3. Update the README's "MCP tools" section
4. Add at least one integration test or example usage in your PR description

## Adding a new memory backend (e.g. Notion, Airtable)

1. Implement the `MemoryBackend` interface from `mcp/server.ts`
2. Add a factory function in `mcp/backends/`
3. Wire it into `mcp/index.ts` based on env vars

## Reporting bugs

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser / OS / Node version
- Console errors (DevTools → Console)

## License

By contributing, you agree your contributions will be licensed under the MIT License.
