import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, GitBranch, FileText, CheckSquare, Square,
  ChevronRight, Loader2, Check, Sparkles
} from 'lucide-react';

const Github = GitBranch;
import { useMemoryStore } from '../store/memoryStore';
import { ImportPreviewItem, MemoryCategory, MemorySource } from '../types';
import { CATEGORY_BG, SOURCE_COLORS, SOURCE_ICONS } from '../utils/constants';
import { jsonlToMemories } from '../utils/jsonlImport';
import { cn } from '../utils/cn';

type TabType = 'file' | 'github' | 'text';

const GITHUB_REPOS = [
  { name: 'my-project', files: ['.cursorrules', 'CLAUDE.md', '.claude/settings.local.json'] },
  { name: 'api-service', files: ['.cursorrules', '.github/copilot-instructions.md'] },
  { name: 'data-pipeline', files: ['CLAUDE.md'] },
];

function parseContent(content: string, filename: string): ImportPreviewItem[] {
  const items: ImportPreviewItem[] = [];
  const source: MemorySource = filename.includes('claude') || filename.includes('CLAUDE') ? 'claude' :
    filename.includes('cursor') || filename.includes('cursorrules') ? 'cursor' : 'import';

  if (filename.endsWith('.jsonl')) {
    // Claude Code / OpenCode / Codex JSONL session log
    const projectName = filename.replace(/\.jsonl$/i, '').replace(/[\\/]/g, '-');
    const { memories, stats } = jsonlToMemories(content, { projectName });
    items.push(...memories.slice(0, 200).map(m => ({
      content: m.content,
      category: m.category,
      source: 'imported' as MemorySource,
      tags: m.tags,
      selected: true,
    })));
    // Append a synthetic summary so the user sees parse stats
    if (items.length === 0) {
      items.push({
        content: `(JSONL had ${stats.totalTurns} turns / ${stats.userTurns} user messages; nothing matched the heuristic filter)`,
        category: 'context' as MemoryCategory,
        source: 'imported' as MemorySource,
        tags: ['jsonl-empty'],
        selected: false,
      });
    }
  } else if (filename.endsWith('.json')) {
    // Try parse as JSON memory
    try {
      const json = JSON.parse(content);
      const rules = json.rules || json.memories || json.preferences || [];
      if (Array.isArray(rules)) {
        rules.forEach((rule: string | { content: string; category?: string }) => {
          const text = typeof rule === 'string' ? rule : rule.content;
          if (text?.trim()) {
            items.push({
              content: text.trim(),
              category: (typeof rule === 'object' && rule.category as MemoryCategory) || 'preference',
              source,
              tags: [],
              selected: true,
            });
          }
        });
      } else if (json.memory || json.system_prompt) {
        const text = json.memory || json.system_prompt;
        items.push({ content: text.trim(), category: 'context', source, tags: ['system'], selected: true });
      }
    } catch {
      items.push({ content: content.trim(), category: 'context', source, tags: [], selected: true });
    }
  } else if (filename.endsWith('.md') || filename.includes('CLAUDE')) {
    // Split by ## headings
    const sections = content.split(/^##\s+/m).filter(s => s.trim());
    sections.forEach(section => {
      const lines = section.split('\n');
      const heading = lines[0]?.trim() || '';
      const body = lines.slice(1).join('\n').trim();
      if (body) {
        // Determine category from heading
        const cat: MemoryCategory = heading.toLowerCase().includes('architecture') ? 'architecture' :
          heading.toLowerCase().includes('prefer') ? 'preference' :
          heading.toLowerCase().includes('constraint') || heading.toLowerCase().includes('rule') ? 'constraint' :
          heading.toLowerCase().includes('decision') ? 'decision' : 'context';

        // Split body into bullet points if present
        const bullets = body.split(/\n[-*•]\s+/).filter(b => b.trim().length > 20);
        if (bullets.length > 1) {
          bullets.forEach(bullet => {
            const text = bullet.trim().replace(/^[-*•]\s+/, '');
            if (text) {
              items.push({ content: text, category: cat, source, tags: [heading.toLowerCase().replace(/\s+/g, '-')], selected: true });
            }
          });
        } else {
          items.push({ content: body.slice(0, 500), category: cat, source, tags: [heading.toLowerCase().replace(/\s+/g, '-')], selected: true });
        }
      }
    });

    if (items.length === 0 && content.trim()) {
      // Fallback: split by double newlines
      content.split(/\n\n+/).forEach(para => {
        if (para.trim().length > 20) {
          items.push({ content: para.trim().slice(0, 500), category: 'context', source, tags: [], selected: true });
        }
      });
    }
  } else {
    // .cursorrules or plain text: split by --- or empty lines
    const sections = content.split(/^---+\s*$/m);
    sections.forEach(section => {
      const trimmed = section.trim();
      if (trimmed.length > 20) {
        // Split by bullet points too
        const bullets = trimmed.split(/\n[-*•]\s+/);
        if (bullets.length > 2) {
          bullets.forEach(b => {
            const text = b.replace(/^[-*•]\s+/, '').trim();
            if (text.length > 15) {
              const cat: MemoryCategory = text.toLowerCase().includes('never') || text.toLowerCase().includes('always') || text.toLowerCase().includes('must') ? 'constraint' :
                text.toLowerCase().includes('prefer') || text.toLowerCase().includes('use ') ? 'preference' : 'context';
              items.push({ content: text, category: cat, source, tags: [], selected: true });
            }
          });
        } else {
          const cat: MemoryCategory = trimmed.toLowerCase().includes('never') || trimmed.toLowerCase().includes('always') ? 'constraint' :
            trimmed.toLowerCase().includes('prefer') || trimmed.toLowerCase().includes('use ') ? 'preference' : 'preference';
          items.push({ content: trimmed.slice(0, 500), category: cat, source, tags: [], selected: true });
        }
      }
    });
  }

  return items.slice(0, 50); // Limit preview
}

export default function ImportPage() {
  const { importMemories } = useMemoryStore();
  const [activeTab, setActiveTab] = useState<TabType>('file');
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedRepoFile, setSelectedRepoFile] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [fileName, setFileName] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const items = parseContent(content, file.name);
      setPreviewItems(items);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.md', '.txt', '.json', '.cursorrules', '.jsonl'],
      'application/json': ['.json', '.jsonl'],
    },
    multiple: false,
  });

  const handleTextParse = () => {
    if (!pastedText.trim()) return;
    const items = parseContent(pastedText, 'paste.md');
    setPreviewItems(items);
  };

  const handleGitHubFile = (repo: string, file: string) => {
    setSelectedRepo(repo);
    setSelectedRepoFile(file);
    // Simulate fetched content
    const sampleContent = file === 'CLAUDE.md' ? `## Architecture
- Always use TypeScript for all new files
- Use functional components with hooks in React
- Prefer composition over inheritance
- Use dependency injection for testability

## Preferences
- Use Prettier with 2-space indentation
- Prefer const over let, never use var
- Use async/await over .then() chains
- Early returns to reduce nesting

## Constraints
- Never commit secrets or API keys to the repository
- All functions must have return types annotated
- Tests required for all business logic (>80% coverage)
- No console.log in production code

## Context
This is a full-stack TypeScript monorepo using Next.js, Prisma, and PostgreSQL.
The project follows Domain-Driven Design principles.` :
    file === '.cursorrules' ? `You are an expert TypeScript developer.

---
Always write clean, readable code with proper TypeScript types.
Prefer functional programming patterns where appropriate.
---
Use React hooks exclusively. No class components.
Follow the project's established patterns and conventions.
---
Security: Never expose sensitive data. Always validate inputs.
Use environment variables for all configuration values.
---
Testing: Write unit tests for all utility functions.
Use React Testing Library for component tests.` :
    `{ "rules": ["Use TypeScript strict mode", "Prefer named exports", "Use Zod for validation", "Always handle async errors"] }`;

    const items = parseContent(sampleContent, file);
    setPreviewItems(items);
  };

  const toggleItem = (idx: number) => {
    setPreviewItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const toggleAll = () => {
    const allSelected = previewItems.every(i => i.selected);
    setPreviewItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const updateCategory = (idx: number, cat: MemoryCategory) => {
    setPreviewItems(prev => prev.map((item, i) => i === idx ? { ...item, category: cat } : item));
  };

  const handleImport = async () => {
    const selected = previewItems.filter(i => i.selected);
    if (selected.length === 0) return;
    setImporting(true);
    await new Promise(r => setTimeout(r, 1200));
    importMemories(selected.map(item => ({
      content: item.content,
      category: item.category,
      source: item.source,
      tags: item.tags,
    })));
    setImportedCount(selected.length);
    setImporting(false);
    setImported(true);
    setTimeout(() => {
      setImported(false);
      setPreviewItems([]);
      setPastedText('');
      setFileName('');
    }, 3000);
  };

  const selectedCount = previewItems.filter(i => i.selected).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Import Memories</h1>
        <p className="text-gray-400 text-sm">
          Import existing rules and context from Claude Code, Cursor, or GitHub Copilot files.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800 mb-6 w-fit">
        {([
          { id: 'file', label: 'Upload File', icon: Upload },
          { id: 'github', label: 'GitHub Sync', icon: Github },
          { id: 'text', label: 'Paste Text', icon: FileText },
        ] as { id: TabType; label: string; icon: any }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPreviewItems([]); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div>
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                )}
              >
                <input {...getInputProps()} />
                <Upload size={40} className={cn('mx-auto mb-4', isDragActive ? 'text-indigo-400' : 'text-gray-500')} />
                <p className="text-sm font-medium text-gray-300 mb-2">
                  {isDragActive ? 'Drop your file here...' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-gray-500">
                  Supports: <code className="text-indigo-400">.cursorrules</code>,{' '}
                  <code className="text-indigo-400">CLAUDE.md</code>,{' '}
                  <code className="text-indigo-400">.claude/settings.local.json</code>,{' '}
                  <code className="text-indigo-400">*.md</code>,{' '}
                  <code className="text-cyan-400">*.jsonl</code>
                </p>
              </div>
              {fileName && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                  <FileText size={14} className="text-indigo-400" />
                  <span className="text-sm text-gray-300 flex-1 truncate">{fileName}</span>
                  <span className="text-xs text-green-400">{previewItems.length} items found</span>
                </div>
              )}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 mb-3">Supported formats:</p>
                <div className="space-y-2">
                  {[
                    { file: 'CLAUDE.md', desc: 'Splits by ## headings, extracts sections' },
                    { file: '.cursorrules', desc: 'Splits by --- separators or bullet points' },
                    { file: 'settings.local.json', desc: 'Extracts rules array from JSON' },
                    { file: '*.md', desc: 'Generic markdown with heading sections' },
                    { file: '*.jsonl', desc: 'Claude Code session log — extracts interesting user messages with auto-detected category', special: true },
                  ].map(f => (
                    <div key={f.file} className="flex items-start gap-2">
                      <code className={cn('text-xs mt-0.5 flex-shrink-0', f.special ? 'text-cyan-400' : 'text-indigo-400')}>{f.file}</code>
                      <span className="text-xs text-gray-500">{f.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Github size={16} className="text-gray-300" />
                  <span className="text-sm font-medium text-gray-300">Connect Repository</span>
                  <span className="ml-auto text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                    Demo Mode
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Select a repository to scan for agent configuration files.
                </p>
                <div className="space-y-2">
                  {GITHUB_REPOS.map(repo => (
                    <div key={repo.name}
                      className={cn(
                        'border rounded-lg p-3 transition-colors',
                        selectedRepo === repo.name ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-gray-700 bg-gray-800'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Github size={13} className="text-gray-400" />
                        <span className="text-sm text-gray-300 font-mono">my-org/{repo.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {repo.files.map(file => (
                          <button
                            key={file}
                            onClick={() => handleGitHubFile(repo.name, file)}
                            className={cn(
                              'text-xs px-2 py-1 rounded border transition-colors font-mono',
                              selectedRepo === repo.name && selectedRepoFile === file
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                            )}
                          >
                            {file}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRepo && selectedRepoFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check size={14} className="text-green-400" />
                  <span className="text-xs text-green-400">
                    Fetched <code>{selectedRepoFile}</code> from {selectedRepo} — {previewItems.length} memories found
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Paste your rules or context</label>
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder={`Paste your AI agent rules, preferences, or context here...\n\nExamples:\n## Architecture\nAlways use TypeScript strict mode...\n\n---\nPrefer functional components...\n\n- Use Tailwind CSS for styling\n- Never use inline styles`}
                  rows={12}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>
              <button
                onClick={handleTextParse}
                disabled={!pastedText.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                Parse & Preview
              </button>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div>
          {previewItems.length > 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Preview header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Preview</span>
                  <span className="text-xs px-2 py-0.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-full">
                    {previewItems.length} found
                  </span>
                </div>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {previewItems.every(i => i.selected) ? (
                    <CheckSquare size={13} className="text-indigo-400" />
                  ) : (
                    <Square size={13} />
                  )}
                  Select all
                </button>
              </div>

              {/* Items list */}
              <div className="max-h-[440px] overflow-y-auto divide-y divide-gray-800">
                {previewItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 transition-colors',
                      item.selected ? 'bg-gray-900' : 'bg-gray-900/50 opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <button onClick={() => toggleItem(idx)} className="mt-0.5 flex-shrink-0">
                        {item.selected ? (
                          <CheckSquare size={15} className="text-indigo-400" />
                        ) : (
                          <Square size={15} className="text-gray-600" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 mb-1.5">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['architecture', 'preference', 'constraint', 'context', 'decision'] as MemoryCategory[]).map(cat => (
                            <button
                              key={cat}
                              onClick={() => updateCategory(idx, cat)}
                              className={cn(
                                'text-xs px-1.5 py-0.5 rounded border transition-all',
                                item.category === cat ? CATEGORY_BG[cat] : 'border-gray-700 text-gray-600 hover:text-gray-400'
                              )}
                            >
                              {cat}
                            </button>
                          ))}
                          <span className={cn('ml-auto text-xs px-1.5 py-0.5 rounded border', SOURCE_COLORS[item.source])}>
                            {SOURCE_ICONS[item.source]} {item.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Import button */}
              <div className="px-4 py-3 border-t border-gray-800">
                {imported ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-green-400">
                    <Check size={16} />
                    <span className="text-sm font-medium">Successfully imported {importedCount} memories!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleImport}
                    disabled={selectedCount === 0 || importing}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating embeddings...
                      </>
                    ) : (
                      <>
                        <ChevronRight size={14} />
                        Import {selectedCount} Memories
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] bg-gray-900 border border-gray-800 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                <FileText size={24} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-500 mb-1">No preview yet</p>
              <p className="text-xs text-gray-600">
                {activeTab === 'file' && 'Upload a file to see detected memories'}
                {activeTab === 'github' && 'Select a repository file to preview'}
                {activeTab === 'text' && 'Paste text and click Parse to preview'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
