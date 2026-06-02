---
description: Add a new memory to the current project
argument-hint: "<content> [category] [importance 1-5]"
---

Add a memory to the user's project via AgentMemory MCP.

Arguments:
- $1 (required): the memory content
- $2 (optional): category — `constraint`, `preference`, `architecture`, `context`, `decision` (default: `preference`)
- $3 (optional): importance 1-5 (default: 3)

Call:
```
mcp__agentmemory__add_memory({
  content: "$1",
  category: "$2" || "preference",
  importance: parseInt("$3") || 3
})
```

Confirm with the saved memory id.
