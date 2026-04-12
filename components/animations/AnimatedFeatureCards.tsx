'use client';

import { useEffect, useRef, useState, ElementType } from 'react';
import {
  Brain, GraduationCap, BarChart2, Users, Mic, FlaskConical,
  XCircle, CalendarDays, UserPlus, Lightbulb, Target, BookOpen,
} from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI Question Generator', desc: 'Upload any content and instantly get MCQs, fill-in-the-blank, and short answer questions. Each set is unique to your material.', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { icon: GraduationCap, title: 'AI Tutor Chat', desc: 'Chat with a personalized AI tutor that knows your weak topics, reviews your wrong answers, and explains concepts clearly.', color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { icon: BarChart2, title: 'Smart Analytics', desc: 'Detailed dashboards showing accuracy by topic, study streaks, time spent, and progress trends over weeks.', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { icon: Users, title: 'Study Rooms', desc: 'Create or join live rooms with study timers, group chat, and see how long everyone has been studying.', color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { icon: Mic, title: 'Voice Chat', desc: 'Built-in voice calls in study rooms. Room creators can mute participants. Study together from anywhere.', color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
  { icon: FlaskConical, title: 'Exam Simulation', desc: 'Simulate real exam conditions with timed sessions, randomized question pools, and detailed score breakdowns.', color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  { icon: XCircle, title: 'Wrong Answer Review', desc: 'All your mistakes in one place. Quiz yourself specifically on questions you got wrong until you master them.', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' },
  { icon: CalendarDays, title: 'Study Planner', desc: 'Set goals, track daily study time, and build consistent habits with streak tracking and XP rewards.', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { icon: UserPlus, title: 'Friends & Messaging', desc: "Add classmates, send direct messages, and motivate each other. See your friends' ranks and progress.", color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
  { icon: Lightbulb, title: 'AI Lessons', desc: 'AI-generated lesson summaries and breakdowns of complex topics, personalized to your content.', color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500' },
  { icon: Target, title: 'Weakness Targeting', desc: 'The AI identifies your weakest topics and creates targeted drill sessions to close knowledge gaps.', color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  { icon: BookOpen, title: 'Content Library', desc: 'All your uploaded materials organized in one place. Generate new question sets from any source anytime.', color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
];

function FeatureCard({ icon: Icon, title, desc, color, index }: {
  icon: ElementType; title: string; desc: string; color: string; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Stagger in rows of 3
  const col = index % 3;
  const row = Math.floor(index / 3);
  const delay = col * 100 + row * 60;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800 cursor-default"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, box-shadow 0.2s ease`,
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.09)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}
        style={{
          transform: hovered ? 'scale(1.15) rotate(-4deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 0.25s ease',
        }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold mb-1.5 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
    </div>
  );
}

export function AnimatedFeatureCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {features.map((f, i) => (
        <FeatureCard key={f.title} {...f} index={i} />
      ))}
    </div>
  );
}
