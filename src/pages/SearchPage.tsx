import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, X, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import { Memory, MemoryCategory, MemorySource } from '../types';
import { CATEGORIES, SOURCES, CATEGORY_BG, SOURCE_COLORS, SOURCE_ICONS } from '../utils/constants';
import MemoryCard from '../components/MemoryCard';
import MemoryModal from '../components/MemoryModal';
import { cn } from '../utils/cn';
import { simpleEmbedding, cosineSimilarity } from '../store/memoryStore';

type SortBy = 'relevance' | 'recent' | 'importance';

export default function SearchPage() {
  const { memories, projects } = useMemoryStore();
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | ''>('');
  const [filterSource, setFilterSource] = useState<MemorySource | ''>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMemory, setEditMemory] = useState<Memory | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const searchResults = useMemo(() => {
    let results: (Memory & { similarity?: number })[] = [];

    if (query.trim()) {
      // Semantic search simulation
      const queryEmbedding = simpleEmbedding(query);
      results = memories.map(m => ({
        ...m,
        similarity: m.embedding ? cosineSimilarity(queryEmbedding, m.embedding) : 0,
      }));
    } else {
      results = memories.map(m => ({ ...m, similarity: undefined }));
    }

    // Apply filters
    if (filterCategory) results = results.filter(m => m.category === filterCategory);
    if (filterSource) results = results.filter(m => m.source === filterSource);
    if (filterProject) results = results.filter(m => m.project_name === filterProject);

    // Filter by minimum relevance threshold when searching
    if (query.trim()) {
      results = results.filter(m => (m.similarity || 0) > 0.1);
    }

    // Sort
    if (sortBy === 'relevance' && query.trim()) {
      results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    } else if (sortBy === 'recent') {
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'importance') {
      results.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    } else if (!query.trim()) {
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return results;
  }, [query, memories, filterCategory, filterSource, filterProject, sortBy]);

  const hasActiveFilters = filterCategory || filterSource || filterProject;

  const clearFilters = () => {
    setFilterCategory('');
    setFilterSource('');
    setFilterProject('');
  };

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value) {
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 300);
    }
  }, []);

  const topResults = searchResults.slice(0, 20);
  const highRelevance = topResults.filter(m => (m.similarity || 0) > 0.5);
  const lowRelevance = topResults.filter(m => (m.similarity || 0) <= 0.5 && m.similarity !== undefined);
  const noSimilarity = topResults.filter(m => m.similarity === undefined);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Search Memories</h1>
          <p className="text-sm text-gray-400">
            Semantic search across {memories.length} memories using AI embeddings
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Memory
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          )}
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search memories semantically... e.g. 'authentication patterns', 'database rules'"
            className="w-full pl-12 pr-32 py-4 bg-gray-900 border border-gray-700 rounded-2xl text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            )}
            <div className="flex items-center gap-1 px-2 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-lg">
              <Sparkles size={11} className="text-indigo-400" />
              <span className="text-xs text-indigo-400">Semantic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors',
            showFilters || hasActiveFilters
              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
          )}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 bg-indigo-600 rounded-full text-xs flex items-center justify-center text-white">
              {[filterCategory, filterSource, filterProject].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-500 mr-1">Sort:</span>
          {(['relevance', 'recent', 'importance'] as SortBy[]).map(sort => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                sortBy === sort
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
              )}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-500">
          {searchResults.length} results
        </span>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Filters</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1">
                <X size={12} />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs border transition-all',
                      filterCategory === cat ? CATEGORY_BG[cat] : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            {/* Source */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Source</label>
              <div className="flex flex-wrap gap-1.5">
                {SOURCES.filter(s => s !== 'template').map(src => (
                  <button
                    key={src}
                    onClick={() => setFilterSource(filterSource === src ? '' : src)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs border transition-all',
                      filterSource === src ? SOURCE_COLORS[src] : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {SOURCE_ICONS[src]} {src}
                  </button>
                ))}
              </div>
            </div>
            {/* Project */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Project</label>
              <div className="flex flex-wrap gap-1.5">
                {projects.map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterProject(filterProject === p ? '' : p)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs border transition-all',
                      filterProject === p ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {query.trim() ? (
        <div className="space-y-6">
          {highRelevance.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
                <Sparkles size={12} className="text-indigo-400" />
                High Relevance ({highRelevance.length})
              </h3>
              <div className="grid gap-3">
                {highRelevance.map(memory => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    similarity={memory.similarity}
                    onEdit={setEditMemory}
                  />
                ))}
              </div>
            </div>
          )}
          {lowRelevance.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 mb-3">
                Related ({lowRelevance.length})
              </h3>
              <div className="grid gap-3">
                {lowRelevance.map(memory => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    similarity={memory.similarity}
                    onEdit={setEditMemory}
                  />
                ))}
              </div>
            </div>
          )}
          {searchResults.length === 0 && (
            <div className="text-center py-16">
              <Search size={40} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No memories found</p>
              <p className="text-gray-600 text-sm">Try different keywords or add new memories</p>
              <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
                Add Memory
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-gray-400">
              All Memories ({noSimilarity.length})
            </h3>
          </div>
          <div className="grid gap-3">
            {noSimilarity.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={setEditMemory}
              />
            ))}
          </div>
          {noSimilarity.length === 0 && (
            <div className="text-center py-16">
              <Plus size={40} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">No memories yet. Add your first one!</p>
              <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
                Add Memory
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && <MemoryModal onClose={() => setShowModal(false)} />}
      {editMemory && <MemoryModal memory={editMemory} onClose={() => setEditMemory(null)} />}
    </div>
  );
}
