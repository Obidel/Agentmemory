import type { Memory, MemoryCategory, MemoryRelation } from '../../src/types/index.js';
import {
  useMemoryStore,
  simpleEmbedding,
  cosineSimilarity,
  buildRelationsFor,
} from '../../src/store/memoryStore.js';
import type { MemoryBackend } from '../server.js';

const SIM_THRESHOLD = 0.7;

function genId(): string {
  return 'mem-' + Math.random().toString(36).substring(2, 11);
}

/**
 * LocalBackend: reads/writes the same zustand store the web app uses.
 * Persists to disk via AGENTMEMORY_HOME (or cwd). Used for the stdio transport.
 */
export class LocalBackend implements MemoryBackend {
  private get store() { return useMemoryStore.getState(); }

  async addMemory(input: { content: string; category: MemoryCategory; project?: string; tags?: string[]; importance?: number }): Promise<Memory> {
    const created = useMemoryStore.getState().addMemory({
      content: input.content,
      category: input.category,
      source: 'manual',
      project_name: input.project ?? useMemoryStore.getState().activeProject,
      tags: input.tags ?? [],
      importance: input.importance ?? 3,
    });
    return created;
  }

  async searchMemories(input: { query: string; project?: string; category?: MemoryCategory; limit?: number }): Promise<Memory[]> {
    const state = useMemoryStore.getState();
    const lower = input.query.toLowerCase();
    return state.memories
      .filter(m => {
        if (input.project && m.project_name !== input.project) return false;
        if (input.category && m.category !== input.category) return false;
        return m.content.toLowerCase().includes(lower) ||
               m.tags.some(t => t.toLowerCase().includes(lower)) ||
               m.project_name.toLowerCase().includes(lower);
      })
      .slice(0, input.limit ?? 20);
  }

  async listMemories(input: { project?: string; category?: MemoryCategory }): Promise<Memory[]> {
    const state = useMemoryStore.getState();
    const project = input.project ?? 'all';
    return state.getMemoriesByProject(project)
      .filter(m => !input.category || m.category === input.category);
  }

  async findSimilar(input: { text?: string; memoryId?: string; topK?: number }): Promise<Array<Memory & { score: number }>> {
    const state = useMemoryStore.getState();
    let targetEmb: number[] | undefined;
    if (input.memoryId) {
      const target = state.memories.find(m => m.id === input.memoryId);
      if (!target) return [];
      targetEmb = target.embedding;
    } else if (input.text) {
      targetEmb = simpleEmbedding(input.text);
    }
    if (!targetEmb) return [];
    return state.memories
      .filter(m => m.embedding && m.id !== input.memoryId)
      .map(m => ({ ...m, score: cosineSimilarity(targetEmb!, m.embedding!) }))
      .filter((m): m is Memory & { score: number } => m.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, input.topK ?? 5);
  }

  async deleteMemory(id: string): Promise<void> {
    useMemoryStore.getState().deleteMemory(id);
  }

  async listProjects(): Promise<string[]> {
    return useMemoryStore.getState().projects;
  }

  async getActiveProject(): Promise<string> {
    return useMemoryStore.getState().activeProject;
  }

  async switchProject(name: string): Promise<void> {
    const state = useMemoryStore.getState();
    if (!state.projects.includes(name)) state.addProject(name);
    else state.setActiveProject(name);
  }

  async getProjectContextMarkdown(): Promise<{ project: string; markdown: string }> {
    const state = useMemoryStore.getState();
    const project = state.activeProject;
    const mems = state.getMemoriesByProject(project);
    if (mems.length === 0) return { project, markdown: '' };
    const byCat: Record<string, Memory[]> = {};
    for (const m of mems) (byCat[m.category] ??= []).push(m);
    const sections = Object.entries(byCat)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, items]) => {
        const lines = items
          .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
          .map(m => `- (★${m.importance}) ${m.content}${m.tags.length ? ` _[${m.tags.join(', ')}]_` : ''}`);
        return `## ${cat}\n\n${lines.join('\n')}`;
      });
    return { project, markdown: `# Rules for ${project}\n\n${sections.join('\n\n')}\n` };
  }

  async getRules(): Promise<string> {
    const state = useMemoryStore.getState();
    const mems = state.getMemoriesByProject(state.activeProject);
    return mems.map(m => `- (★${m.importance}) [${m.category}] ${m.content}`).join('\n') || 'No rules.';
  }

  async getGraphJson(): Promise<string> {
    const state = useMemoryStore.getState();
    return JSON.stringify({ relations: state.relations, memory_count: state.memories.length }, null, 2);
  }

  async getProjectsJson(): Promise<string> {
    const state = useMemoryStore.getState();
    return JSON.stringify({ projects: state.projects, active: state.activeProject }, null, 2);
  }
}
