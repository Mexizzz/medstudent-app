'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  transitionKey: number;
}

type Phase = 'idle' | 'exit' | 'enter';

export function QuestionTransition({ children, transitionKey }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [displayed, setDisplayed] = useState<ReactNode>(children);
  const prevKey = useRef(transitionKey);
  // Keep a ref so the timeout always reads the latest children
  // without needing children in the effect dependency array
  const latestChildren = useRef(children);
  latestChildren.current = children;

  useEffect(() => {
    if (transitionKey === prevKey.current) return;
    prevKey.current = transitionKey;

    setPhase('exit');
    const t1 = setTimeout(() => {
      setDisplayed(latestChildren.current);
      setPhase('enter');
      const t2 = setTimeout(() => setPhase('idle'), 300);
      return () => clearTimeout(t2);
    }, 250);

    return () => clearTimeout(t1);
  }, [transitionKey]); // only transitionKey — children changes don't cancel the timeout

  // While idle, keep displayed in sync with children (e.g. answer feedback appearing)
  useEffect(() => {
    if (phase === 'idle') setDisplayed(latestChildren.current);
  }, [children, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const style: React.CSSProperties = {
    transition: 'opacity 250ms ease, transform 250ms ease',
    opacity: phase === 'exit' ? 0 : 1,
    transform:
      phase === 'exit' ? 'translateX(-20px) scale(0.98)' :
      phase === 'enter' ? 'translateX(16px) scale(0.99)' :
      'translateX(0) scale(1)',
  };

  return <div style={style}>{displayed}</div>;
}
