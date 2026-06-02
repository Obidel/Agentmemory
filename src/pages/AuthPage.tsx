import { useState, FormEvent } from 'react';
import { Brain, Mail, ArrowRight, CheckCircle2, Heart } from 'lucide-react';
import { supabase, supabaseEnabled } from '../lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h1 className="text-2xl font-bold text-white mb-2">Cloud sync not configured</h1>
          <p className="text-gray-400 mb-6">
            Set <code className="text-indigo-300">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-indigo-300">VITE_SUPABASE_ANON_KEY</code> in your environment to enable cloud sync.
            The app still works in fully local mode.
          </p>
          <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to local app</a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + '/',
      },
    });
    setSending(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handleGithub() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/' },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Brain className="w-7 h-7 text-indigo-400" />
          <span className="text-xl font-bold text-white">AgentMemory</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-gray-400 text-sm">
                We sent a magic link to <span className="text-white">{email}</span>.
                Click it to sign in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm"
              >
                ← Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
              <p className="text-gray-400 text-sm mb-6">
                Sync your memories across devices and access them from any AI agent.
              </p>

              <button
                onClick={handleGithub}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors mb-4"
              >
                <span className="text-base">⌥</span>
                Continue with GitHub
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-gray-500">OR</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <form onSubmit={handleSubmit}>
                <label className="block text-xs font-medium text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-xs text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {sending ? 'Sending…' : (<>Send magic link <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-gray-500">
                Free forever. No password to remember.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://dalink.to/agentmemory"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-pink-400 transition-colors"
          >
            <Heart className="w-3 h-3" />
            AgentMemory is free &amp; open source. Support the project
          </a>
        </div>
      </div>
    </div>
  );
}
