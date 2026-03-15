'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark-neon' | 'ocean' | 'forest' | 'sunset' | 'midnight';

export const THEMES: { id: Theme; label: string; description: string; maxOnly: boolean; colors: string[] }[] = [
  { id: 'light', label: 'Light', description: 'Clean and bright', maxOnly: false, colors: ['#ffffff', '#f1f5f9', '#3b82f6'] },
  { id: 'dark-neon', label: 'Dark Neon', description: 'Dark with vibrant accents', maxOnly: false, colors: ['#0f172a', '#1e293b', '#818cf8'] },
  { id: 'ocean', label: 'Ocean Blue', description: 'Deep sea vibes', maxOnly: true, colors: ['#0c1929', '#132f4c', '#29b6f6'] },
  { id: 'forest', label: 'Forest Green', description: 'Natural and calm', maxOnly: true, colors: ['#0d1f12', '#1a3a22', '#4caf50'] },
  { id: 'sunset', label: 'Sunset Warm', description: 'Warm golden tones', maxOnly: true, colors: ['#1a1209', '#2d1f0e', '#f59e0b'] },
  { id: 'midnight', label: 'Midnight Purple', description: 'Deep and elegant', maxOnly: true, colors: ['#110c24', '#1e1541', '#a78bfa'] },
];

const DARK_THEMES: Theme[] = ['dark-neon', 'ocean', 'forest', 'sunset', 'midnight'];

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: 'light', setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('medstudy-theme') as Theme | null;
    if (saved && THEMES.some(t => t.id === saved)) {
      setThemeState(saved);
      applyTheme(saved);
    }
    setMounted(true);
  }, []);

  function applyTheme(t: Theme) {
    const el = document.documentElement;
    // Remove all theme classes
    THEMES.forEach(th => el.classList.remove(`theme-${th.id}`));
    if (DARK_THEMES.includes(t)) {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }
    if (t !== 'light' && t !== 'dark-neon') {
      el.classList.add(`theme-${t}`);
    }
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('medstudy-theme', t);
    applyTheme(t);
  }

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
