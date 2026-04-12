'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, X, Crown, Zap } from 'lucide-react';

function useScrollReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
        { threshold: 0.15 }
      );
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return { ref, visible };
}

// Animated price that counts up
function AnimatedPrice({ value, prefix = '£', delay = 0 }: { value: number; prefix?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const timeout = setTimeout(() => {
      if (value === 0) { setDisplay(0); return; }
      const duration = 900;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(parseFloat((eased * value).toFixed(2)));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [started, value, delay]);

  return (
    <span ref={ref} className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
      {prefix}{value === 0 ? '0' : display.toFixed(value % 1 === 0 ? 0 : 2)}
    </span>
  );
}

// Animated feature list item
function FeatureItem({ text, included, index }: { text: string; included: boolean; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className="flex items-center gap-2"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        transition: `opacity 0.4s ease ${index * 50}ms, transform 0.4s ease ${index * 50}ms`,
      }}
    >
      {included
        ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        : <X className="w-4 h-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />}
      <span className={included ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>{text}</span>
    </li>
  );
}

export function AnimatedPricingCards() {
  const free = useScrollReveal(0);
  const pro = useScrollReveal(120);
  const max = useScrollReveal(240);

  // Pulsing glow on Pro card
  const [glowSize, setGlowSize] = useState(10);
  useEffect(() => {
    let dir = 1;
    const id = setInterval(() => {
      setGlowSize(s => {
        const next = s + dir * 0.4;
        if (next >= 20 || next <= 8) dir *= -1;
        return next;
      });
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {/* Free */}
      <div
        ref={free.ref}
        className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col bg-white dark:bg-slate-800"
        style={{
          opacity: free.visible ? 1 : 0,
          transform: free.visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Free</h3>
        <div className="mt-3 mb-5">
          <AnimatedPrice value={0} delay={200} />
          <span className="ml-1 text-slate-500 dark:text-slate-400">/month</span>
        </div>
        <p className="text-sm mb-6 text-slate-500 dark:text-slate-400">Perfect for getting started and trying out MedStudy.</p>
        <ul className="space-y-3 text-sm flex-1">
          {[
            { text: '50 AI questions/day', included: true },
            { text: '10 tutor messages/day', included: true },
            { text: '5 content sources', included: true },
            { text: 'MCQs & Flashcards', included: true },
            { text: 'Basic analytics', included: true },
            { text: 'Fill-in-the-blank', included: false },
            { text: 'Clinical cases', included: false },
            { text: 'Exam simulation', included: false },
          ].map((item, i) => <FeatureItem key={item.text} text={item.text} included={item.included} index={i} />)}
        </ul>
        <Link href="/signup" className="mt-6 block text-center px-6 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white">
          Get Started Free
        </Link>
      </div>

      {/* Pro */}
      <div
        ref={pro.ref}
        className="rounded-2xl border-2 border-blue-500 p-6 flex flex-col relative bg-white dark:bg-slate-800"
        style={{
          opacity: pro.visible ? 1 : 0,
          transform: pro.visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
          transition: 'opacity 0.6s ease 0.12s, transform 0.6s ease 0.12s',
          boxShadow: `0 0 ${glowSize}px ${glowSize / 2}px rgba(59,130,246,0.18), 0 8px 32px rgba(59,130,246,0.12)`,
        }}
      >
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3" /> Most Popular
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro</h3>
        <div className="mt-3 mb-1">
          <AnimatedPrice value={7.99} delay={320} />
          <span className="ml-1 text-slate-500 dark:text-slate-400">/month</span>
        </div>
        <p className="text-xs mb-1 text-slate-500 dark:text-slate-400">or £4.99/mo billed annually</p>
        <p className="text-sm mb-6 text-slate-500 dark:text-slate-400">For serious students who want the full toolkit.</p>
        <ul className="space-y-3 text-sm flex-1">
          {[
            { text: '250 AI questions/day', included: true },
            { text: '100 tutor messages/day', included: true },
            { text: '50 content sources', included: true },
            { text: 'All question types', included: true },
            { text: 'AI lessons & summaries', included: true },
            { text: 'Fill-in-the-blank & Short answer', included: true },
            { text: 'Study rooms (create & join)', included: true },
            { text: 'Clinical cases', included: false },
            { text: 'Exam simulation', included: false },
          ].map((item, i) => <FeatureItem key={item.text} text={item.text} included={item.included} index={i} />)}
        </ul>
        <Link href="/signup" className="mt-6 block text-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          Start Pro Trial
        </Link>
      </div>

      {/* Max */}
      <div
        ref={max.ref}
        className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col relative bg-white dark:bg-slate-800"
        style={{
          opacity: max.visible ? 1 : 0,
          transform: max.visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
          transition: 'opacity 0.6s ease 0.24s, transform 0.6s ease 0.24s',
        }}
      >
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">Unlimited</div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Max</h3>
        <div className="mt-3 mb-1">
          <AnimatedPrice value={14.99} delay={440} />
          <span className="ml-1 text-slate-500 dark:text-slate-400">/month</span>
        </div>
        <p className="text-xs mb-1 text-slate-500 dark:text-slate-400">or £9.99/mo billed annually</p>
        <p className="text-sm mb-6 text-slate-500 dark:text-slate-400">No limits. Every feature. Total peace of mind.</p>
        <ul className="space-y-3 text-sm flex-1">
          {['Unlimited questions/day', 'Unlimited tutor messages', 'Unlimited sources', 'All question types', 'AI lessons & summaries', 'Clinical case generation', 'Full exam simulation lab', 'Priority support'].map((text, i) => (
            <FeatureItem key={text} text={text} included={true} index={i} />
          ))}
        </ul>
        <Link href="/signup" className="mt-6 block text-center px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-colors shadow-sm">
          Go Max
        </Link>
      </div>
    </div>
  );
}
