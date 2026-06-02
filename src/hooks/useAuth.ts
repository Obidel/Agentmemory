import { useEffect } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { useMemoryStore } from '../store/memoryStore';
import { getCloudUser } from '../lib/cloudSync';
import type { User } from '../types';

/**
 * Wires Supabase auth state to the memory store:
 *  - on sign-in: set cloud user, pull all memories from cloud
 *  - on sign-out: revert to local-only demo user
 */
export function useAuth(): { ready: boolean; user: User | null } {
  const setCloudUser = useMemoryStore(s => s.setCloudUser);
  const pullFromCloud = useMemoryStore(s => s.pullFromCloud);
  const currentUser = useMemoryStore(s => s.currentUser);
  const isCloud = useMemoryStore(s => s.isCloud);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;

    let mounted = true;

    (async () => {
      const sbUser = await getCloudUser();
      if (!mounted || !sbUser) return;
      setCloudUser({
        id: sbUser.id,
        email: sbUser.email ?? '',
        name: (sbUser.user_metadata?.display_name as string) || (sbUser.email?.split('@')[0] ?? 'user'),
        plan: 'free',
        memory_count: 0,
        project_count: 0,
      });
      await pullFromCloud();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sbUser = session?.user ?? null;
      if (sbUser) {
        setCloudUser({
          id: sbUser.id,
          email: sbUser.email ?? '',
          name: (sbUser.user_metadata?.display_name as string) || (sbUser.email?.split('@')[0] ?? 'user'),
          plan: 'free',
          memory_count: 0,
          project_count: 0,
        });
        await pullFromCloud();
      } else {
        setCloudUser(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready: true, user: isCloud ? currentUser : null };
}
