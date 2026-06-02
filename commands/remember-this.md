---
description: Store a new memory in AgentMemory
---

The user wants to remember something. Call the AgentMemory MCP `add_memory` tool with the content they provided.

If the user didn't specify a category, infer it from context:
- Hard rules → `constraint`
- Style choices → `preference`
- Stack/library decisions → `architecture`
- Background info → `context`
- Tradeoffs → `decision`

If importance wasn't specified, default to 3.

Confirm after storing: "Saved to memory: <one-line summary>"
