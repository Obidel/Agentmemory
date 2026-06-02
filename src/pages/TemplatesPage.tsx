import { useState } from 'react';
import { Check, Eye, Download, Sparkles, Tag, X } from 'lucide-react';
import { TEMPLATES, CATEGORY_BG } from '../utils/constants';
import { Template, MemoryCategory } from '../types';
import { useMemoryStore } from '../store/memoryStore';
import { cn } from '../utils/cn';

export default function TemplatesPage() {
  const { importMemories, activeProject } = useMemoryStore();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

  const filteredTemplates = filterCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === filterCategory);

  const handleImport = async (template: Template) => {
    setImporting(template.id);
    await new Promise(r => setTimeout(r, 1000));
    importMemories(
      template.memories.map(m => ({
        content: m.content || '',
        category: m.category || 'preference',
        source: 'template' as const,
        tags: [...(m.tags || []), template.name.toLowerCase().replace(/\s+/g, '-')],
        project_name: activeProject,
        importance: 3,
      }))
    );
    setImporting(null);
    setImported(template.id);
    setTimeout(() => setImported(null), 3000);
  };

  const categoryColors: Record<string, string> = {
    Frontend: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Infrastructure: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    Backend: 'bg-green-500/20 text-green-300 border-green-500/30',
    'Data & ML': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Business: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Memory Templates</h1>
        <p className="text-sm text-gray-400">
          Jump-start your AI agent memory with curated rule sets for different developer roles.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
              filterCategory === cat
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
            )}
          >
            {cat === 'all' ? 'All Templates' : cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-indigo-500/40 transition-all group"
          >
            {/* Card Header */}
            <div className="p-5 pb-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{template.icon}</span>
                <span className={cn('text-xs px-2 py-1 rounded-full border', categoryColors[template.category] || 'bg-gray-800 border-gray-700 text-gray-400')}>
                  {template.category}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{template.name}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{template.description}</p>
            </div>

            {/* Stats */}
            <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-400" />
                <span className="text-sm text-gray-300 font-medium">{template.rules_count} rules</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs text-gray-600 flex items-center gap-0.5">
                    <Tag size={9} />#{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview snippets */}
            <div className="px-5 pb-4 space-y-1.5">
              {template.memories.slice(0, 2).map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <div className="w-1 h-1 rounded-full bg-gray-600 mt-1.5 flex-shrink-0" />
                  <span className="line-clamp-1">{m.content}</span>
                </div>
              ))}
              {template.memories.length > 2 && (
                <p className="text-xs text-gray-600 pl-3">+{template.memories.length - 2} more rules</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center gap-2">
              <button
                onClick={() => setPreviewTemplate(template)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
              >
                <Eye size={13} />
                Preview
              </button>
              <button
                onClick={() => handleImport(template)}
                disabled={importing === template.id || imported === template.id}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all font-medium',
                  imported === template.id
                    ? 'bg-green-600/20 border border-green-500/50 text-green-400'
                    : importing === template.id
                    ? 'bg-indigo-600/50 text-indigo-300 cursor-wait'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                )}
              >
                {imported === template.id ? (
                  <><Check size={13} /> Imported!</>
                ) : importing === template.id ? (
                  <>
                    <div className="w-3 h-3 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <><Download size={13} /> Import</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Section */}
      <div className="border-t border-gray-800 pt-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade Your Memory</h2>
          <p className="text-gray-400">More memories, more projects, team collaboration</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              name: 'Free',
              price: 0,
              features: ['50 memories', '1 project', 'All formats export', 'Semantic search', 'D3 graph view'],
              cta: 'Current Plan',
              disabled: true,
              highlight: false,
            },
            {
              name: 'Solo',
              price: 10,
              features: ['Unlimited memories', '5 projects', 'GitHub Sync', 'Priority embeddings', 'API access'],
              cta: 'Get Solo',
              disabled: false,
              highlight: true,
            },
            {
              name: 'Team',
              price: 25,
              features: ['Everything in Solo', 'Unlimited projects', 'Team sharing', 'Shared memory pools', 'Admin dashboard'],
              cta: 'Get Team',
              disabled: false,
              highlight: false,
            },
          ].map(plan => (
            <div
              key={plan.name}
              className={cn(
                'relative bg-gray-900 border rounded-2xl p-6',
                plan.highlight
                  ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'border-gray-800'
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Most Popular
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  {plan.price > 0 && <span className="text-gray-400 text-sm">/month</span>}
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check size={14} className="text-indigo-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.disabled}
                className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-medium transition-colors',
                  plan.disabled
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : plan.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                )}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{previewTemplate.icon}</span>
                <div>
                  <h3 className="text-base font-semibold text-white">{previewTemplate.name}</h3>
                  <p className="text-xs text-gray-400">{previewTemplate.rules_count} rules</p>
                </div>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {previewTemplate.memories.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 rounded-xl">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5', CATEGORY_BG[m.category as MemoryCategory || 'preference'])}>
                    {m.category}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed">{m.content}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { handleImport(previewTemplate); setPreviewTemplate(null); }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Import Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
