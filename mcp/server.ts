import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import type { Memory, MemoryCategory } from '../src/types/index.js';
import { jsonlToMemories, parsedToMemory } from '../src/utils/jsonlImport';

/**
 * Storage backend for the MCP server. Two implementations exist:
 *  - LocalBackend: reads/writes the on-disk zustand store (stdio mode, no auth)
 *  - SupabaseBackend: queries Postgres via RLS using the caller's JWT (HTTP mode)
 */
export interface MemoryBackend {
  addMemory(input: {
    content: string;
    category: MemoryCategory;
    project?: string;
    tags?: string[];
    importance?: number;
  }): Promise<Memory>;

  searchMemories(input: {
    query: string;
    project?: string;
    category?: MemoryCategory;
    limit?: number;
  }): Promise<Memory[]>;

  listMemories(input: {
    project?: string;
    category?: MemoryCategory;
  }): Promise<Memory[]>;

  findSimilar(input: {
    text?: string;
    memoryId?: string;
    topK?: number;
  }): Promise<Array<Memory & { score: number }>>;

  deleteMemory(id: string): Promise<void>;

  listProjects(): Promise<string[]>;
  getActiveProject(): Promise<string>;
  switchProject(name: string): Promise<void>;

  getProjectContextMarkdown(): Promise<{ project: string; markdown: string }>;
  getRules(): Promise<string>;
  getGraphJson(): Promise<string>;
  getProjectsJson(): Promise<string>;

  /** Absolute path of the working directory (used for relative path resolution). */
  cwd?(): string;
}

const VALID_CATEGORIES: MemoryCategory[] = [
  'architecture', 'preference', 'constraint', 'context', 'decision',
];

const AddMemoryInput = z.object({
  content: z.string().min(1),
  category: z.enum(['architecture', 'preference', 'constraint', 'context', 'decision']).default('context'),
  project: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().int().min(1).max(5).default(3),
});

const SearchInput = z.object({
  query: z.string().min(1),
  project: z.string().optional(),
  category: z.enum(['architecture', 'preference', 'constraint', 'context', 'decision']).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const ListInput = z.object({
  project: z.string().optional(),
  category: z.enum(['architecture', 'preference', 'constraint', 'context', 'decision']).optional(),
});

const SimilarInput = z.object({
  text: z.string().optional(),
  memory_id: z.string().optional(),
  top_k: z.number().int().min(1).max(20).default(5),
});

const DeleteInput = z.object({ id: z.string().min(1) });
const ProjectInput = z.object({ name: z.string().min(1) });

const ImportJsonlInput = z.object({
  path: z.string().describe('Absolute or MCP-cwd-relative path to a .jsonl file'),
  project: z.string().optional().describe('Override project name (defaults to filename)'),
});

function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

function errResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

export function formatMemory(m: Memory): string {
  const imp = '★'.repeat(m.importance ?? 0);
  return `[${m.category}] ${imp} ${m.content}\n  id=${m.id} • project=${m.project_name} • source=${m.source} • tags=[${m.tags.join(', ')}]`;
}

export function createServer(backend: MemoryBackend): Server {
  const server = new Server(
    { name: 'agentmemory', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'add_memory',
        description: 'Save a new memory rule/fact about the project. Use this whenever the user states a preference, decision, constraint, or piece of context that should persist across sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The rule or fact to remember' },
            category: { type: 'string', enum: VALID_CATEGORIES, description: 'architecture | preference | constraint | context | decision' },
            project: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            importance: { type: 'number', minimum: 1, maximum: 5 },
          },
          required: ['content'],
        },
      },
      {
        name: 'search_memories',
        description: 'Search through saved memories by keyword. Returns matching rules/facts.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            project: { type: 'string' },
            category: { type: 'string', enum: VALID_CATEGORIES },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_memories',
        description: 'List all memories, optionally filtered by project and/or category.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string' },
            category: { type: 'string', enum: VALID_CATEGORIES },
          },
        },
      },
      {
        name: 'find_similar',
        description: 'Find memories semantically similar to a given text or to an existing memory. Useful for deduplication before adding new rules.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            memory_id: { type: 'string' },
            top_k: { type: 'number' },
          },
        },
      },
      {
        name: 'delete_memory',
        description: 'Delete a memory by ID.',
        inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      {
        name: 'list_projects',
        description: 'List all project names that have memories.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'switch_project',
        description: 'Switch the active project context (affects which project new memories are saved to).',
        inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      },
      {
        name: 'get_project_context',
        description: 'Get all rules for the current active project, formatted as a markdown document. Use this at the start of a task to load project context.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'import_jsonl',
        description: 'Import a Claude Code / OpenCode / Codex JSONL session log. Parses user messages, applies heuristic category detection, and creates memories. Use this to backfill memory from past sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to a .jsonl file (absolute or relative to MCP cwd)' },
            project: { type: 'string', description: 'Override project name' },
          },
          required: ['path'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case 'add_memory': {
          const a = AddMemoryInput.parse(args);
          const projectName = a.project ?? (await backend.getActiveProject());
          const created = await backend.addMemory({
            content: a.content,
            category: a.category,
            project: projectName,
            tags: a.tags ?? [],
            importance: a.importance,
          });
          return textResult(`Saved memory ${created.id}:\n${formatMemory(created)}`);
        }
        case 'search_memories': {
          const a = SearchInput.parse(args);
          let results = await backend.searchMemories({ query: a.query, project: a.project, category: a.category, limit: a.limit });
          if (results.length === 0) return textResult('No memories found.');
          return textResult(`Found ${results.length} memories:\n\n` + results.map(formatMemory).join('\n\n'));
        }
        case 'list_memories': {
          const a = ListInput.parse(args);
          const items = await backend.listMemories({ project: a.project, category: a.category });
          if (items.length === 0) return textResult('No memories match the filter.');
          return textResult(`${items.length} memories:\n\n` + items.map(formatMemory).join('\n\n'));
        }
        case 'find_similar': {
          const a = SimilarInput.parse(args);
          if (!a.text && !a.memory_id) return errResult('Provide either "text" or "memory_id".');
          const scored = await backend.findSimilar({ text: a.text, memoryId: a.memory_id, topK: a.top_k });
          if (scored.length === 0) return textResult('No similar memories found.');
          return textResult(`Top ${scored.length} similar:\n\n` +
            scored.map(({ score, ...m }) => `(${(score * 100).toFixed(0)}%) ${formatMemory(m)}`).join('\n\n'));
        }
        case 'delete_memory': {
          const a = DeleteInput.parse(args);
          await backend.deleteMemory(a.id);
          return textResult(`Deleted memory ${a.id}.`);
        }
        case 'list_projects': {
          const projects = await backend.listProjects();
          return textResult(`Projects:\n` + projects.map(p => `- ${p}`).join('\n'));
        }
        case 'switch_project': {
          const a = ProjectInput.parse(args);
          await backend.switchProject(a.name);
          return textResult(`Active project: ${await backend.getActiveProject()}`);
        }
        case 'get_project_context': {
          const { project, markdown } = await backend.getProjectContextMarkdown();
          return textResult(markdown || `# Rules for ${project}\n\n_No memories saved yet._`);
        }
        case 'import_jsonl': {
          const a = ImportJsonlInput.parse(args);
          const cwd = backend.cwd?.() ?? process.cwd();
          const fullPath = a.path.startsWith('/') || /^[a-z]:/i.test(a.path) ? a.path : `${cwd}/${a.path}`;
          let text: string;
          try {
            text = await readFile(fullPath, 'utf-8');
          } catch (e) {
            return errResult(`Cannot read ${fullPath}: ${(e as Error).message}`);
          }
          const { memories, stats } = jsonlToMemories(text, { projectName: a.project });
          let imported = 0;
          for (const p of memories) {
            const id = 'mem-' + Math.random().toString(36).slice(2, 11);
            await backend.addMemory({
              content: p.content,
              category: p.category,
              project: p.project,
              tags: p.tags,
            });
            imported++;
          }
          return textResult(
            `Imported ${imported} memories from ${fullPath}\n` +
            `Total turns: ${stats.totalTurns}, user messages: ${stats.userTurns}, accepted: ${stats.accepted}`
          );
        }
        default:
          return errResult(`Unknown tool: ${name}`);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return errResult(`Invalid input: ${err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      return errResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: 'agentmemory://rules',    name: 'Active project rules',       description: 'All memory rules for the currently active project, formatted as markdown.', mimeType: 'text/markdown' },
      { uri: 'agentmemory://graph',    name: 'Memory relation graph',      description: 'All relations between memories as JSON.',                                   mimeType: 'application/json' },
      { uri: 'agentmemory://projects', name: 'Project list',               description: 'List of all projects.',                                                    mimeType: 'application/json' },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === 'agentmemory://rules')    return { contents: [{ uri, mimeType: 'text/markdown',     text: await backend.getRules() }] };
    if (uri === 'agentmemory://graph')    return { contents: [{ uri, mimeType: 'application/json', text: await backend.getGraphJson() }] };
    if (uri === 'agentmemory://projects') return { contents: [{ uri, mimeType: 'application/json', text: await backend.getProjectsJson() }] };
    throw new Error(`Unknown resource: ${uri}`);
  });

  return server;
}
