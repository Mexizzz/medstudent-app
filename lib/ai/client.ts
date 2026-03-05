import Groq from 'groq-sdk';

let _groq: Groq | null = null;
export function getGroq() {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  }
  return _groq;
}

// Backwards-compatible lazy proxy
export const groq = new Proxy({} as Groq, {
  get(_target, prop) {
    return (getGroq() as any)[prop];
  },
});

// Primary model — Llama 3.3 70B is Groq's most capable for medical reasoning
export const MODEL = 'llama-3.3-70b-versatile';
// Fallback model — separate daily token budget (500K/day vs 100K/day)
export const FALLBACK_MODEL = 'llama-3.1-8b-instant';
