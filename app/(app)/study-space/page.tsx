'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Play, Square, Trophy, Clock, Zap, Users,
  BookOpen, ChevronRight, X, Check, SkipForward,
  BookMarked, Wifi, WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DuckPlayer = dynamic(
  () => import('@/components/animations/DuckPlayer').then(m => m.DuckPlayer),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────
type DuckState = 'idle' | 'reading' | 'celebrate' | 'sad' | 'alert';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  isMe: boolean;
  displayName: string;
  totalSeconds: number;
  isActive: boolean;
}

interface QuizQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: string;
  explanation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtMins(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Circular progress ring
function TimerRing({ seconds, maxSeconds = 3600, size = 260 }: { seconds: number; maxSeconds?: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(seconds / maxSeconds, 1);
  const dash = circ * pct;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={10}
        opacity={0.4}
      />
      {/* Progress */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s linear', filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6))' }}
      />
      {/* Glow ring outer */}
      <circle cx={size / 2} cy={size / 2} r={r + 6}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1}
        opacity={0.15}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudySpacePage() {
  // Setup
  const [topic, setTopic] = useState('');
  const [started, setStarted] = useState(false);

  // Timer (client display — real time tracked server-side via heartbeat)
  const [displaySecs, setDisplaySecs] = useState(0);
  const [verifiedSecs, setVerifiedSecs] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duck
  const [duckState, setDuckState] = useState<DuckState>('idle');

  // Quiz
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizTimeout, setQuizTimeout] = useState(180); // 3 min
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const nextQuizRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingQuizRef = useRef(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbPeriod, setLbPeriod] = useState<'today' | 'week'>('today');
  const [lbLoading, setLbLoading] = useState(false);

  // Page visibility
  const visibleRef = useRef(true);
  useEffect(() => {
    const handler = () => { visibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // ── Leaderboard fetch ──────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const r = await fetch(`/api/focus/leaderboard?period=${lbPeriod}`);
      const d = await r.json();
      setLeaderboard(d.leaderboard ?? []);
    } catch { /* ignore */ }
    finally { setLbLoading(false); }
  }, [lbPeriod]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);
  useEffect(() => {
    if (!started) return;
    const id = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(id);
  }, [started, fetchLeaderboard]);

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  const sendHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current || !visibleRef.current) return;
    try {
      const r = await fetch('/api/focus/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      });
      const d = await r.json();
      if (d.totalSeconds !== undefined) setVerifiedSecs(d.totalSeconds);
    } catch { /* ignore */ }
  }, []);

  // ── Quiz scheduling ────────────────────────────────────────────────────────
  const scheduleNextQuiz = useCallback((delaySecs: number) => {
    if (nextQuizRef.current) clearTimeout(nextQuizRef.current);
    nextQuizRef.current = setTimeout(async () => {
      if (!started || !visibleRef.current || loadingQuizRef.current) return;
      loadingQuizRef.current = true;
      try {
        const r = await fetch('/api/focus/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic || 'general medicine' }),
        });
        const q = await r.json();
        if (q.question) {
          setQuiz(q);
          setQuizSelected(null);
          setQuizRevealed(false);
          setQuizTimeout(180);
          setQuizVisible(true);
          setDuckState('alert');
        }
      } catch { /* ignore */ }
      finally { loadingQuizRef.current = false; }
    }, delaySecs * 1000);
  }, [started, topic]);

  // ── Start session ──────────────────────────────────────────────────────────
  async function handleStart() {
    if (!topic.trim()) return;
    try {
      const r = await fetch('/api/focus/start', { method: 'POST' });
      const d = await r.json();
      if (!d.sessionId) return;
      sessionIdRef.current = d.sessionId;

      setDisplaySecs(0);
      setVerifiedSecs(0);
      setStarted(true);
      setDuckState('reading');

      // Client display timer
      timerRef.current = setInterval(() => {
        if (visibleRef.current) setDisplaySecs(s => s + 1);
      }, 1000);

      // Heartbeat every 30s
      heartbeatRef.current = setInterval(sendHeartbeat, 30_000);

      // First quiz check after 15 minutes
      scheduleNextQuiz(15 * 60);
    } catch { /* ignore */ }
  }

  // ── Stop session ───────────────────────────────────────────────────────────
  async function handleStop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (nextQuizRef.current) clearTimeout(nextQuizRef.current);
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);

    if (sessionIdRef.current) {
      await fetch('/api/focus/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      });
      sessionIdRef.current = null;
    }

    setStarted(false);
    setDuckState('idle');
    setQuizVisible(false);
    fetchLeaderboard();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (nextQuizRef.current) clearTimeout(nextQuizRef.current);
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      if (sessionIdRef.current) {
        fetch('/api/focus/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });
      }
    };
  }, []);

  // ── Quiz timer countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!quizVisible) { if (quizTimerRef.current) clearInterval(quizTimerRef.current); return; }
    quizTimerRef.current = setInterval(() => {
      setQuizTimeout(t => {
        if (t <= 1) {
          // Time's up — skip quiz
          dismissQuiz('skip');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (quizTimerRef.current) clearInterval(quizTimerRef.current); };
  }, [quizVisible]);

  // ── Quiz answer ────────────────────────────────────────────────────────────
  function selectAnswer(letter: string) {
    if (quizRevealed) return;
    setQuizSelected(letter);
    setQuizRevealed(true);
    const correct = letter === quiz?.correct;
    setQuizCorrect(c => c + (correct ? 1 : 0));
    setQuizTotal(t => t + 1);
    setDuckState(correct ? 'celebrate' : 'sad');
    setTimeout(() => {
      dismissQuiz('answered');
    }, 2500);
  }

  function dismissQuiz(reason: 'answered' | 'skip' | 'notInBook' | 'notReached') {
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setQuizVisible(false);
    setQuiz(null);
    if (reason !== 'answered') {
      setQuizTotal(t => t + 1);
      setDuckState('reading');
    } else {
      setTimeout(() => setDuckState('reading'), 1500);
    }
    // Schedule next quiz in 15 minutes
    scheduleNextQuiz(15 * 60);
  }

  // ── Option button state ────────────────────────────────────────────────────
  function optionState(letter: string): 'default' | 'selected' | 'correct' | 'wrong' | 'reveal' {
    if (!quizRevealed) return quizSelected === letter ? 'selected' : 'default';
    if (letter === quiz?.correct) return quizSelected === letter ? 'correct' : 'reveal';
    if (letter === quizSelected) return 'wrong';
    return 'default';
  }

  const accuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient background blobs — theme-aware via primary color */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary" />
              Study Space
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real verified study time — the duck keeps you honest 🦆
            </p>
          </div>
          {started && (
            <div className={cn(
              'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full',
              visibleRef.current
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-amber-500/15 text-amber-500'
            )}>
              {visibleRef.current ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {visibleRef.current ? 'Live' : 'Paused'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_320px] gap-6 items-start">

          {/* ── Left: Duck + Topic ── */}
          <div className="flex flex-col items-center gap-5">
            {/* Duck */}
            <div className="relative">
              <div className="w-48 h-52 relative">
                <DuckPlayer state={duckState} size={192} />
              </div>
              {/* State label */}
              <div className={cn(
                'absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all duration-500',
                duckState === 'reading' && 'bg-primary/10 text-primary border-primary/30',
                duckState === 'celebrate' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
                duckState === 'sad' && 'bg-red-500/10 text-red-500 border-red-500/30',
                duckState === 'alert' && 'bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse',
                duckState === 'idle' && 'bg-muted text-muted-foreground border-border',
              )}>
                {duckState === 'idle' && '🦆 Ready to study'}
                {duckState === 'reading' && '📖 Studying with you'}
                {duckState === 'celebrate' && '🎉 Nice one!'}
                {duckState === 'sad' && '😔 Almost!'}
                {duckState === 'alert' && '❓ Quiz time!'}
              </div>
            </div>

            {/* Quiz stats */}
            {quizTotal > 0 && (
              <div className="w-full max-w-xs bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Check-in Stats</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">Questions answered</span>
                  <span className="font-bold text-foreground">{quizCorrect}/{quizTotal}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${accuracy ?? 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 text-right">{accuracy}% accuracy</p>
              </div>
            )}

            {/* Topic input */}
            {!started ? (
              <div className="w-full max-w-xs">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  What will you study today?
                </label>
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Cardiology — ECG interpretation, heart failure, arrhythmias..."
                  className="w-full h-28 px-3 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  maxLength={400}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  The AI will quiz you on this every 15 minutes to verify you're learning.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-xs bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Studying</p>
                <p className="text-sm text-foreground line-clamp-4">{topic}</p>
              </div>
            )}
          </div>

          {/* ── Center: Timer ── */}
          <div className="flex flex-col items-center gap-6">
            {/* Ring + time */}
            <div className="relative flex items-center justify-center">
              <TimerRing seconds={displaySecs} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-4xl md:text-5xl font-black tabular-nums text-foreground tracking-tight">
                  {fmtTime(displaySecs)}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-primary font-bold">{fmtMins(verifiedSecs)}</span>
                  <span>verified</span>
                </div>
              </div>
            </div>

            {/* Start / Stop */}
            {!started ? (
              <button
                onClick={handleStart}
                disabled={!topic.trim()}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.35)' }}
              >
                <Play className="w-5 h-5" />
                Start Studying
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-red-500/15 text-red-500 border border-red-500/30 font-bold text-base hover:bg-red-500/25 transition-all"
              >
                <Square className="w-5 h-5" />
                End Session
              </button>
            )}

            {/* Info strip */}
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Timer pauses when tab hidden
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" /> Server-verified time
              </span>
            </div>
          </div>

          {/* ── Right: Leaderboard ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-foreground">Leaderboard</span>
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                {(['today', 'week'] as const).map(p => (
                  <button key={p}
                    onClick={() => setLbPeriod(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                      lbPeriod === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}>
                    {p === 'today' ? 'Today' : 'Week'}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {lbLoading && leaderboard.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : leaderboard.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No sessions yet today — be the first!
                </div>
              ) : (
                leaderboard.slice(0, 15).map(entry => (
                  <div
                    key={entry.userId}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      entry.isMe && 'bg-primary/5'
                    )}
                  >
                    {/* Rank */}
                    <span className={cn(
                      'w-6 text-center text-xs font-black shrink-0',
                      entry.rank === 1 && 'text-amber-500',
                      entry.rank === 2 && 'text-slate-400',
                      entry.rank === 3 && 'text-amber-700',
                      entry.rank > 3 && 'text-muted-foreground'
                    )}>
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                    </span>

                    {/* Active dot */}
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0 transition-colors',
                      entry.isActive ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-muted-foreground/30'
                    )} />

                    {/* Name */}
                    <span className={cn(
                      'flex-1 text-sm truncate',
                      entry.isMe ? 'font-bold text-primary' : 'text-foreground'
                    )}>
                      {entry.displayName}
                      {entry.isMe && <span className="ml-1 text-[10px] text-primary/60">(you)</span>}
                    </span>

                    {/* Time */}
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">
                      {fmtMins(entry.totalSeconds)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Studying now
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-primary" />
                Server-verified only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quiz Modal ── */}
      {quizVisible && quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 0 60px hsl(var(--primary) / 0.2)' }}
          >
            {/* Modal header */}
            <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-lg">❓</div>
                <div>
                  <p className="font-bold text-sm text-foreground">Check-in Quiz</p>
                  <p className="text-[11px] text-muted-foreground">The duck wants to know if you're learning</p>
                </div>
              </div>
              {/* Countdown */}
              <div className={cn(
                'flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full',
                quizTimeout <= 30
                  ? 'bg-red-500/15 text-red-500 animate-pulse'
                  : 'bg-muted text-muted-foreground'
              )}>
                <Clock className="w-3 h-3" />
                {fmtTime(quizTimeout)}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Question */}
              <p className="text-base font-semibold text-foreground leading-snug">
                {quiz.question}
              </p>

              {/* Options */}
              <div className="space-y-2.5">
                {(Object.entries(quiz.options) as [string, string][]).map(([letter, text]) => {
                  const state = optionState(letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => selectAnswer(letter)}
                      disabled={quizRevealed}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-200',
                        state === 'default' && 'border-border bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground',
                        state === 'selected' && 'border-primary bg-primary/10 text-primary',
                        state === 'correct' && 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                        state === 'wrong' && 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400',
                        state === 'reveal' && 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        quizRevealed && state === 'default' && 'opacity-40',
                      )}
                    >
                      <span className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border',
                        state === 'correct' || state === 'reveal' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' :
                        state === 'wrong' ? 'bg-red-500/20 border-red-500 text-red-500' :
                        state === 'selected' ? 'bg-primary/20 border-primary text-primary' :
                        'bg-muted border-border text-muted-foreground'
                      )}>
                        {state === 'correct' || state === 'reveal' ? <Check className="w-3.5 h-3.5" /> :
                         state === 'wrong' ? <X className="w-3.5 h-3.5" /> : letter}
                      </span>
                      {text}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {quizRevealed && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <p className="text-xs font-bold text-primary mb-1">Explanation</p>
                  <p className="text-sm text-foreground">{quiz.explanation}</p>
                </div>
              )}

              {/* Skip actions */}
              {!quizRevealed && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => dismissQuiz('notReached')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    Haven&apos;t reached this yet
                  </button>
                  <button
                    onClick={() => dismissQuiz('notInBook')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    Not in my material
                  </button>
                  <button
                    onClick={() => dismissQuiz('skip')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-auto"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
