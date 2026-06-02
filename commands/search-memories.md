---
description: Search memories using hybrid BM25 + vector + graph search
argument-hint: "<query> [project] [category] [limit]"
---

Search the user's project memory via AgentMemory MCP.

Arguments:
- $1 (required): search query
- $2 (optional): project name
- $3 (optional): filter by category
- $4 (optional): max results (default 5)

Call:
```
mcp__agentmemory__search_memories({
  query: "$1",
  project_name: "$2" || undefined,
  category: "$3" || undefined,
  limit: parseInt("$4") || 5
})
```

Present the top results with their similarity scores, category badges, and `created_at` timestamps.
