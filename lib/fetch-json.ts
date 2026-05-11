/**
 * Safely parse a fetch Response as JSON.
 *
 * Why this exists: when the server times out, gets killed mid-response, or
 * the AI provider cascade fails, the runtime sometimes returns 500 with an
 * empty body. `res.json()` then blows up with "Unexpected end of JSON input"
 * — a confusing error that surfaces as a cryptic toast to the user.
 *
 * This helper:
 *   - Reads the body as text first, so empty bodies don't throw at parse time.
 *   - Returns a structured result the caller can branch on (ok / data / error).
 *   - Maps known transient failures (rate limits, server overload, empty
 *     body on a 5xx) to clean user-facing messages.
 */
export type SafeJsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: Record<string, unknown> | null; error: string; transient: boolean };

export async function fetchJsonSafe<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit,
): Promise<SafeJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return {
      ok: false, status: 0, data: null, transient: true,
      error: 'Network error — please check your connection and try again.',
    };
  }

  const text = await res.text().catch(() => '');
  let data: unknown = null;
  if (text.trim()) {
    try { data = JSON.parse(text); } catch { /* leave as null */ }
  }

  if (res.ok) {
    return { ok: true, status: res.status, data: (data ?? {}) as T };
  }

  // Pull a server-supplied message if there is one.
  const obj = (data && typeof data === 'object') ? data as Record<string, unknown> : null;
  const serverMsg = typeof obj?.error === 'string' ? (obj.error as string) : null;

  // Empty/non-JSON body on a 5xx is the classic AI-cascade-failed-mid-response case.
  if (!obj && res.status >= 500) {
    return {
      ok: false, status: res.status, data: null, transient: true,
      error: 'AI is temporarily overloaded. Please try again in a few minutes.',
    };
  }

  // 503 = our generators throwing rate_limit_exhausted / request_too_large.
  // 429 = daily/per-minute quota or daily question limit.
  // The route already gave us a clean message in those cases.
  const transient = res.status === 429 || res.status === 503 || res.status >= 500;
  return {
    ok: false, status: res.status, data: obj, transient,
    error: serverMsg ?? `Server error (${res.status}). Try again.`,
  };
}
