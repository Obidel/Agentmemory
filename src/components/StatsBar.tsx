import { useMemoryStore } from '../store/memoryStore';
import { Brain, Network, Folder } from 'lucide-react';
import { CATEGORY_COLORS } from '../utils/constants';
import { MemoryCategory } from '../types';

export default function StatsBar() {
  const { memories, relations, projects } = useMemoryStore();

  const categoryCounts = memories.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {} as Record<MemoryCategory, number>);

  return (
    <div className="flex items-center gap-6 text-sm text-gray-400 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Brain size={14} className="text-indigo-400" />
        <span><strong className="text-white">{memories.length}</strong> memories</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Network size={14} className="text-purple-400" />
        <span><strong className="text-white">{relations.length}</strong> connections</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Folder size={14} className="text-cyan-400" />
        <span><strong className="text-white">{projects.length}</strong> projects</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {(Object.entries(categoryCounts) as [MemoryCategory, number][]).map(([cat, count]) => (
          <div
            key={cat}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: CATEGORY_COLORS[cat] + '20', color: CATEGORY_COLORS[cat] }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            {cat}: {count}
          </div>
        ))}
      </div>
    </div>
  );
}
