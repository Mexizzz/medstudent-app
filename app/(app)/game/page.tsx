'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Swords, Zap, Heart, Trophy, Clock, ChevronRight, RotateCcw, Home, Lightbulb, X, Check, Flame, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string;
  explanation: string | null;
  topic: string | null;
  subject: string | null;
  difficulty: string | null;
}

interface ContentSource {
  id: string;
  title: string;
  subject: string | null;
}

type GameMode = 'millionaire' | 'speed' | 'survival';
type Screen = 'lobby' | 'playing' | 'result';

// ─── Millionaire prize ladder ─────────────────────────────────────────────────

const PRIZE_LADDER = [
  { level: 1,  label: '£100',       safe: false },
  { level: 2,  label: '£200',       safe: false },
  { level: 3,  label: '£300',       safe: false },
  { level: 4,  label: '£500',       safe: false },
  { level: 5,  label: '£1,000',     safe: true  },
  { level: 6,  label: '£2,000',     safe: false },
  { level: 7,  label: '£4,000',     safe: false },
  { level: 8,  label: '£8,000',     safe: false },
  { level: 9,  label: '£16,000',    safe: false },
  { level: 10, label: '£32,000',    safe: true  },
  { level: 11, label: '£64,000',    safe: false },
  { level: 12, label: '£125,000',   safe: false },
  { level: 13, label: '£250,000',   safe: false },
  { level: 14, label: '£500,000',   safe: false },
  { level: 15, label: '£1,000,000', safe: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOptions(q: GameQuestion): { key: string; text: string }[] {
  const opts: { key: string; text: string }[] = [{ key: 'A', text: q.optionA }];
  if (q.optionB) opts.push({ key: 'B', text: q.optionB });
  if (q.optionC) opts.push({ key: 'C', text: q.optionC });
  if (q.optionD) opts.push({ key: 'D', text: q.optionD });
  return opts;
}

function resultMessage(mode: GameMode, score: number, total: number, lives?: number): string {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  if (mode === 'millionaire') {
    if (score >= 15) return "You're a Medical Millionaire! 🏆";
    if (score >= 10) return 'Elite medical knowledge!';
    if (score >= 5) return 'Solid performance!';
    return 'Keep studying — you\'ll get there!';
  }
  if (mode === 'speed') {
    if (score >= 20) return 'Lightning fast & accurate! ⚡';
    if (score >= 12) return 'Great speed round!';
    if (score >= 6) return 'Good effort!';
    return 'Speed takes practice!';
  }
  // survival
  if (lives === 3 && score > 0) return 'Flawless survival! 💪';
  if (score >= 15) return 'Incredible endurance!';
  if (score >= 8) return 'Strong survival run!';
  return 'Survived for a while!';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OptionButton({
  letter, text, state, onClick, disabled,
}: {
  letter: string;
  text: string;
  state: 'default' | 'selected' | 'correct' | 'wrong' | 'reveal';
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 font-medium',
        state === 'default' && 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 text-foreground',
        state === 'selected' && 'border-primary bg-primary/10 text-primary',
        state === 'correct' && 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        state === 'wrong' && 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400',
        state === 'reveal' && 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        disabled && state === 'default' && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border',
        state === 'correct' || state === 'reveal' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
        state === 'wrong' ? 'border-red-500 bg-red-500/20 text-red-500' :
        state === 'selected' ? 'border-primary bg-primary/20 text-primary' :
        'border-border bg-muted text-muted-foreground'
      )}>
        {letter}
      </span>
      <span className="text-sm">{text}</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BrainBattlePage() {
  // Lobby state
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode>('millionaire');
  const [loadingSources, setLoadingSources] = useState(true);

  // Game state
  const [screen, setScreen] = useState<Screen>('lobby');
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Per-question state
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Score / lives
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [speedTime, setSpeedTime] = useState(60);
  const [showExplanation, setShowExplanation] = useState(false);

  // Millionaire lifelines
  const [lifeline5050Used, setLifeline5050Used] = useState(false);
  const [lifelineSkipUsed, setLifelineSkipUsed] = useState(false);
  const [lifelineHintUsed, setLifelineHintUsed] = useState(false);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [walkedAway, setWalkedAway] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load sources on mount
  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((d) => {
        const raw: ContentSource[] = d.sources || [];
        const s: ContentSource[] = raw
          .filter((src) => src.id)
          .map((src) => ({
            id: src.id,
            title: src.title,
            subject: src.subject,
          }));
        setSources(s);
        setSelectedSources(s.map((x) => x.id));
      })
      .catch(() => {})
      .finally(() => setLoadingSources(false));
  }, []);

  // Speed round timer
  useEffect(() => {
    if (screen !== 'playing' || selectedMode !== 'speed') return;
    timerRef.current = setInterval(() => {
      setSpeedTime((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setScreen('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [screen, selectedMode]);

  const currentQ = questions[qIndex] ?? null;

  function toggleSource(id: string) {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function startGame() {
    setLoading(true);
    try {
      const count = selectedMode === 'millionaire' ? 15 : 40;
      const params = new URLSearchParams({
        count: String(count),
        sourceIds: selectedSources.join(','),
      });
      const res = await fetch(`/api/game/questions?${params}`);
      const data = await res.json();
      const qs: GameQuestion[] = data.questions || [];
      if (qs.length < 3) {
        alert('Not enough MCQ questions found. Generate more questions in your Library first!');
        return;
      }
      setQuestions(qs);
      setQIndex(0);
      setScore(0);
      setLives(3);
      setSpeedTime(60);
      setSelected(null);
      setConfirmed(false);
      setShowExplanation(false);
      setLifeline5050Used(false);
      setLifelineSkipUsed(false);
      setLifelineHintUsed(false);
      setEliminated([]);
      setShowHint(false);
      setWalkedAway(false);
      setScreen('playing');
    } catch {
      alert('Failed to load questions. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(key: string) {
    if (confirmed || eliminated.includes(key)) return;
    setSelected(key);
    if (selectedMode === 'speed') {
      // Auto-confirm in speed mode
      confirmAnswer(key);
    }
  }

  const confirmAnswer = useCallback(
    (overrideKey?: string) => {
      const answer = overrideKey ?? selected;
      if (!answer || !currentQ) return;
      setConfirmed(true);
      const isCorrect = answer === currentQ.correctAnswer;

      if (isCorrect) {
        setScore((s) => s + 1);
      } else {
        if (selectedMode === 'survival') setLives((l) => l - 1);
      }

      if (selectedMode === 'speed') {
        // Move immediately after brief feedback
        setTimeout(() => nextQuestion(isCorrect), 600);
      }
    },
    [selected, currentQ, selectedMode]
  );

  function nextQuestion(lastCorrect?: boolean) {
    const isCorrect = lastCorrect ?? (selected === currentQ?.correctAnswer);
    const nextIdx = qIndex + 1;

    // Check end conditions
    // Note: confirmAnswer already called setLives((l) => l - 1) if wrong,
    // so `lives` here reflects the already-decremented value.
    if (selectedMode === 'survival' && lives <= 0) {
      setScreen('result');
      return;
    }
    if (selectedMode === 'millionaire' && !isCorrect && !walkedAway) {
      setScreen('result');
      return;
    }
    if (nextIdx >= questions.length || (selectedMode === 'millionaire' && nextIdx >= 15)) {
      setScreen('result');
      return;
    }

    setQIndex(nextIdx);
    setSelected(null);
    setConfirmed(false);
    setShowExplanation(false);
    setEliminated([]);
    setShowHint(false);
  }

  function use5050() {
    if (lifeline5050Used || !currentQ || confirmed) return;
    setLifeline5050Used(true);
    const opts = getOptions(currentQ);
    const wrong = opts.filter((o) => o.key !== currentQ.correctAnswer);
    const toElim = wrong.sort(() => Math.random() - 0.5).slice(0, 2).map((o) => o.key);
    setEliminated(toElim);
  }

  function useSkip() {
    if (lifelineSkipUsed || confirmed) return;
    setLifelineSkipUsed(true);
    const nextIdx = qIndex + 1;
    if (nextIdx >= questions.length) {
      setScreen('result');
      return;
    }
    setQIndex(nextIdx);
    setSelected(null);
    setConfirmed(false);
    setShowExplanation(false);
    setEliminated([]);
    setShowHint(false);
  }

  function useHint() {
    if (lifelineHintUsed || confirmed) return;
    setLifelineHintUsed(true);
    setShowHint(true);
  }

  function walkAway() {
    setWalkedAway(true);
    setScreen('result');
  }

  function resetToLobby() {
    setScreen('lobby');
    setQuestions([]);
    setQIndex(0);
    setScore(0);
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg mb-4">
              <Swords className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Brain Battle</h1>
            <p className="text-muted-foreground mt-1">Test your medical knowledge in epic game modes</p>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              {
                id: 'millionaire' as GameMode,
                icon: Trophy,
                label: 'Medical Millionaire',
                desc: '15 questions, prize ladder, 3 lifelines',
                color: 'from-amber-400 to-yellow-500',
                bg: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30',
                activeBg: 'from-amber-500/20 to-yellow-500/20 border-amber-500',
              },
              {
                id: 'speed' as GameMode,
                icon: Zap,
                label: 'Speed Round',
                desc: '60 seconds, answer as many as possible',
                color: 'from-cyan-400 to-blue-500',
                bg: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30',
                activeBg: 'from-cyan-500/20 to-blue-500/20 border-cyan-500',
              },
              {
                id: 'survival' as GameMode,
                icon: Heart,
                label: 'Survival Mode',
                desc: '3 lives — lose them all and it\'s over',
                color: 'from-rose-400 to-red-500',
                bg: 'from-rose-500/10 to-red-500/10 border-rose-500/30',
                activeBg: 'from-rose-500/20 to-red-500/20 border-rose-500',
              },
            ].map(({ id, icon: Icon, label, desc, color, bg, activeBg }) => {
              const active = selectedMode === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedMode(id)}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 bg-gradient-to-br transition-all duration-200 text-center',
                    active ? activeBg : bg,
                    active ? 'shadow-lg scale-[1.02]' : 'hover:scale-[1.01]'
                  )}
                >
                  {active && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow', color)}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Source selector */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground text-sm">Select Sources</h2>
              <button
                onClick={() =>
                  setSelectedSources(
                    selectedSources.length === sources.length ? [] : sources.map((s) => s.id)
                  )
                }
                className="text-xs text-primary hover:underline"
              >
                {selectedSources.length === sources.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            {loadingSources ? (
              <p className="text-sm text-muted-foreground">Loading sources…</p>
            ) : sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sources found. Add content in your Library first.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {sources.map((src) => (
                  <button
                    key={src.id}
                    onClick={() => toggleSource(src.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all',
                      selectedSources.includes(src.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:border-primary/40'
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                      selectedSources.includes(src.id) ? 'border-primary bg-primary' : 'border-border'
                    )}>
                      {selectedSources.includes(src.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="truncate">{src.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={loading || selectedSources.length === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Swords className="w-5 h-5" />
                Start Battle
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────

  if (screen === 'result') {
    const total = Math.min(questions.length, selectedMode === 'millionaire' ? 15 : questions.length);
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const msg = resultMessage(selectedMode, score, total, lives);

    let prizeLabel = '';
    if (selectedMode === 'millionaire') {
      if (walkedAway && score > 0) {
        prizeLabel = PRIZE_LADDER[score - 1]?.label ?? '';
      } else {
        // Find safe floor
        let safePrize = '';
        for (let i = score - 1; i >= 0; i--) {
          if (PRIZE_LADDER[i]?.safe) { safePrize = PRIZE_LADDER[i].label; break; }
        }
        prizeLabel = score === 15 ? '£1,000,000' : safePrize;
      }
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="bg-card rounded-3xl border border-border p-8 shadow-xl">
            {/* Emoji */}
            <div className="text-6xl mb-4">
              {selectedMode === 'millionaire' && (score === 15 ? '🏆' : score >= 10 ? '🌟' : score >= 5 ? '🎯' : '📚')}
              {selectedMode === 'speed' && (score >= 20 ? '⚡' : score >= 12 ? '🚀' : score >= 6 ? '👍' : '⏱️')}
              {selectedMode === 'survival' && (lives === 3 ? '💪' : lives === 2 ? '😤' : lives === 1 ? '😰' : '💀')}
            </div>

            <h2 className="text-2xl font-black text-foreground mb-1">{msg}</h2>

            {/* Score */}
            <div className="my-6 space-y-2">
              {selectedMode === 'speed' ? (
                <div className="text-5xl font-black text-primary">{score}</div>
              ) : selectedMode === 'millionaire' ? (
                <>
                  <div className="text-5xl font-black text-amber-500">{score}<span className="text-2xl text-muted-foreground">/15</span></div>
                  {prizeLabel && (
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{prizeLabel}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="text-5xl font-black text-primary">{score}</div>
                  <div className="flex items-center justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <Heart
                        key={i}
                        className={cn('w-6 h-6', i < lives ? 'fill-red-500 text-red-500' : 'text-muted-foreground')}
                      />
                    ))}
                  </div>
                </>
              )}

              <p className="text-sm text-muted-foreground">
                {selectedMode === 'speed'
                  ? 'questions answered correctly in 60s'
                  : `${score} correct out of ${total} questions`}
              </p>
            </div>

            {/* Accuracy bar */}
            {selectedMode !== 'speed' && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Accuracy</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
              <button
                onClick={resetToLobby}
                className="flex-1 py-3 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────

  if (!currentQ) return null;

  const opts = getOptions(currentQ).filter((o) => !eliminated.includes(o.key));

  function getOptionState(key: string): 'default' | 'selected' | 'correct' | 'wrong' | 'reveal' {
    if (!confirmed) return selected === key ? 'selected' : 'default';
    if (key === currentQ!.correctAnswer) return selected === key ? 'correct' : 'reveal';
    if (key === selected) return 'wrong';
    return 'default';
  }

  const isMillionaire = selectedMode === 'millionaire';
  const isSpeed = selectedMode === 'speed';
  const isSurvival = selectedMode === 'survival';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-3 md:p-6">
      <div className={cn('max-w-2xl mx-auto', isMillionaire && 'max-w-4xl')}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-5 gap-4">
          <button onClick={resetToLobby} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Home className="w-4 h-4" />
          </button>

          {/* Mode indicator */}
          <div className="flex items-center gap-2 font-bold text-sm text-muted-foreground">
            {isMillionaire && <><Trophy className="w-4 h-4 text-amber-500" /> Medical Millionaire</>}
            {isSpeed && <><Zap className="w-4 h-4 text-cyan-500" /> Speed Round</>}
            {isSurvival && <><Heart className="w-4 h-4 text-rose-500" /> Survival</>}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            {isSpeed && (
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold',
                speedTime <= 10 ? 'bg-red-500/15 text-red-500 animate-pulse' :
                speedTime <= 20 ? 'bg-amber-500/15 text-amber-500' :
                'bg-muted text-foreground'
              )}>
                <Clock className="w-4 h-4" />
                {speedTime}s
              </div>
            )}
            {isSurvival && (
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <Heart key={i} className={cn(
                    'w-5 h-5 transition-all',
                    i < lives ? 'fill-red-500 text-red-500' : 'text-muted-foreground/30'
                  )} />
                ))}
              </div>
            )}
            {isMillionaire && (
              <div className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-sm font-bold">
                Q{qIndex + 1}/15
              </div>
            )}
            {isSpeed && (
              <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold">
                {score} ✓
              </div>
            )}
          </div>
        </div>

        <div className={cn('flex gap-6', isMillionaire && 'flex-col lg:flex-row')}>

          {/* ── Millionaire Prize Ladder ── */}
          {isMillionaire && (
            <div className="lg:w-44 shrink-0">
              <div className="bg-card rounded-2xl border border-border p-3 lg:sticky lg:top-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">Prize Ladder</p>
                <div className="space-y-0.5">
                  {[...PRIZE_LADDER].reverse().map((prize) => {
                    const isCurrent = prize.level === qIndex + 1;
                    const isPassed = prize.level <= score;
                    return (
                      <div
                        key={prize.level}
                        className={cn(
                          'flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-all',
                          isCurrent && 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold',
                          isPassed && !isCurrent && 'text-emerald-600 dark:text-emerald-400',
                          !isCurrent && !isPassed && 'text-muted-foreground',
                          prize.safe && !isCurrent && 'font-semibold'
                        )}
                      >
                        <span>{prize.level}</span>
                        <span className="flex items-center gap-1">
                          {prize.safe && <Star className="w-3 h-3 text-amber-500" />}
                          {prize.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Question Area ── */}
          <div className="flex-1 min-w-0">
            {/* Progress bar (non-millionaire) */}
            {!isMillionaire && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500"
                  style={{ width: `${isSpeed ? ((60 - speedTime) / 60) * 100 : (qIndex / questions.length) * 100}%` }}
                />
              </div>
            )}

            {/* Question card */}
            <div className="bg-card rounded-2xl border border-border p-5 md:p-6 mb-4">
              {currentQ.topic && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-3">
                  {currentQ.topic}
                </span>
              )}
              <p className="text-foreground font-semibold text-base md:text-lg leading-snug mb-5">
                {currentQ.question}
              </p>

              <div className="space-y-2.5">
                {opts.map((opt) => (
                  <OptionButton
                    key={opt.key}
                    letter={opt.key}
                    text={opt.text}
                    state={getOptionState(opt.key)}
                    onClick={() => handleSelect(opt.key)}
                    disabled={confirmed || !!(eliminated.includes(opt.key))}
                  />
                ))}
              </div>
            </div>

            {/* Hint */}
            {showHint && currentQ.explanation && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 flex gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {currentQ.explanation.slice(0, 200)}{currentQ.explanation.length > 200 ? '…' : ''}
                </p>
              </div>
            )}

            {/* Explanation after answer */}
            {confirmed && showExplanation && currentQ.explanation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Explanation</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">{currentQ.explanation}</p>
              </div>
            )}

            {/* Lifelines (Millionaire) */}
            {isMillionaire && !confirmed && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Lifelines:</span>
                <button
                  onClick={use5050}
                  disabled={lifeline5050Used}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                    lifeline5050Used
                      ? 'opacity-30 cursor-not-allowed border-border text-muted-foreground'
                      : 'border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  )}
                >
                  50:50
                </button>
                <button
                  onClick={useSkip}
                  disabled={lifelineSkipUsed}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                    lifelineSkipUsed
                      ? 'opacity-30 cursor-not-allowed border-border text-muted-foreground'
                      : 'border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10'
                  )}
                >
                  Skip
                </button>
                <button
                  onClick={useHint}
                  disabled={lifelineHintUsed}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                    lifelineHintUsed
                      ? 'opacity-30 cursor-not-allowed border-border text-muted-foreground'
                      : 'border-violet-500 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10'
                  )}
                >
                  AI Hint
                </button>
                <button
                  onClick={walkAway}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500 text-rose-500 hover:bg-rose-500/10 transition-all"
                >
                  Walk Away
                </button>
              </div>
            )}

            {/* Bottom action */}
            <div className="flex items-center gap-3">
              {!confirmed && !isSpeed && (
                <button
                  onClick={() => confirmAnswer()}
                  disabled={!selected}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Confirm Answer
                </button>
              )}

              {confirmed && !isSpeed && (
                <>
                  {currentQ.explanation && !showExplanation && (
                    <button
                      onClick={() => setShowExplanation(true)}
                      className="py-3 px-4 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center gap-2"
                    >
                      <Lightbulb className="w-4 h-4" />
                      Explain
                    </button>
                  )}
                  <button
                    onClick={() => nextQuestion()}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {qIndex + 1 >= questions.length || (isMillionaire && qIndex + 1 >= 15)
                      ? 'See Results'
                      : <>Next <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
