import { Link } from 'react-router-dom';
import {
  Brain, Network, Search, Upload, Download, BookTemplate,
  Zap, ArrowRight, Check, Sparkles, ArrowUpRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-gray-100 overflow-x-hidden">
      {/* Neural background */}
      <div className="mesh-bg" />
      <div className="mesh-blob-3" />
      <div className="grid-overlay" />
      <div className="noise-overlay" />

      {/* Navbar */}
      <nav className="fixed top-4 left-4 right-4 z-50 animate-fade-in">
        <div className="max-w-6xl mx-auto glass rounded-2xl px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/40">
              <Brain size={15} className="text-white" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 blur-md opacity-50 -z-10" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">AgentMemory<span className="text-gradient-static">.fyi</span></span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="https://github.com" className="hover:text-white transition-colors flex items-center gap-1">
              GitHub <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              Open App
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-24">
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full text-xs text-gray-300 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono uppercase tracking-widest">MCP-Ready</span>
            <span className="text-gray-600">·</span>
            <span>Works in Claude, Cursor, Cline, Continue</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.05]">
            <span className="text-white">Memory for</span>
            <br />
            <span className="text-gradient">AI Agents</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A visual memory layer that keeps your AI coding agents
            <span className="text-white"> consistent across sessions, projects, and tools.</span>
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/"
              className="btn-primary text-base flex items-center gap-2 px-6 py-3.5"
            >
              <Sparkles size={16} />
              Try the Demo
              <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="btn-ghost text-base flex items-center gap-2 px-5 py-3.5"
            >
              See Features
            </a>
          </div>

          {/* Agent pills */}
          <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
            {[
              { name: 'Claude Code', logo: '✦' },
              { name: 'Cursor', logo: '◈' },
              { name: 'Cline', logo: '◆' },
              { name: 'Continue', logo: '◉' },
              { name: 'Windsurf', logo: '✧' },
            ].map(agent => (
              <div key={agent.name} className="glass px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-1.5">
                <span className="text-violet-300">{agent.logo}</span>
                {agent.name}
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative max-w-6xl mx-auto px-6 mt-20">
          <div className="relative glass-strong rounded-3xl overflow-hidden">
            {/* Browser bar */}
            <div className="h-10 px-4 border-b border-white/5 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              <div className="ml-3 flex-1 max-w-md h-5 bg-white/5 rounded-md flex items-center px-3">
                <span className="text-[10px] text-gray-500 font-mono">agentmemory.fyi/#/graph</span>
              </div>
            </div>

            {/* Faux graph UI */}
            <div className="relative h-[420px] bg-gradient-to-br from-violet-950/30 via-transparent to-fuchsia-950/20">
              {/* Central node */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="relative w-28 h-28 rounded-2xl glass-strong flex flex-col items-center justify-center glow-pulse">
                  <Brain size={28} className="text-violet-300 mb-1" />
                  <div className="text-[10px] text-gray-300 font-mono">TypeScript</div>
                  <div className="text-[9px] text-violet-300 font-mono">★5</div>
                </div>
              </div>

              {/* Orbiting nodes */}
              {[
                { x: '15%', y: '20%', label: 'Tailwind', color: 'from-cyan-500/30 to-cyan-500/10', text: 'text-cyan-200' },
                { x: '75%', y: '15%', label: 'Zustand', color: 'from-fuchsia-500/30 to-fuchsia-500/10', text: 'text-fuchsia-200' },
                { x: '85%', y: '60%', label: 'NextAuth', color: 'from-amber-500/30 to-amber-500/10', text: 'text-amber-200' },
                { x: '20%', y: '75%', label: 'Supabase', color: 'from-emerald-500/30 to-emerald-500/10', text: 'text-emerald-200' },
                { x: '70%', y: '85%', label: 'React Query', color: 'from-pink-500/30 to-pink-500/10', text: 'text-pink-200' },
              ].map((node, i) => (
                <div
                  key={i}
                  className={`absolute glass rounded-xl px-3 py-2 ${node.text}`}
                  style={{ left: node.x, top: node.y }}
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${node.color} -z-10`} />
                  <div className="text-[10px] font-mono">{node.label}</div>
                </div>
              ))}

              {/* SVG lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[
                  'M 15% 20% L 50% 50%',
                  'M 75% 15% L 50% 50%',
                  'M 85% 60% L 50% 50%',
                  'M 20% 75% L 50% 50%',
                  'M 70% 85% L 50% 50%',
                ].map((d, i) => (
                  <path
                    key={i}
                    d={d.replace(/(\d+)%/g, (_, n) => `${n}%`)}
                    stroke="url(#line-gradient)"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.6"
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-4">
              Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything for <span className="text-gradient">agent memory</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              From import to insight — built for developers working with AI agents daily.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Network,    title: 'Visual Memory Graph',     desc: 'Force-directed graph showing relationships between rules. Node size = importance, colors = category.', accent: 'violet' },
              { icon: Search,     title: 'Semantic Search',         desc: 'Find memories by meaning, not keywords. Similarity-based ranking with confidence scores.',     accent: 'cyan' },
              { icon: Upload,     title: 'Smart Import',            desc: 'Import .cursorrules, CLAUDE.md, GitHub repos. Auto-categorize with embeddings.',                 accent: 'fuchsia' },
              { icon: Download,   title: 'Multi-format Export',     desc: 'Export to CLAUDE.md, .cursorrules, MemGPT JSON, or shareable URLs.',                              accent: 'emerald' },
              { icon: BookTemplate, title: 'Role Templates',        desc: 'Curated templates for React, DevOps, Python, ML, and freelancer workflows.',                     accent: 'amber' },
              { icon: Zap,        title: 'Auto Relations',          desc: 'Automatically discovers semantic relationships using cosine similarity.',                       accent: 'pink' },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="group relative glass rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-11 h-11 rounded-xl glass flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon size={20} className="text-violet-300" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight size={16} className="text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-4">
              Workflow
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              From chaos to <span className="text-gradient">context</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              { step: '01', title: 'Import your rules',      desc: 'Upload .cursorrules, CLAUDE.md, or paste text. Our parser extracts and categorizes each rule.', icon: Upload },
              { step: '02', title: 'Explore the graph',      desc: 'Watch memories form a living knowledge graph. Click nodes to dive into details.',                 icon: Network },
              { step: '03', title: 'Search semantically',    desc: 'Ask "what are my database rules?" and get ranked results by meaning, not just keywords.',         icon: Search },
              { step: '04', title: 'Export to any agent',    desc: 'Download as CLAUDE.md, .cursorrules, or JSON. Your memory, any format.',                            icon: Download },
            ].map((step) => (
              <div key={step.step} className="glass rounded-2xl p-5 flex gap-5 items-center hover:border-violet-500/30 transition-colors">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/30 flex items-center justify-center">
                  <step.icon size={20} className="text-violet-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-mono text-violet-400 font-bold tracking-widest">STEP {step.step}</span>
                    <span className="text-gray-700">·</span>
                    <h3 className="text-base font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-4">
              Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Start free, <span className="text-gradient">scale later</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Free', price: '$0',  period: 'forever',     features: ['50 memories', '1 project', 'All export formats', 'Semantic search', 'Graph visualization'], cta: 'Start Free', highlight: false },
              { name: 'Solo', price: '$10', period: 'per month',   features: ['Unlimited memories', '5 projects', 'GitHub Sync', 'Real embeddings', 'Priority support'], cta: 'Get Solo', highlight: true },
              { name: 'Team', price: '$25', period: 'per month',   features: ['Everything in Solo', 'Unlimited projects', 'Team sharing', 'API access', 'Admin dashboard'], cta: 'Get Team', highlight: false },
            ].map(plan => (
              <div
                key={plan.name}
                className={`relative glass rounded-2xl p-6 transition-all hover:-translate-y-1 ${
                  plan.highlight ? 'border-violet-500/40 ring-1 ring-violet-500/20' : ''
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 btn-primary text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full">
                    ✦ Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-3">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-500 text-sm">/{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center mt-0.5">
                        <Check size={10} className="text-violet-300" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/"
                  className={`block text-center py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    plan.highlight
                      ? 'btn-primary'
                      : 'btn-ghost'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative glass-strong rounded-3xl p-12 overflow-hidden">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-violet-500/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-fuchsia-500/30 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/40">
                <Brain size={26} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Give your agents<br /><span className="text-gradient">a real memory</span>
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Join developers building context-aware AI workflows. 50 memories free, forever.
              </p>
              <Link
                to="/"
                className="btn-primary text-base inline-flex items-center gap-2 px-7 py-3.5"
              >
                <Sparkles size={16} />
                Start Building
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Brain size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">AgentMemory<span className="text-gradient-static">.fyi</span></span>
          </div>
          <p className="text-xs text-gray-600 font-mono">© 2026 · Built for AI-native developers</p>
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
