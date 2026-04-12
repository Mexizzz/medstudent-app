'use client';
import { useEffect } from 'react';

/**
 * Keeps <html> in light mode while mounted.
 * Uses a MutationObserver so it wins the race against ThemeProvider,
 * which runs its useEffect after children (bottom-up order in React).
 */
export function ForceLightMode() {
  useEffect(() => {
    const el = document.documentElement;
    const hadDark = el.classList.contains('dark');

    el.classList.remove('dark');

    const observer = new MutationObserver(() => {
      if (el.classList.contains('dark')) el.classList.remove('dark');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (hadDark) el.classList.add('dark');
    };
  }, []);
  return null;
}
