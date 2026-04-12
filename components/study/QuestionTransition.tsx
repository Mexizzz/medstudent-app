'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  transitionKey: number; // changes on every new question
}

type Phase = 'idle' | 'exit' | 'enter';

export function QuestionTransition({ children, transitionKey }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [displayed, setDisplayed] = useState<ReactNode>(children);
  const prevKey = useRef(transitionKey);

  useEffect(() => {
    if (transitionKey === prevKey.current) return;
    prevKey.current = transitionKey;

    // 1. Slide current question out
    setPhase('exit');
    const t1 = setTimeout(() => {
      // 2. Swap content while invisible
      setDisplayed(children);
      setPhase('enter');
      // 3. Slide new question in
      const t2 = setTimeout(() => setPhase('idle'), 320);
      return () => clearTimeout(t2);
    }, 280);

    return () => clearTimeout(t1);
  }, [transitionKey, children]);

  // Keep displayed content fresh when idle (answer state changes etc.)
  useEffect(() => {
    if (phase === 'idle') setDisplayed(children);
  }, [children, phase]);

  const style: React.CSSProperties = {
    transition: 'opacity 280ms ease, transform 280ms ease',
    opacity: phase === 'exit' ? 0 : 1,
    transform:
      phase === 'exit' ? 'translateX(-24px) scale(0.98)' :
      phase === 'enter' ? 'translateX(18px) scale(0.99)' :
      'translateX(0) scale(1)',
  };

  return <div style={style}>{displayed}</div>;
}
