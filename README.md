# AgentMemory.fyi

> Visual memory manager for AI agents. One source of truth for Claude Code, Cursor, Cline, Continue.

## What is this?

AgentMemory is an open-core tool for managing long-term memory of AI coding agents.

- **Open source (MIT)** — local MCP server, web UI, all core logic
- **Self-hostable** — run locally forever, no telemetry, no lock-in
- **MCP-native** — works as a Model Context Protocol server in Claude Desktop, Cursor, Cline, etc.
- **Visual** — graph view of all memories and their semantic relations
- **Portable** — import/export to `.cursorrules`, `CLAUDE.md`, MemGPT JSON

## Open-core model

| Tier | What's included | Price |
|------|----------------|-------|
| **Open source (MIT)** | MCP server, web UI, local storage, all export formats, graph view | Free forever |
| **Solo** | Cloud sync across devices, real embeddings, premium integrations | $10/mo via [Polar](https://polar.sh/) |
| **Team** | Shared projects, roles, audit log, API access, priority support | $25/mo per workspace |

The local MCP server is fully functional without any subscription. Cloud features are managed separately via [polar.sh/agentmemory](https://polar.sh/agentmemory).

## Quick start

### Web UI

```bash
npm install
npm run dev
# → http://localhost:5173
```

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
      "args": ["/path/to/agentmemory/dist-mcp/mcp/index.js"],
      "env": { "AGENTMEMORY_HOME": "/path/to/storage" }
    }
  }
}
```

### MCP server (HTTP/SSE, cloud)

For managed cloud sync with cross-device memory, see [docs/hosted-mcp.md](./docs/hosted-mcp.md).

## Architecture

```
src/
  store/memoryStore.ts   # Zustand store + pure logic helpers
  types/                 # TypeScript types
  components/            # React UI components (glass design)
  pages/                 # Route components
  utils/                 # Constants, helpers

mcp/
  index.ts               # MCP server (8 tools, 3 resources)
```

The same `memoryStore` is consumed by both the web UI and the MCP server, so a memory added in Claude Desktop is visible in the web graph and vice versa.

## License

MIT — see [LICENSE](./LICENSE). Commercial cloud features sold via [Polar.sh](https://polar.sh/agentmemory).
