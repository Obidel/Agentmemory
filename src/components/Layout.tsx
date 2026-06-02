import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Brain, Search, Network, Upload, Download, BookTemplate,
  ChevronDown, Plus, Settings, Menu, X, LogIn, LogOut,
  RefreshCw, Folder, Sparkles
} from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { cn } from '../utils/cn';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Brain },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/graph', label: 'Memory Graph', icon: Network },
  { path: '/import', label: 'Import', icon: Upload },
  { path: '/export', label: 'Export', icon: Download },
  { path: '/templates', label: 'Templates', icon: BookTemplate },
  { path: '/backfill', label: 'Backfill', icon: Sparkles, cloudOnly: true },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentUser, projects, activeProject, setActiveProject, addProject, memories, isCloud, syncing, lastSyncedAt, pullFromCloud, setCloudUser } = useMemoryStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [addingProject, setAddingProject] = useState(false);

  const isLandingPage = location.pathname === '/landing';

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      addProject(newProjectName.trim());
      setNewProjectName('');
      setAddingProject(false);
      setProjectDropdownOpen(false);
    }
  };

  const planBadge = isCloud
    ? { label: 'Cloud', gradient: 'from-cyan-500/20 to-indigo-500/20 text-cyan-200 border-cyan-400/30' }
    : { label: 'MIT',   gradient: 'from-slate-500/20 to-slate-600/20 text-slate-300 border-slate-500/30' };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setCloudUser(null);
  };

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen text-gray-100">
      {/* Global neural background */}
      <div className="mesh-bg" />
      <div className="mesh-blob-3" />
      <div className="grid-overlay" />
      <div className="noise-overlay" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating Sidebar (glass) */}
      <aside className={cn(
        'fixed lg:fixed inset-y-4 left-4 z-40 w-72 glass rounded-2xl flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/40">
            <Brain size={18} className="text-white" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 blur-md opacity-50 -z-10" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-0.5">
              <span className="font-bold text-white text-sm tracking-tight">AgentMemory</span>
              <span className="text-gradient-static font-bold text-sm">.fyi</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Synced</span>
            </div>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="neural-line mx-5" />

        {/* Project Selector */}
        <div className="px-5 py-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Active Project</div>
          <div className="relative">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="w-full group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl glass glass-hover text-sm text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                <Folder size={12} className="text-violet-300" />
              </div>
              <span className="truncate text-gray-100 flex-1 font-medium">{activeProject}</span>
              <ChevronDown size={14} className={cn('text-gray-400 transition-transform duration-300', projectDropdownOpen && 'rotate-180')} />
            </button>
            {projectDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl z-50 overflow-hidden animate-scale-in">
                <div className="p-1.5 max-h-60 overflow-y-auto">
                  {projects.map(p => (
                    <button
                      key={p}
                      onClick={() => { setActiveProject(p); setProjectDropdownOpen(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-sm text-left rounded-lg transition-all flex items-center gap-2',
                        p === activeProject
                          ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-white border border-violet-500/20'
                          : 'text-gray-300 hover:bg-white/5'
                      )}
                    >
                      <Folder size={12} />
                      {p}
                      <span className="ml-auto text-[10px] font-mono text-gray-500">
                        {memories.filter(m => m.project_name === p).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/5 p-1.5">
                  {addingProject ? (
                    <div className="p-1.5 flex gap-1.5">
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                        placeholder="Project name..."
                        className="flex-1 px-2.5 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                        autoFocus
                      />
                      <button onClick={handleAddProject} className="px-3 py-1.5 btn-primary text-xs">
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingProject(true)}
                      className="w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus size={12} />
                      New Project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2 px-3">Navigation</div>
          {NAV_ITEMS.map(({ path, label, icon: Icon, cloudOnly }) => {
            if (cloudOnly && !isCloud) return null;
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 border border-violet-500/30" />
                )}
                <Icon size={16} className={cn('relative z-10', isActive ? 'text-violet-300' : '')} />
                <span className="relative z-10">{label}</span>
                {isActive && (
                  <div className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Memory counter + support CTA */}
        <div className="px-3 py-3">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Status</span>
              <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-r border', planBadge.gradient)}>
                {planBadge.label}
              </span>
            </div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-2xl font-bold text-white">{memories.length}</div>
                <div className="text-[10px] text-gray-500">memories stored</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">unlimited</div>
              </div>
            </div>
            <Link
              to="/support"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:from-pink-500/30 hover:to-violet-500/30 border border-pink-500/30 text-pink-200 transition-colors"
            >
              ♥ Support
            </Link>
          </div>
        </div>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/5">
          {supabaseEnabled && !isCloud ? (
            <Link
              to="/auth"
              className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/30 text-cyan-200 transition-colors"
            >
              <LogIn size={13} /> Sign in to sync across devices
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white">
                {currentUser.name.charAt(0)}
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a1a]',
                  syncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500 truncate font-mono">
                  {isCloud && lastSyncedAt
                    ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                    : isCloud ? 'Cloud' : 'Local'}
                </p>
              </div>
              {isCloud ? (
                <>
                  <button
                    onClick={() => void pullFromCloud()}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                    title="Sync now"
                  >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </>
              ) : (
                <button className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5">
                  <Settings size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-[304px] min-h-screen flex flex-col">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="glass p-2 rounded-xl text-gray-200">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Brain size={13} className="text-white" />
            </div>
            <span className="font-bold text-sm text-white">AgentMemory<span className="text-gradient-static">.fyi</span></span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
