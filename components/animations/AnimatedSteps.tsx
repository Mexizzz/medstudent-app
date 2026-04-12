'use client';

import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    step: '1',
    title: 'Upload Anything',
    desc: 'Paste your lecture notes, upload PDFs, or drop a YouTube link. MedStudy reads and understands your content in seconds.',
    icon: '📄',
  },
  {
    step: '2',
    title: 'AI Creates Your Study Material',
    desc: 'Get MCQs, fill-in-the-blank questions, short answers, clinical cases, and summaries — all generated from YOUR specific material.',
    icon: '🧠',
  },
  {
    step: '3',
    title: 'Study, Review, Improve',
    desc: 'Take quizzes, review wrong answers, track your weak topics, and watch your scores climb. The AI adapts to what you need most.',
    icon: '📈',
  },
];

function StepCard({ step, title, desc, icon, index }: { step: string; title: string; desc: string; icon: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="text-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.6s ease ${index * 150}ms, transform 0.6s ease ${index * 150}ms`,
      }}
    >
      <div className="relative w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-blue-500/20 overflow-hidden group">
        <span
          className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{ opacity: visible ? 0 : 1, transform: visible ? 'scale(0.5)' : 'scale(1)' }}
        >
          {step}
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center text-2xl transition-all duration-300"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(1.5)',
            transitionDelay: `${index * 150 + 400}ms`,
          }}
        >
          {icon}
        </span>
      </div>
      <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
    </div>
  );
}

export function AnimatedSteps() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {steps.map(({ step, title, desc, icon }, i) => (
        <StepCard key={step} step={step} title={title} desc={desc} icon={icon} index={i} />
      ))}
    </div>
  );
}
