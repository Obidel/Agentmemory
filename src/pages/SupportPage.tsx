import { Heart, Coffee, Sparkles, Star, ExternalLink, Users, Code2, GitBranch } from 'lucide-react';

// DonationAlerts direct link — replace with your own page
const DONATION_URL = 'https://www.donationalerts.com/r/obidel';

const SPONSOR_TIERS = [
  {
    icon: Coffee,
    name: 'Buy me a coffee',
    amount: '$5',
    description: 'A small tip to keep the lights on.',
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  {
    icon: Heart,
    name: 'Backer',
    amount: '$25',
    description: 'Helps fund server costs and tooling.',
    accent: 'from-pink-500/20 to-fuchsia-500/10',
    highlight: true,
  },
  {
    icon: Sparkles,
    name: 'Patron',
    amount: '$100',
    description: 'Major support. Your name in the README sponsors list.',
    accent: 'from-violet-500/20 to-cyan-500/10',
  },
  {
    icon: Star,
    name: 'Sponsor',
    amount: 'Custom',
    description: 'For companies or individuals who want to support long-term.',
    accent: 'from-cyan-500/20 to-violet-500/10',
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-12 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-4">
          <Heart size={11} className="text-pink-400" />
          100% Free Forever
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Support <span className="text-gradient">AgentMemory</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">
          AgentMemory is free, MIT-licensed, and will always stay that way.
          If it saves you time, consider a donation to fund development.
        </p>
      </div>

      {/* Main donate CTA */}
      <div className="relative glass-strong rounded-3xl p-10 text-center overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-pink-500/40">
            <Heart size={28} className="text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            One-time or recurring support
          </h2>
          <p className="text-gray-400 mb-7 max-w-md mx-auto">
            All donations are processed via DonationAlerts.
            100% goes to development, hosting, and coffee.
          </p>
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-2xl text-base hover:scale-[1.02] transition-all shadow-lg shadow-pink-500/30"
          >
            <Heart size={18} fill="currentColor" />
            Donate on DonationAlerts
            <ExternalLink size={16} />
          </a>
          <p className="text-xs text-gray-600 mt-4">
            Cards · SBP · YooMoney · crypto · 100+ methods
          </p>
        </div>
      </div>

      {/* Sponsor tiers */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-5 text-center">Sponsor tiers</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPONSOR_TIERS.map(tier => (
            <a
              key={tier.name}
              href={DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative glass rounded-2xl p-5 hover:-translate-y-1 transition-all group ${
                tier.highlight ? 'border-pink-500/40 ring-1 ring-pink-500/20' : ''
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full">
                  ♥ Most popular
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.accent} border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <tier.icon size={18} className="text-white" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">{tier.name}</h4>
              <p className="text-2xl font-bold text-gradient-static mb-2">{tier.amount}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{tier.description}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Other ways to help */}
      <div className="grid md:grid-cols-3 gap-4">
        <a
          href="https://github.com/Obidel/Agentmemory"
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-2xl p-5 hover:-translate-y-1 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Star size={18} className="text-violet-300" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Star on GitHub</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Free and helps with discoverability. The best $0 donation.
          </p>
        </a>

        <a
          href="https://github.com/Obidel/Agentmemory/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-2xl p-5 hover:-translate-y-1 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Code2 size={18} className="text-cyan-300" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Contribute code</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Open issues, send PRs, improve docs. All contributions welcome.
          </p>
        </a>

        <a
          href="https://github.com/Obidel/Agentmemory/fork"
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-2xl p-5 hover:-translate-y-1 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <GitBranch size={18} className="text-emerald-300" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Spread the word</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Tweet, blog, or tell a coworker. Organic growth matters most.
          </p>
        </a>
      </div>

      {/* Why donations matter */}
      <div className="glass rounded-2xl p-6 border-violet-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-violet-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1">Where the money goes</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Server costs, domain renewal, occasional freelance help for
              features I can't build alone (e.g. real embeddings, mobile
              app). No salaries, no investors, no paywall. The roadmap
              stays public and the code stays MIT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
