'use client';
import { useEffect } from 'react';

/** Removes the 'dark' class from <html> while this component is mounted.
 *  Used on the public landing page so the app theme doesn't bleed in. */
export function ForceLightMode() {
  useEffect(() => {
    const el = document.documentElement;
    const had = el.classList.contains('dark');
    el.classList.remove('dark');
    return () => { if (had) el.classList.add('dark'); };
  }, []);
  return null;
}
