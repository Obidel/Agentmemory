# AgentMemory.fyi

> Visual memory manager for AI agents. One source of truth for Claude Code, Cursor, Cline, Continue.

## 100% free, forever

AgentMemory is open source under MIT. No paywalls, no premium tiers, no limits.

- **Free for everyone** — unlimited memories, unlimited projects
- **Self-hostable** — run locally forever, no telemetry, no lock-in
- **MCP-native** — works as a Model Context Protocol server in Claude Desktop, Cursor, Cline, etc.
- **Visual** — graph view of all memories and their semantic relations
- **Portable** — import/export to `.cursorrules`, `CLAUDE.md`, MemGPT JSON

## Support the project

AgentMemory is built and maintained in spare time. If it saves you time, consider supporting development:

- **[Donate on DonationAlerts](https://www.donationalerts.com/r/obidel)** — cards, SBP, YooMoney, crypto, 100+ methods
- ⭐ [Star the repo](https://github.com/Obidel/Agentmemory) — the best $0 donation
- 🐛 [Report bugs or request features](https://github.com/Obidel/Agentmemory/issues)
- 🔀 [Contribute PRs](https://github.com/Obidel/Agentmemory/fork)
- 🐦 Spread the word on Twitter / Reddit / HackerNews

### Sponsors

A thank-you to everyone who supports development. Add your name to the README via a PR or [donation message](https://www.donationalerts.com/r/obidel).

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

The MCP server is fully featured and 100% free — no license keys, no paid tiers.

## Architecture

```
src/
  store/memoryStore.ts   # Zustand store + pure logic helpers
  types/                 # TypeScript types
  components/            # React UI components (glass design)
  pages/                 # Route components
  utils/                 # Constants, helpers

mcp/
  index.ts               # MCP server (7 tools, 3 resources)
```

The same `memoryStore` is consumed by both the web UI and the MCP server, so a memory added in Claude Desktop is visible in the web graph and vice versa.

## License

MIT — see [LICENSE](./LICENSE).
