import { useEffect, useState, useCallback } from 'react';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'agentmemory-theme';

function readStored(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    // localStorage may be unavailable (e.g. SSR-like sandboxes)
  }
  return 'dark';
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Tailwind v4 dark variant selector — keep in sync for any future dark: classes
  root.classList.toggle('dark', theme === 'dark');
}

let listeners: Array<(t: Theme) => void> = [];
let current: Theme = 'dark';
let initialised = false;

function ensureInit(): void {
  if (initialised) return;
  initialised = true;
  current = readStored();
  apply(current);
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  ensureInit();
  const [theme, setThemeState] = useState<Theme>(current);

  useEffect(() => {
    const handler = (t: Theme) => setThemeState(t);
    listeners.push(handler);
    setThemeState(current);
    return () => {
      listeners = listeners.filter(l => l !== handler);
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    current = t;
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
    apply(t);
    listeners.forEach(l => l(t));
  }, []);

  const toggle = useCallback(() => {
    setTheme(current === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggle };
}

export function getTheme(): Theme {
  ensureInit();
  return current;
}
