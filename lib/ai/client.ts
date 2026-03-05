import Groq from 'groq-sdk';

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Primary model — Llama 3.3 70B is Groq's most capable for medical reasoning
export const MODEL = 'llama-3.3-70b-versatile';
// Fallback model — separate daily token budget (500K/day vs 100K/day)
export const FALLBACK_MODEL = 'llama-3.1-8b-instant';
