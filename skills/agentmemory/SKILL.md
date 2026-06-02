---
name: agentmemory
description: Persistent project memory via AgentMemory MCP. Use when the user asks you to remember something, recall a project convention, search past context, or forget a memory. Always search before answering project-specific questions.
---

# AgentMemory

You have access to persistent project memory through the AgentMemory MCP server. Use it instead of re-reading the same files or re-asking the user.

## Available tools

- `add_memory(content, category?, source?, importance?, tags?)` — store a new memory
- `search_memories(query, project_name?, category?, limit?)` — hybrid search (BM25 + vector + graph)
- `list_memories(project_name?, category?, limit?)` — list all memories in a project
- `find_similar(memory_id, limit?)` — find semantically related memories
- `delete_memory(memory_id)` — remove a memory
- `list_projects()` — list all project contexts
- `switch_project(project_name)` — change active project
- `get_project_context(project_name)` — get full context for a project
- `import_jsonl(path)` — import memories from a Claude Code or Cursor session log
- `backfill_embeddings(batch_size?, max_rounds?)` — generate embeddings for unembedded memories

## Workflow

1. **Before answering project questions**: call `search_memories` with a relevant query
2. **When you learn something non-obvious**: call `add_memory` with appropriate category and importance
3. **When the user says "remember this"**: call `add_memory` immediately
4. **When context is stale or wrong**: call `delete_memory` to remove it

## Memory categories

- `constraint` — hard rules, never violate (importance 4-5)
- `preference` — strong defaults, deviate only with reason (importance 3)
- `architecture` — structural decisions (importance 3-4)
- `context` — background info, project purpose (importance 2-3)
- `decision` — choices with tradeoffs (importance 3-4)

## Example

```
User: "Why did we choose TanStack Query over SWR?"

→ call search_memories({ query: "TanStack Query SWR", category: "decision" })
→ find the memory, quote it, cite the date
```
