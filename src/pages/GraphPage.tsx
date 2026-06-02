import { useState, useMemo } from 'react';
import { X, Edit2, Trash2, Search as SearchIcon, Network, Filter, ZoomIn } from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import { Memory, MemoryCategory } from '../types';
import { CATEGORY_BG, CATEGORY_COLORS, SOURCE_ICONS, CATEGORIES } from '../utils/constants';
import ForceGraph from '../components/ForceGraph';
import MemoryModal from '../components/MemoryModal';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';

export default function GraphPage() {
  const { memories, relations, deleteMemory, getSimilarMemories } = useMemoryStore();
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [editMemory, setEditMemory] = useState<Memory | null>(null);
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const projects = useMemo(() => ['all', ...Array.from(new Set(memories.map(m => m.project_name)))], [memories]);

  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      const catMatch = filterCategory === 'all' || m.category === filterCategory;
      const projMatch = filterProject === 'all' || m.project_name === filterProject;
      const searchMatch = !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase());
      return catMatch && projMatch && searchMatch;
    });
  }, [memories, filterCategory, filterProject, searchQuery]);

  const filteredRelations = useMemo(() => {
    const ids = new Set(filteredMemories.map(m => m.id));
    return relations.filter(r => ids.has(r.from_memory_id) && ids.has(r.to_memory_id));
  }, [filteredMemories, relations]);

  const similarMemories = useMemo(() => {
    if (!selectedMemory) return [];
    return getSimilarMemories(selectedMemory.id);
  }, [selectedMemory, getSimilarMemories]);

  const handleDelete = () => {
    if (selectedMemory) {
      deleteMemory(selectedMemory.id);
      setSelectedMemory(null);
    }
  };

  const legendItems = [
    { label: 'Architecture', color: CATEGORY_COLORS.architecture },
    { label: 'Preference', color: CATEGORY_COLORS.preference },
    { label: 'Constraint', color: CATEGORY_COLORS.constraint },
    { label: 'Context', color: CATEGORY_COLORS.context },
    { label: 'Decision', color: CATEGORY_COLORS.decision },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Graph area */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
          <div className="flex-1 max-w-xs relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter memories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors backdrop-blur-sm',
              showFilters
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-gray-900/90 border-gray-700 text-gray-400 hover:text-gray-200'
            )}
          >
            <Filter size={14} />
            Filters
          </button>
          <div className="ml-auto flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg px-3 py-2">
            <Network size={14} className="text-indigo-400" />
            <span className="text-xs text-gray-400">
              <span className="text-white font-medium">{filteredMemories.length}</span> nodes,{' '}
              <span className="text-white font-medium">{filteredRelations.length}</span> edges
            </span>
          </div>
        </div>

        {/* Filters dropdown */}
        {showFilters && (
          <div className="absolute top-16 left-4 z-10 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl space-y-4 w-72">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={cn('px-2 py-1 rounded-lg text-xs border transition-all',
                    filterCategory === 'all' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600')}
                >
                  All
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={cn('px-2 py-1 rounded-lg text-xs border transition-all',
                      filterCategory === cat ? CATEGORY_BG[cat] : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600')}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Project</label>
              <div className="flex flex-wrap gap-1.5">
                {projects.map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterProject(p)}
                    className={cn('px-2 py-1 rounded-lg text-xs border transition-all',
                      filterProject === p ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600')}
                  >
                    {p === 'all' ? 'All Projects' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-xl p-3">
          <p className="text-xs font-medium text-gray-400 mb-2">Legend</p>
          <div className="space-y-1.5">
            {legendItems.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-indigo-500 rounded" />
              <span className="text-xs text-gray-400">Related</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-purple-500 rounded" style={{ border: '1px dashed' }} />
              <span className="text-xs text-gray-400">Extends</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500 rounded" style={{ borderStyle: 'dashed' }} />
              <span className="text-xs text-gray-400">Contradicts</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            <ZoomIn size={10} className="inline mr-1" />
            Scroll to zoom • Drag nodes
          </p>
        </div>

        {/* Hint bar */}
        {!selectedMemory && filteredMemories.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-full px-4 py-2 flex items-center gap-3 text-xs text-gray-400">
            <span>🖱️ Drag nodes • Scroll to zoom • Click to select</span>
          </div>
        )}

        {/* D3 Graph */}
        <ForceGraph
          memories={filteredMemories}
          relations={filteredRelations}
          onNodeClick={setSelectedMemory}
          selectedNodeId={selectedMemory?.id}
        />

        {filteredMemories.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Network size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No memories match your filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedMemory && (
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Memory Details</h3>
            <button onClick={() => setSelectedMemory(null)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Category & Source badges */}
            <div className="flex flex-wrap gap-2">
              <span className={cn('text-xs px-2 py-1 rounded-full border', CATEGORY_BG[selectedMemory.category])}>
                {selectedMemory.category}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
                {SOURCE_ICONS[selectedMemory.source]} {selectedMemory.source}
              </span>
            </div>

            {/* Memory content */}
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-sm text-gray-200 leading-relaxed">{selectedMemory.content}</p>
            </div>

            {/* Meta */}
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Project</span>
                <span className="text-gray-300">{selectedMemory.project_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Importance</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={cn('w-2 h-2 rounded-full', i <= (selectedMemory.importance || 3) ? 'bg-amber-400' : 'bg-gray-700')} />
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Created</span>
                <span className="text-gray-300">{formatDistanceToNow(new Date(selectedMemory.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Tags */}
            {selectedMemory.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMemory.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Memories */}
            {similarMemories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Similar Memories</p>
                <div className="space-y-2">
                  {similarMemories.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMemory(m)}
                      className="w-full text-left bg-gray-800 hover:bg-gray-750 rounded-lg p-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded border', CATEGORY_BG[m.category as MemoryCategory])}>
                          {m.category}
                        </span>
                        {m.similarity && (
                          <span className="text-xs text-indigo-400 font-mono">
                            {Math.round(m.similarity * 100)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-2">{m.content}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-800 flex gap-2">
            <button
              onClick={() => { setEditMemory(selectedMemory); setSelectedMemory(null); }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 rounded-lg text-sm transition-colors"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}

      {editMemory && (
        <MemoryModal memory={editMemory} onClose={() => setEditMemory(null)} />
      )}
    </div>
  );
}
