import { useState } from 'react';
import { Check, Sparkles, Loader2, ExternalLink, AlertCircle, Key } from 'lucide-react';
import { PLANS, getPlan } from '../utils/planConfig';
import { useMemoryStore } from '../store/memoryStore';
import { cn } from '../utils/cn';
import { PlanType } from '../types';

export default function PricingPage() {
  const { currentUser, setLicense } = useMemoryStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [licenseInput, setLicenseInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const startCheckout = async (planId: PlanType) => {
    if (planId === 'free') return;
    setError(null);
    setLoading(planId);
    try {
      const res = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, email: currentUser.email }),
      });
      if (!res.ok) {
        // In dev (no backend), fall back to a placeholder URL
        const plan = getPlan(planId);
        const url = `https://polar.sh/agentmemory/checkout?product_id=${plan.polarProductId}&email=${encodeURIComponent(currentUser.email)}`;
        window.open(url, '_blank');
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      // Dev fallback
      const plan = getPlan(planId);
      const url = `https://polar.sh/agentmemory/checkout?product_id=${plan.polarProductId}&email=${encodeURIComponent(currentUser.email)}`;
      window.open(url, '_blank');
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    try {
      const res = await fetch('/api/polar/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        window.open('https://polar.sh/agentmemory/portal', '_blank');
      }
    } catch {
      window.open('https://polar.sh/agentmemory/portal', '_blank');
    }
  };

  const activateLicense = async () => {
    if (!licenseInput.trim()) return;
    setError(null);
    setVerifying(true);
    try {
      // Web app calls the hosted Vercel API route. The server holds the
      // signing secret; the browser never sees it.
      const res = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: licenseInput.trim() }),
      });
      const v = await res.json() as { valid: boolean; plan: 'free' | 'solo' | 'team'; reason?: string };
      if (v.valid) {
        setLicense(licenseInput.trim(), v.plan);
        setLicenseInput('');
      } else {
        setError(`License rejected: ${v.reason ?? 'unknown'}. If you just bought a subscription, the activation email can take ~30s.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-4">
          <Sparkles size={11} className="text-violet-400" />
          Open Core
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Free forever, <span className="text-gradient">pay for cloud</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">
          The MCP server, web app, and all core features are MIT-licensed and free.
          Cloud sync, real embeddings, and team collaboration are optional.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const isCurrent = currentUser.plan === plan.id;
          const cta = plan.id === 'free' ? 'Current plan' : isCurrent ? 'Manage' : `Upgrade to ${plan.name}`;
          return (
            <div
              key={plan.id}
              className={cn(
                'relative glass rounded-2xl p-6 transition-all',
                plan.highlight && 'border-violet-500/40 ring-1 ring-violet-500/20',
                isCurrent && 'border-emerald-500/40 ring-1 ring-emerald-500/20'
              )}
            >
              {plan.highlight && currentUser.plan === 'free' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 btn-primary text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full">
                  ✦ Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full">
                  ✓ Active
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-500 text-sm">
                    /{plan.period === 'month' ? 'month' : 'forever'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>
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

              <button
                onClick={() => isCurrent && plan.id !== 'free' ? openPortal() : startCheckout(plan.id)}
                disabled={isCurrent && plan.id === 'free'}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isCurrent && plan.id === 'free'
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : plan.highlight
                    ? 'btn-primary'
                    : 'btn-ghost'
                )}
              >
                {loading === plan.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : plan.id !== 'free' && !isCurrent ? (
                  <ExternalLink size={13} />
                ) : null}
                {cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* License activation */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
          <Key size={15} className="text-amber-400" />
          Have a license key?
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          After purchase, Polar emails you a license key. Paste it here to unlock your plan.
        </p>
        <div className="flex gap-2">
          <input
            value={licenseInput}
            onChange={e => setLicenseInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && activateLicense()}
            placeholder="AM-SOLO-XXXX-XXXX-XXXX..."
            className="flex-1 px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
          <button
            onClick={activateLicense}
            disabled={!licenseInput.trim() || verifying}
            className="btn-primary px-5 text-sm flex items-center gap-2"
          >
            {verifying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={13} />}
            Activate
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Open-source callout */}
      <div className="glass rounded-2xl p-6 border-violet-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-violet-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1">Why open core?</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              The local MCP server, web UI, and all export formats are MIT-licensed. You can
              self-host, fork, or run offline forever. Cloud sync and team features are
              hosted services we charge for — your code and your data, your choice.
              <a href="https://github.com/agentmemory" className="text-violet-300 hover:text-violet-200 ml-1 inline-flex items-center gap-1">
                Star on GitHub <ExternalLink size={11} />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">FAQ</h3>
        {[
          { q: 'Is the local MCP server really free?', a: 'Yes, MIT-licensed. No telemetry, no phone-home, no usage limits beyond the in-memory 50-memory free tier for newcomers.' },
          { q: 'What does my subscription pay for?', a: 'Hosted cloud sync (Supabase + pgvector), real AI embeddings, CDN, and the team dashboard. The codebase is identical to the open-source release.' },
          { q: 'Can I switch from Solo to Team?', a: 'Yes — upgrades are prorated. Manage from the customer portal or contact support@agentmemory.fyi.' },
          { q: 'Do you offer refunds?', a: 'Yes, within 14 days, no questions asked. Managed by Polar.sh.' },
        ].map(item => (
          <details key={item.q} className="glass rounded-xl px-5 py-3 group">
            <summary className="cursor-pointer text-sm text-white font-medium flex items-center justify-between">
              {item.q}
              <span className="text-gray-500 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
