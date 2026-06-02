import { useState, useEffect } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { Memory, MemoryCategory, MemorySource } from '../types';
import { CATEGORIES, SOURCES, SOURCE_ICONS, SOURCE_COLORS } from '../utils/constants';
import { useMemoryStore } from '../store/memoryStore';
import { cn } from '../utils/cn';

interface MemoryModalProps {
  memory?: Memory | null;
  onClose: () => void;
  defaultProject?: string;
}

const CATEGORY_META: Record<MemoryCategory, { icon: string; desc: string }> = {
  architecture: { icon: '◈', desc: 'System design, structure, patterns' },
  preference:   { icon: '✦', desc: 'Style and approach choices' },
  constraint:   { icon: '⊘', desc: 'Hard rules, must-follow' },
  context:      { icon: '◉', desc: 'Project background, info' },
  decision:     { icon: '◆', desc: 'Choices with reasoning' },
};

export default function MemoryModal({ memory, onClose, defaultProject }: MemoryModalProps) {
  const { addMemory, updateMemory, projects, activeProject } = useMemoryStore();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('context');
  const [source, setSource] = useState<MemorySource>('manual');
  const [project, setProject] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [importance, setImportance] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (memory) {
      setContent(memory.content);
      setCategory(memory.category);
      setSource(memory.source);
      setProject(memory.project_name);
      setTags(memory.tags);
      setImportance(memory.importance || 3);
    } else {
      setProject(defaultProject || activeProject);
    }
  }, [memory, defaultProject, activeProject]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    if (memory) {
      updateMemory(memory.id, { content, category, source, project_name: project, tags, importance });
    } else {
      addMemory({ content, category, source, project_name: project, tags, importance });
    }
    setSaving(false);
    onClose();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-strong rounded-3xl w-full max-w-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-7 py-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" />
              {memory ? 'Edit Memory' : 'New Memory'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              {memory ? `id: ${memory.id}` : 'A new synapse in the network'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="relative px-7 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Content */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
              <span className="text-violet-400">●</span> Content
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Describe this memory, rule, or context..."
              rows={4}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 resize-none leading-relaxed transition-all"
              autoFocus
            />
            <div className="text-[10px] text-gray-600 font-mono mt-1.5 text-right">
              {content.length} characters
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
              <span className="text-fuchsia-400">●</span> Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(cat => {
                const meta = CATEGORY_META[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'relative text-left px-3 py-2.5 rounded-xl border transition-all',
                      isActive
                        ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/5'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                    )}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                    )}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn('text-sm', isActive ? 'text-violet-300' : 'text-gray-500')}>
                        {meta.icon}
                      </span>
                      <span className={cn('text-xs font-medium', isActive ? 'text-white' : 'text-gray-300')}>
                        {cat}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">{meta.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source + Project + Importance grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
                <span className="text-cyan-400">●</span> Source
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SOURCES.filter(s => s !== 'template').map(src => {
                  const isActive = source === src;
                  return (
                    <button
                      key={src}
                      onClick={() => setSource(src)}
                      className={cn(
                        'px-2.5 py-2 rounded-lg text-xs border transition-all text-left',
                        isActive
                          ? SOURCE_COLORS[src] + ' border-current'
                          : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                      )}
                    >
                      <span className="text-sm mr-1">{SOURCE_ICONS[src]}</span>{src}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
                <span className="text-emerald-400">●</span> Project
              </label>
              <select
                value={project}
                onChange={e => setProject(e.target.value)}
                className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-gray-100 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              >
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
                <span className="text-amber-400">●</span> Importance
              </label>
              <div className="flex items-center gap-1 px-2 py-1.5 bg-black/30 border border-white/10 rounded-xl">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    onClick={() => setImportance(i)}
                    className={cn(
                      'flex-1 h-7 rounded-lg text-xs font-bold transition-all',
                      i <= importance
                        ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
              <span className="text-pink-400">●</span> Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-full text-xs text-gray-200 group"
                >
                  <span className="text-pink-400">#</span>{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <span className="text-[10px] text-gray-600 italic px-1 self-center">No tags yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag, press Enter..."
                className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-gray-300 hover:border-violet-500/50 hover:text-white transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between gap-3 px-7 py-4 border-t border-white/5 bg-black/20">
          <div className="text-[10px] text-gray-600 font-mono">
            {content.trim() ? '✓ Ready to save' : 'Awaiting content...'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  {memory ? 'Update Memory' : 'Add to Network'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
