#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  useMemoryStore,
  simpleEmbedding,
  cosineSimilarity,
} from '../src/store/memoryStore.js';
import type { Memory, MemoryCategory, MemorySource } from '../src/types/index.js';

const VALID_CATEGORIES: MemoryCategory[] = [
  'architecture', 'preference', 'constraint', 'context', 'decision',
];
const VALID_SOURCES: MemorySource[] = [
  'claude', 'cursor', 'copilot', 'manual', 'import', 'template',
];

// AgentMemory is 100% free and open source. The MCP server is fully featured
// with no license checks or plan limits. To support development, see:
//   https://dalink.to/agentmemory

const server = new Server(
  { name: 'agentmemory', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } }
);

const store = useMemoryStore.getState();
server.sendLoggingMessage?.({
  level: 'info',
  data: `AgentMemory MCP started; ${store.memories.length} memories, project=${store.activeProject} (free & open source)`,
});

// === Tool input schemas (Zod) ===

const AddMemoryInput = z.object({
  content: z.string().min(1).describe('The rule or fact to remember'),
  category: z.enum(['architecture', 'preference', 'constraint', 'context', 'decision'])
    .default('context')
    .describe('Category of the memory'),
  project: z.string().optional().describe('Project name (defaults to active project)'),
  tags: z.array(z.string()).optional().describe('Tags for grouping/searching'),
  importance: z.number().int().min(1).max(5).default(3)
    .describe('Importance from 1 (low) to 5 (critical)'),
});

const SearchInput = z.object({
  query: z.string().min(1).describe('Search query'),
  project: z.string().optional().describe('Filter by project name'),
  category: z.enum(['architecture', 'preference', 'constraint', 'context', 'decision'])
    .optional()
    .describe('Filter by category'),
  limit: z.number().int().min(1).max(50).default(20),
});

const ListInput = z.object({
  project: z.string().optional().describe('Project name or "all"'),
  category: z.enum(['architecture', 'preference', 'constraint', 'context', 'decision'])
    .optional()
    .describe('Filter by category'),
});

const SimilarInput = z.object({
  text: z.string().optional().describe('Free-text query to find similar memories'),
  memory_id: z.string().optional().describe('ID of an existing memory'),
  top_k: z.number().int().min(1).max(20).default(5),
});

const DeleteInput = z.object({
  id: z.string().min(1).describe('Memory ID to delete'),
});

const ProjectInput = z.object({
  name: z.string().min(1).describe('Project name'),
});

// === Tool definitions ===

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'add_memory',
      description: 'Save a new memory rule/fact about the project. Use this whenever the user states a preference, decision, constraint, or piece of context that should persist across sessions.',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The rule or fact to remember' },
          category: {
            type: 'string',
            enum: VALID_CATEGORIES,
            description: 'architecture | preference | constraint | context | decision',
          },
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
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    {
      name: 'list_projects',
      description: 'List all project names that have memories.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'switch_project',
      description: 'Switch the active project context (affects which project new memories are saved to).',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
    {
      name: 'get_project_context',
      description: 'Get all rules for the current active project, formatted as a markdown document. Use this at the start of a task to load project context.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// === Tool handlers ===

function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

function errResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

function formatMemory(m: Memory): string {
  const imp = '★'.repeat(m.importance ?? 0);
  return `[${m.category}] ${imp} ${m.content}\n  id=${m.id} • project=${m.project_name} • source=${m.source} • tags=[${m.tags.join(', ')}]`;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_memory': {
        const a = AddMemoryInput.parse(args);
        const created = useMemoryStore.getState().addMemory({
          content: a.content,
          category: a.category,
          source: 'manual',
          project_name: a.project ?? useMemoryStore.getState().activeProject,
          tags: a.tags ?? [],
          importance: a.importance,
        });
        return textResult(`Saved memory ${created.id}:\n${formatMemory(created)}`);
      }

      case 'search_memories': {
        const a = SearchInput.parse(args);
        let results = useMemoryStore.getState().searchMemories(a.query);
        if (a.project) results = results.filter(m => m.project_name === a.project);
        if (a.category) results = results.filter(m => m.category === a.category);
        results = results.slice(0, a.limit);
        if (results.length === 0) {
          return textResult('No memories found.');
        }
        return textResult(`Found ${results.length} memories:\n\n` + results.map(formatMemory).join('\n\n'));
      }

      case 'list_memories': {
        const a = ListInput.parse(args);
        const project = a.project ?? 'all';
        let items = useMemoryStore.getState().getMemoriesByProject(project);
        if (a.category) items = items.filter(m => m.category === a.category);
        if (items.length === 0) {
          return textResult('No memories match the filter.');
        }
        return textResult(`${items.length} memories:\n\n` + items.map(formatMemory).join('\n\n'));
      }

      case 'find_similar': {
        const a = SimilarInput.parse(args);
        if (!a.text && !a.memory_id) {
          return errResult('Provide either "text" or "memory_id".');
        }
        const state = useMemoryStore.getState();

        let targetEmb: number[] | undefined;
        if (a.memory_id) {
          const target = state.memories.find(m => m.id === a.memory_id);
          if (!target) return errResult(`Memory ${a.memory_id} not found.`);
          targetEmb = target.embedding;
        } else if (a.text) {
          targetEmb = simpleEmbedding(a.text);
        }
        if (!targetEmb) return errResult('No embedding available.');

        const scored = state.memories
          .filter(m => m.embedding)
          .map(m => ({ m, sim: cosineSimilarity(targetEmb!, m.embedding!) }))
          .filter(x => x.sim > 0.3)
          .sort((x, y) => y.sim - x.sim)
          .slice(0, a.top_k);

        if (scored.length === 0) {
          return textResult('No similar memories found.');
        }
        return textResult(
          `Top ${scored.length} similar:\n\n` +
          scored.map(({ m, sim }) => `(${(sim * 100).toFixed(0)}%) ${formatMemory(m)}`).join('\n\n')
        );
      }

      case 'delete_memory': {
        const a = DeleteInput.parse(args);
        useMemoryStore.getState().deleteMemory(a.id);
        return textResult(`Deleted memory ${a.id}.`);
      }

      case 'list_projects': {
        const projects = useMemoryStore.getState().projects;
        return textResult(`Projects:\n` + projects.map(p => `- ${p}`).join('\n'));
      }

      case 'switch_project': {
        const a = ProjectInput.parse(args);
        const state = useMemoryStore.getState();
        if (!state.projects.includes(a.name)) {
          state.addProject(a.name);
        } else {
          state.setActiveProject(a.name);
        }
        return textResult(`Active project: ${useMemoryStore.getState().activeProject}`);
      }

      case 'get_project_context': {
        const state = useMemoryStore.getState();
        const project = state.activeProject;
        const mems = state.getMemoriesByProject(project);
        if (mems.length === 0) {
          return textResult(`# Rules for ${project}\n\n_No memories saved yet._`);
        }
        const byCategory: Record<string, Memory[]> = {};
        for (const m of mems) {
          (byCategory[m.category] ??= []).push(m);
        }
        const sections = Object.entries(byCategory)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([cat, items]) => {
            const lines = items
              .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
              .map(m => `- (★${m.importance}) ${m.content}${m.tags.length ? ` _[${m.tags.join(', ')}]_` : ''}`);
            return `## ${cat}\n\n${lines.join('\n')}`;
          });
        const md = `# Rules for ${project}\n\n${sections.join('\n\n')}\n`;
        return textResult(md);
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

// === Resources (read-only data) ===

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'agentmemory://rules',
      name: 'Active project rules',
      description: 'All memory rules for the currently active project, formatted as markdown.',
      mimeType: 'text/markdown',
    },
    {
      uri: 'agentmemory://graph',
      name: 'Memory relation graph',
      description: 'All relations between memories as JSON.',
      mimeType: 'application/json',
    },
    {
      uri: 'agentmemory://projects',
      name: 'Project list',
      description: 'List of all projects.',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const state = useMemoryStore.getState();

  if (uri === 'agentmemory://rules') {
    const mems = state.getMemoriesByProject(state.activeProject);
    const md = `# Rules for ${state.activeProject}\n\n` +
      mems.map(m => `- (★${m.importance}) [${m.category}] ${m.content}`).join('\n');
    return {
      contents: [{ uri, mimeType: 'text/markdown', text: md || 'No rules.' }],
    };
  }

  if (uri === 'agentmemory://graph') {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ relations: state.relations, memory_count: state.memories.length }, null, 2),
      }],
    };
  }

  if (uri === 'agentmemory://projects') {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ projects: state.projects, active: state.activeProject }, null, 2),
      }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// === Start ===

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const memCount = useMemoryStore.getState().memories.length;
  console.error(`AgentMemory MCP server running on stdio (${memCount} memories loaded, free & open source — https://dalink.to/agentmemory)`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
