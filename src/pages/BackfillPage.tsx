import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Play, RefreshCw, AlertTriangle, CheckCircle2,
  Database, Zap, Clock, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { callMcpTool, extractText, mcpEnabled } from '../lib/mcpClient';
import { useMemoryStore } from '../store/memoryStore';
import { supabase } from '../lib/supabase';

interface BackfillResult {
  scanned: number;
  embedded: number;
  failed: number;
  remaining: number;
  rateLimited: boolean;
  resetAt: string | null;
}

const BATCH = 64;
const MAX_ROUNDS = 50;

function parseBackfillText(text: string): Partial<BackfillResult> {
  const out: Partial<BackfillResult> = {};
  const get = (label: string) => {
    const m = text.match(new RegExp(`${label}:\\s+(\\S+)`));
    return m ? m[1] : undefined;
  };
  if (text.includes('No memories without embeddings')) {
    return { scanned: 0, embedded: 0, failed: 0, remaining: 0, rateLimited: false, resetAt: null };
  }
  const scanned = get('Scanned');
  if (scanned) out.scanned = parseInt(scanned, 10);
  const embedded = get('Embedded');
  if (embedded) out.embedded = parseInt(embedded, 10);
  const failed = get('Failed');
  if (failed) out.failed = parseInt(failed, 10);
  const remaining = get('Remaining');
  if (remaining) out.remaining = parseInt(remaining, 10);
  out.rateLimited = text.includes('Rate limit reached');
  const resetMatch = text.match(/Resets at (\S+)/);
  out.resetAt = resetMatch ? resetMatch[1] : null;
  return out;
}

export default function BackfillPage() {
  const { currentUser, isCloud } = useMemoryStore();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [cumulativeEmbedded, setCumulativeEmbedded] = useState(0);
  const [cumulativeFailed, setCumulativeFailed] = useState(0);
  const [lastResult, setLastResult] = useState<BackfillResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!mcpEnabled() || !supabase) { setSignedIn(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
  }, []);

  const runOneRound = useCallback(async (): Promise<BackfillResult | null> => {
    try {
      const res = await callMcpTool('backfill_embeddings', { limit: BATCH });
      const { text, isError } = extractText(res);
      if (isError) {
        setError(text);
        return null;
      }
      setError(null);
      const parsed = parseBackfillText(text);
      const result: BackfillResult = {
        scanned: parsed.scanned ?? 0,
        embedded: parsed.embedded ?? 0,
        failed: parsed.failed ?? 0,
        remaining: parsed.remaining ?? 0,
        rateLimited: parsed.rateLimited ?? false,
        resetAt: parsed.resetAt ?? null,
      };
      setLastResult(result);
      setCumulativeEmbedded(c => c + result.embedded);
      setCumulativeFailed(c => c + result.failed);
      setRounds(r => r + 1);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  const start = useCallback(async () => {
    cancelled.current = false;
    setRunning(true);
    setRounds(0);
    setCumulativeEmbedded(0);
    setCumulativeFailed(0);
    setLastResult(null);
    setError(null);
    setFinished(false);

    for (let i = 0; i < MAX_ROUNDS; i++) {
      if (cancelled.current) break;
      const r = await runOneRound();
      if (!r) break;
      if (r.remaining === 0) { setFinished(true); break; }
      if (r.rateLimited) { setFinished(true); break; }
      if (r.scanned === 0) { setFinished(true); break; }
    }
    setRunning(false);
  }, [runOneRound]);

  const stop = useCallback(() => {
    cancelled.current = true;
    setRunning(false);
  }, []);

  const notSignedIn = signedIn === false || !currentUser;
  const isCloudOk = isCloud && currentUser;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4"
      >
        <ArrowLeft size={12} /> Back to Dashboard
      </Link>

      <div className="glass rounded-2xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Sparkles className="text-violet-300" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Backfill Embeddings</h1>
            <p className="text-sm text-gray-400 mt-1">
              Generate pgvector embeddings for cloud-synced memories that were created
              before the embedder was enabled. Each round embeds up to 64 memories and
              stops automatically when none are left.
            </p>
          </div>
        </div>

        {!mcpEnabled() && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="text-amber-300 flex-shrink-0" size={18} />
            <div className="text-sm text-amber-100">
              <strong>Supabase is not configured.</strong> Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> in <code className="font-mono text-xs">.env</code>{' '}
              and rebuild to use this page.
            </div>
          </div>
        )}

        {mcpEnabled() && notSignedIn && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="text-amber-300 flex-shrink-0" size={18} />
            <div className="text-sm text-amber-100">
              You are not signed in. <Link to="/auth" className="underline">Sign in</Link> first,
              then return to this page. Backfill only works on the cloud backend.
            </div>
          </div>
        )}

        {isCloudOk && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard icon={Database} label="Rounds" value={rounds.toString()} />
              <StatCard icon={Zap} label="Embedded" value={cumulativeEmbedded.toString()} accent="text-emerald-300" />
              <StatCard icon={AlertTriangle} label="Failed" value={cumulativeFailed.toString()} accent={cumulativeFailed > 0 ? 'text-rose-300' : undefined} />
              <StatCard
                icon={Clock}
                label="Remaining"
                value={lastResult ? lastResult.remaining.toString() : '?'}
                accent={lastResult && lastResult.remaining > 0 ? 'text-violet-300' : 'text-emerald-300'}
              />
            </div>

            {lastResult && lastResult.rateLimited && (
              <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <AlertTriangle className="text-rose-300 flex-shrink-0" size={18} />
                <div className="text-sm text-rose-100">
                  <strong>Rate limit hit.</strong> Hourly quota exhausted.{' '}
                  {lastResult.resetAt && <>Resets at <code className="font-mono text-xs">{lastResult.resetAt}</code>. </>}
                  Re-run this tool after the reset to continue.
                </div>
              </div>
            )}

            {finished && lastResult && !lastResult.rateLimited && lastResult.remaining === 0 && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="text-emerald-300 flex-shrink-0" size={18} />
                <div className="text-sm text-emerald-100">
                  <strong>All caught up.</strong> Every memory has an embedding. Semantic search is now active for the full dataset.
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <AlertTriangle className="text-rose-300 flex-shrink-0" size={18} />
                <div className="text-sm text-rose-100 font-mono whitespace-pre-wrap">{error}</div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {!running ? (
                <button
                  onClick={start}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-medium flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20"
                >
                  <Play size={16} /> Start backfill
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="px-5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 font-medium flex items-center gap-2 transition-all"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => runOneRound()}
                disabled={running}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 font-medium flex items-center gap-2 transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} /> Run one round
              </button>
              <div className="text-xs text-gray-500 ml-auto">
                Batch size: {BATCH} • Max rounds: {MAX_ROUNDS}
              </div>
            </div>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-xs text-gray-500 space-y-1.5">
          <div>• Each round embeds up to 64 memories and respects the per-user hourly rate limit (default 100 calls/hr).</div>
          <div>• The tool stops automatically when <code className="font-mono text-gray-400">remaining = 0</code> or the rate limit is hit.</div>
          <div>• If the loop stops on rate limit, wait for the reset and re-run — progress is persisted.</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Sparkles; label: string; value: string; accent?: string }) {
  return (
    <div className="glass rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">
        <Icon size={11} /> {label}
      </div>
      <div className={`text-2xl font-bold ${accent ?? 'text-white'}`}>{value}</div>
    </div>
  );
}
