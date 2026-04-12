'use client';

import { useEffect, useRef, useState } from 'react';

function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [start, target, duration]);

  return value;
}

function StatItem({ value, suffix = '', label, delay = 0 }: { value: number; suffix?: string; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const count = useCountUp(value, 1600, started);

  useEffect(() => {
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
        { threshold: 0.5 }
      );
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm mt-1 text-blue-300">{label}</p>
    </div>
  );
}

export function AnimatedStatsBar() {
  return (
    <section className="bg-blue-900 dark:bg-blue-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          <StatItem value={10000} suffix="+" label="Questions Generated" delay={0} />
          <StatItem value={50} suffix="+" label="Countries" delay={150} />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-white">4.8★</p>
            <p className="text-sm mt-1 text-blue-300">Average Rating</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-white">Free</p>
            <p className="text-sm mt-1 text-blue-300">To Get Started</p>
          </div>
        </div>
      </div>
    </section>
  );
}
