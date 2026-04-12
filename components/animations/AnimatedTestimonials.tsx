'use client';

import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "MedStudy completely changed how I revise. I upload my lecture slides and have a full MCQ set ready in 30 seconds. My USMLE Step 1 score improved massively.",
    name: 'Sarah K.',
    role: 'Year 3 Medical Student, USMLE Prep',
    stars: 5,
    avatar: 'SK',
    color: 'bg-blue-500',
  },
  {
    quote: "The AI tutor actually knows what I got wrong. It's like having a personal tutor available at 2am before my PLAB exam. The study rooms are amazing too.",
    name: 'James O.',
    role: 'PLAB Candidate, UK',
    stars: 5,
    avatar: 'JO',
    color: 'bg-violet-500',
  },
  {
    quote: "I tried Anki but making cards took forever. MedStudy generates them automatically from my notes. Best free medical study app I've used. Highly recommend.",
    name: 'Priya M.',
    role: 'Final Year MBBS, India',
    stars: 5,
    avatar: 'PM',
    color: 'bg-emerald-500',
  },
];

function TestimonialCard({ quote, name, role, stars, avatar, color, index }: {
  quote: string; name: string; role: string; stars: number;
  avatar: string; color: string; index: number;
}) {
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
      className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 flex flex-col gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
        transition: `opacity 0.55s ease ${index * 120}ms, transform 0.55s ease ${index * 120}ms`,
      }}
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4 text-amber-400 fill-amber-400"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0)',
              transition: `opacity 0.3s ease ${index * 120 + i * 60}ms, transform 0.3s ease ${index * 120 + i * 60}ms`,
            }}
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed italic text-slate-600 dark:text-slate-300 flex-1">&ldquo;{quote}&rdquo;</p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
          <p className="text-xs mt-0.5 text-slate-400 dark:text-slate-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

export function AnimatedTestimonials() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {testimonials.map((t, i) => (
        <TestimonialCard key={t.name} {...t} index={i} />
      ))}
    </div>
  );
}
