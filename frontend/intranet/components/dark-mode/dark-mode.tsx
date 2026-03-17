'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

function getSystemPrefersDark() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const applyTheme = (dark: boolean, persist = true) => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    if (persist) localStorage.setItem('theme', dark ? 'dark' : 'light');
    setIsDark(dark);
  };

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const initialDark = saved ? saved === 'dark' : getSystemPrefersDark();
    applyTheme(initialDark, false);
    setMounted(true);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const hasSaved = localStorage.getItem('theme');
      if (!hasSaved) applyTheme(e.matches, false);
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => applyTheme(!isDark)}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm
                 border-gray-300 bg-white hover:bg-gray-50
                 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700
                 transition"
      title={isDark ? 'Tema escuro ativado' : 'Tema claro ativado'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? 'Claro' : 'Escuro'}</span>
    </button>
  );
}
