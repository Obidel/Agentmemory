import type { Memory, MemoryCategory } from '../types';

export interface JsonlTurn {
  type: string;
  message?: { role?: string; content?: unknown };
  timestamp?: string;
  isMeta?: boolean;
}

export interface ParsedMemory {
  content: string;
  category: MemoryCategory;
  source: 'imported';
  tags: string[];
  project: string;
  created_at: string;
  skipReason?: string;
}

/**
 * Parse a Claude Code JSONL file (one JSON object per line).
 * Yields `user`-role messages, dropping tool calls, system prompts, etc.
 */
export function parseJsonl(text: string): { turns: JsonlTurn[]; errors: number } {
  const turns: JsonlTurn[] = [];
  let errors = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object' && 'type' in obj) {
        turns.push(obj as JsonlTurn);
      }
    } catch {
      errors++;
    }
  }
  return { turns, errors };
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && 'text' in c && typeof (c as { text: unknown }).text === 'string') {
          return (c as { text: string }).text;
        }
        if (c && typeof c === 'object' && 'type' in c) {
          const t = (c as { type: string }).type;
          if (t === 'tool_use' || t === 'tool_result') return '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  return '';
}

// ─── Heuristic category detection ────────────────────────────────────

const PREFERENCE_HINTS = /\b(prefer|like|love|hate|always use|never use|don't use|do not use|please always|please never|习惯|喜欢|不喜欢|永远不要|总是)\b/i;
const CONSTRAINT_HINTS = /\b(must|should not|do not|never|required|forbidden|禁止|必须|不能|不要)\b/i;
const DECISION_HINTS = /\b(decided|chose|picked|chose to|going with|will use|adopt|决定|选择|采用)\b/i;
const ARCH_HINTS = /\b(architecture|pattern|stack|library|framework|use \w+ for|we use|架构|框架|技术栈)\b/i;

function detectCategory(text: string): MemoryCategory {
  if (DECISION_HINTS.test(text)) return 'decision';
  if (CONSTRAINT_HINTS.test(text)) return 'constraint';
  if (PREFERENCE_HINTS.test(text)) return 'preference';
  if (ARCH_HINTS.test(text)) return 'architecture';
  return 'context';
}

// ─── Quality filters ────────────────────────────────────────────────

const MIN_LENGTH = 20;
const MAX_LENGTH = 600;
const SKIP_PATTERNS = [
  /^\s*<command-name>/,
  /^\s*<local-command-(stdout|stderr)>/,
  /^\s*<system-reminder>/,
  /^\s*<command-snapshot>/,
  /^\s*\[Request interrupted by/,
  /^\s*\.{3,}$/,
  /^\s*(\/|>|\$)/,          // shell commands
];

function isInteresting(text: string): boolean {
  if (text.length < MIN_LENGTH) return false;
  if (text.length > MAX_LENGTH) return false;
  for (const p of SKIP_PATTERNS) if (p.test(text)) return false;
  return true;
}

function extractTags(text: string): string[] {
  const out = new Set<string>();
  // explicit #tags
  for (const m of text.matchAll(/#([a-z0-9_-]{2,30})/gi)) out.add(m[1].toLowerCase());
  // file/path-like tokens
  for (const m of text.matchAll(/`?([a-z0-9_-]+\.[a-z]{1,5})`?/gi)) {
    const ext = m[1].split('.').pop()!;
    if (['ts','tsx','js','jsx','py','rs','go','sql','md','json','yaml','yml','css','html','sh'].includes(ext)) {
      out.add(ext);
    }
  }
  return [...out].slice(0, 5);
}

/**
 * Convert JSONL turns into candidate memories. Returns one entry per interesting
 * `user` message, with heuristic category + tags. Caller is expected to show
 * these as a preview before letting the user confirm.
 */
export function jsonlToMemories(
  text: string,
  options: { projectName?: string; sessionLabel?: string } = {}
): { memories: ParsedMemory[]; stats: { totalTurns: number; userTurns: number; accepted: number } } {
  const { turns } = parseJsonl(text);
  const project = options.projectName || options.sessionLabel || 'imported-claude-code';
  const memories: ParsedMemory[] = [];
  let userTurns = 0;

  for (const turn of turns) {
    if (turn.type !== 'user') continue;
    userTurns++;
    const text = extractText(turn.message?.content);
    if (!isInteresting(text)) continue;
    memories.push({
      content: text,
      category: detectCategory(text),
      source: 'imported',
      tags: extractTags(text),
      project,
      created_at: turn.timestamp || new Date().toISOString(),
    });
  }

  return { memories, stats: { totalTurns: turns.length, userTurns, accepted: memories.length } };
}

/**
 * Convert parsed memories into the `Memory` shape the store expects.
 * Caller provides id generator and current user id.
 */
export function parsedToMemory(p: ParsedMemory, userId: string, id: string, embedding?: number[]): Omit<Memory, 'created_at' | 'updated_at'> {
  return {
    id,
    user_id: userId,
    project_name: p.project,
    content: p.content,
    category: p.category,
    source: 'imported',
    tags: p.tags,
    embedding,
    importance: 3,
    strength: 1.0,
    access_count: 0,
    last_accessed_at: p.created_at,
    is_latest: true,
  };
}
