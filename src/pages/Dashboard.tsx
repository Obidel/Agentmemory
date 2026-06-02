import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Plus, TrendingUp, Network, Upload, Search,
  ArrowRight, Zap, Clock, Tag, Sparkles
} from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import { CATEGORY_COLORS, SOURCE_ICONS } from '../utils/constants';
import { MemoryCategory } from '../types';
import MemoryCard from '../components/MemoryCard';
import MemoryModal from '../components/MemoryModal';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  architecture: 'Architecture',
  preference: 'Preferences',
  constraint: 'Constraints',
  context: 'Context',
  decision: 'Decisions',
};

const CATEGORY_ICONS: Record<MemoryCategory, string> = {
  architecture: '◈',
  preference: '✦',
  constraint: '⊘',
  context: '◉',
  decision: '◆',
};

export default function Dashboard() {
  const { memories, relations, activeProject, projects, currentUser } = useMemoryStore();
  const [showModal, setShowModal] = useState(false);

  const projectMemories = memories.filter(m => m.project_name === activeProject);
  const recentMemories = [...memories].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  const categoryCounts: Partial<Record<MemoryCategory, number>> = {};
  projectMemories.forEach(m => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
  });

  const sourceCounts: Record<string, number> = {};
  memories.forEach(m => {
    sourceCounts[m.source] = (sourceCounts[m.source] || 0) + 1;
  });

  const stats = [
    {
      label: 'Total Memories',
      value: memories.length,
      icon: Brain,
      gradient: 'from-violet-500/20 to-fuchsia-500/10',
      textColor: 'text-violet-200',
      change: '+3 this week',
    },
    {
      label: 'Connections',
      value: relations.length,
      icon: Network,
      gradient: 'from-fuchsia-500/20 to-pink-500/10',
      textColor: 'text-fuchsia-200',
      change: 'Auto-discovered',
    },
    {
      label: 'Projects',
      value: projects.length,
      icon: Tag,
      gradient: 'from-cyan-500/20 to-violet-500/10',
      textColor: 'text-cyan-200',
      change: `Active: ${activeProject}`,
    },
    {
      label: 'AI Sources',
      value: Object.keys(sourceCounts).length,
      icon: Zap,
      gradient: 'from-amber-500/20 to-orange-500/10',
      textColor: 'text-amber-200',
      change: Object.entries(sourceCounts).map(([k, v]) => `${SOURCE_ICONS[k as keyof typeof SOURCE_ICONS]}${v}`).join(' '),
    },
  ];

  const quickActions = [
    { label: 'Add Memory',      icon: Plus,    action: () => setShowModal(true), primary: true },
    { label: 'Import',          icon: Upload,  to: '/import' },
    { label: 'Graph',           icon: Network, to: '/graph' },
    { label: 'Search',          icon: Search,  to: '/search' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
            <Sparkles size={11} className="text-violet-400" />
            Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1.5">
            Welcome back, <span className="text-gradient">{currentUser.name.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Managing <span className="text-violet-300 font-medium">{memories.length}</span> memories across <span className="text-violet-300 font-medium">{projects.length}</span> projects
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} />
          Add Memory
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${stat.gradient} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="relative">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center border border-white/10`}>
                  <stat.icon size={14} className={stat.textColor} />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-[11px] text-gray-500 truncate">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(action => (
          action.to ? (
            <Link
              key={action.label}
              to={action.to}
              className="glass glass-hover rounded-2xl p-4 flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <action.icon size={16} className="text-gray-300" />
              </div>
              <span className="text-sm font-medium text-gray-200 group-hover:text-white">{action.label}</span>
              <ArrowRight size={14} className="ml-auto text-gray-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ) : (
            <button
              key={action.label}
              onClick={action.action}
              className="glass glass-hover rounded-2xl p-4 flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <action.icon size={16} className="text-violet-300" />
              </div>
              <span className="text-sm font-medium text-white">Add Memory</span>
            </button>
          )
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent Memories */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent Memories</h2>
              <p className="text-xs text-gray-500 mt-0.5">Last updated thoughts</p>
            </div>
            <Link to="/search" className="text-xs text-violet-300 hover:text-violet-200 flex items-center gap-1 glass px-3 py-1.5 rounded-full">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentMemories.map(memory => (
              <MemoryCard key={memory.id} memory={memory} compact />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Category Breakdown */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-violet-400" />
              Categories in <span className="text-violet-300">{activeProject}</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const category = cat as MemoryCategory;
                const pct = projectMemories.length > 0 ? (count / projectMemories.length) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: CATEGORY_COLORS[category] }} className="text-xs">
                          {CATEGORY_ICONS[category]}
                        </span>
                        <span className="text-xs text-gray-300">{CATEGORY_LABELS[category]}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{count}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${CATEGORY_COLORS[category]}, ${CATEGORY_COLORS[category]}80)`,
                          boxShadow: `0 0 8px ${CATEGORY_COLORS[category]}80`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(categoryCounts).length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No memories yet</p>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={14} className="text-fuchsia-400" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentMemories.slice(0, 4).map(m => (
                <div key={m.id} className="flex items-start gap-2.5 group">
                  <div className="relative mt-1.5 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[m.category] }} />
                    <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: CATEGORY_COLORS[m.category] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 line-clamp-1 group-hover:text-white transition-colors">{m.content}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5 font-mono">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip */}
          <div className="relative glass rounded-2xl p-5 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 rounded-full blur-2xl" />
            <div className="relative">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                Pro Tip
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Import your <code className="bg-black/40 px-1.5 py-0.5 rounded text-violet-300 font-mono text-[10px]">.cursorrules</code> or{' '}
                <code className="bg-black/40 px-1.5 py-0.5 rounded text-violet-300 font-mono text-[10px]">CLAUDE.md</code> to
                auto-populate your memory graph.
              </p>
              <Link
                to="/import"
                className="mt-3 inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 font-medium"
              >
                Import now <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showModal && <MemoryModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
