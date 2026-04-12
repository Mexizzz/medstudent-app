import type { Metadata } from 'next';
import Link from 'next/link';
import { ForceLightMode } from '@/components/ForceLightMode';
import {
  Brain, BookOpen, Users, BarChart2, GraduationCap,
  Mic, Zap, ArrowRight, CheckCircle2, MessageCircle, Target,
  FlaskConical, XCircle, Lightbulb, CalendarDays, UserPlus, Heart, Sparkles,
  Crown, Check, X, ChevronDown, Star, TrendingUp, Globe
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'MedStudy — #1 AI Study App for Medical Students | Free MCQ Generator',
  description:
    'MedStudy is the AI-powered medical study app trusted by students worldwide. Upload notes → get instant MCQs, flashcards & clinical cases. Free for USMLE, PLAB, UKMLA, AMC prep.',
  alternates: { canonical: 'https://www.medstudy.space' },
  openGraph: {
    title: 'MedStudy — AI-Powered Medical Study App | Free MCQ & Flashcard Generator',
    description:
      'Upload your medical notes and instantly generate MCQs, flashcards, clinical cases. AI tutor, study rooms, analytics. Free plan available.',
    url: 'https://www.medstudy.space',
    type: 'website',
  },
};

const FAQS = [
  {
    q: 'What is MedStudy?',
    a: 'MedStudy is a free AI-powered study platform for medical students. Upload your lecture notes, PDFs, or paste text and it instantly generates MCQs, flashcards, fill-in-the-blank questions, and clinical cases. It also includes a personalized AI tutor, collaborative study rooms, analytics, spaced repetition, and more.',
  },
  {
    q: 'Is MedStudy free to use?',
    a: 'Yes — MedStudy has a generous free plan with question generation, AI tutor access, study sessions, and analytics. No credit card required. Pro (£7.99/mo) and Max (£14.99/mo) plans unlock additional features like unlimited questions, exam simulation, and clinical case generation.',
  },
  {
    q: 'What types of questions can MedStudy generate?',
    a: 'MedStudy generates multiple choice questions (MCQs), flashcards, fill-in-the-blank, short answer questions, and full clinical case scenarios — all AI-generated from your own study materials.',
  },
  {
    q: 'Does MedStudy work for USMLE, PLAB, and UKMLA?',
    a: 'Yes. MedStudy works for any medical exam worldwide — USMLE Step 1 & 2, PLAB, UKMLA, AMC, MCCQE, and any university-based medical curriculum. Since questions are generated from your own uploaded material, it adapts to any syllabus.',
  },
  {
    q: 'How is MedStudy different from Anki or Osmosis?',
    a: 'Unlike Anki, MedStudy generates questions automatically from your own notes — no manual card creation. Unlike Osmosis, questions come from YOUR specific lecture material rather than generic question banks. MedStudy combines AI question generation, an AI tutor, study rooms, and analytics in one free platform.',
  },
  {
    q: 'Can I study with friends on MedStudy?',
    a: 'Yes! MedStudy includes collaborative study rooms with voice chat, a friends system, a global leaderboard, and real-time quizzing so you can study with classmates no matter where you are.',
  },
  {
    q: 'How does the AI tutor work?',
    a: 'The AI tutor is a personalized chat assistant that knows your weak topics and past wrong answers. Ask it anything about your material and it gives targeted explanations to fill your knowledge gaps — like having a personal tutor available 24/7.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <ForceLightMode />
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-lg bg-gradient-to-br from-blue-800 via-blue-500 to-cyan-400">
              M
            </div>
            <span className="font-bold text-xl text-slate-900 dark:text-white">MedStudy</span>
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold uppercase rounded-full tracking-wider">AI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/blog" className="hidden sm:block text-sm font-medium px-3 py-2 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Blog</Link>
            <Link href="#pricing" className="text-sm font-medium px-3 py-2 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Pricing</Link>
            <Link href="#faq" className="hidden sm:block text-sm font-medium px-3 py-2 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">FAQ</Link>
            <Link href="/login" className="text-sm font-medium px-3 py-2 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Log in</Link>
            <Link href="/signup" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
              Sign up free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-slate-800 dark:to-slate-900">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-semibold mb-6 border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="w-4 h-4" />
            Start free — Upgrade anytime
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto text-slate-900 dark:text-white">
            The AI Study App for <span className="text-blue-600 dark:text-blue-400">Medical Students</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed text-slate-600 dark:text-slate-300">
            Upload your lectures, notes, or textbooks — MedStudy&apos;s AI instantly generates MCQs, flashcards, and clinical cases tailored to <em>your</em> material. Built for USMLE, PLAB, UKMLA, AMC, MCCQE, and any medical curriculum worldwide.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
            >
              Start Studying for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold transition-colors border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              See How It Works
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free plan available</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant access</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Your data stays yours</span>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-900 dark:bg-blue-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            {[
              { value: '10,000+', label: 'Questions Generated' },
              { value: '50+', label: 'Countries' },
              { value: '4.8★', label: 'Average Rating' },
              { value: 'Free', label: 'To Get Started' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{value}</p>
                <p className="text-sm mt-1 text-blue-300">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Medical School Is Hard. Studying Doesn&apos;t Have to Be.</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              You&apos;re drowning in lecture slides, anatomy atlases, and textbook chapters. Making your own flashcards takes hours. MedStudy does the heavy lifting so you can focus on <strong className="text-slate-900 dark:text-white">actually learning</strong>.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload Anything',
                desc: 'Paste your lecture notes, upload PDFs, or drop a YouTube link. MedStudy reads and understands your content in seconds.',
              },
              {
                step: '2',
                title: 'AI Creates Your Study Material',
                desc: 'Get MCQs, fill-in-the-blank questions, short answers, clinical cases, and summaries — all generated from YOUR specific material.',
              },
              {
                step: '3',
                title: 'Study, Review, Improve',
                desc: 'Take quizzes, review wrong answers, track your weak topics, and watch your scores climb. The AI adapts to what you need most.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-blue-500/20">
                  {step}
                </div>
                <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-800/50" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Packed with Features Built for Med Students</h2>
            <p className="mt-3 text-lg max-w-xl mx-auto text-slate-600 dark:text-slate-300">
              Every tool you need in one place — no switching between apps.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: 'AI Question Generator', desc: 'Upload any content and instantly get MCQs, fill-in-the-blank, and short answer questions. Each set is unique to your material.', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
              { icon: GraduationCap, title: 'AI Tutor Chat', desc: 'Chat with a personalized AI tutor that knows your weak topics, reviews your wrong answers, and explains concepts clearly.', color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
              { icon: BarChart2, title: 'Smart Analytics', desc: 'Detailed dashboards showing accuracy by topic, study streaks, time spent, and progress trends over weeks.', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { icon: Users, title: 'Study Rooms', desc: 'Create or join live rooms with study timers, group chat, and see how long everyone has been studying.', color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
              { icon: Mic, title: 'Voice Chat', desc: 'Built-in voice calls in study rooms. Room creators can mute participants. Study together from anywhere.', color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
              { icon: FlaskConical, title: 'Exam Simulation', desc: 'Simulate real exam conditions with timed sessions, randomized question pools, and detailed score breakdowns.', color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
              { icon: XCircle, title: 'Wrong Answer Review', desc: 'All your mistakes in one place. Quiz yourself specifically on questions you got wrong until you master them.', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
              { icon: CalendarDays, title: 'Study Planner', desc: 'Set goals, track daily study time, and build consistent habits with streak tracking and XP rewards.', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
              { icon: UserPlus, title: 'Friends & Messaging', desc: "Add classmates, send direct messages, and motivate each other. See your friends' ranks and progress.", color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
              { icon: Lightbulb, title: 'AI Lessons', desc: 'AI-generated lesson summaries and breakdowns of complex topics, personalized to your content.', color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500' },
              { icon: Target, title: 'Weakness Targeting', desc: 'The AI identifies your weakest topics and creates targeted drill sessions to close knowledge gaps.', color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
              { icon: BookOpen, title: 'Content Library', desc: 'All your uploaded materials organized in one place. Generate new question sets from any source anytime.', color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all group bg-white dark:bg-slate-800">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold mb-1.5 text-slate-900 dark:text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison vs Anki / Osmosis */}
      <section className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">How MedStudy Compares</h2>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">See why medical students are switching to MedStudy</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="text-left px-4 py-3 font-semibold rounded-tl-xl text-slate-900 dark:text-white border-b-2 border-slate-200 dark:border-slate-600">Feature</th>
                  <th className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 text-center bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500">MedStudy ✦</th>
                  <th className="px-4 py-3 font-semibold text-center text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-600">Anki</th>
                  <th className="px-4 py-3 font-semibold text-center rounded-tr-xl text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-600">Osmosis</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Auto-generates questions from your notes', true, false, false],
                  ['AI tutor chat', true, false, false],
                  ['Free plan available', true, true, false],
                  ['Clinical case generation', true, false, false],
                  ['Study rooms with voice chat', true, false, false],
                  ['Works on any medical curriculum', true, true, false],
                  ['Wrong answer drill sessions', true, true, true],
                  ['Analytics & progress tracking', true, false, true],
                ].map(([feat, ms, anki, osm]) => (
                  <tr key={String(feat)} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{feat}</td>
                    <td className="px-4 py-3 text-center bg-blue-50/50 dark:bg-blue-900/10">
                      {ms ? <span className="text-emerald-500 font-bold text-base">✓</span> : <span className="text-slate-300 dark:text-slate-600">✗</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {anki ? <span className="text-emerald-500 font-bold text-base">✓</span> : <span className="text-slate-300 dark:text-slate-600">✗</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {osm ? <span className="text-emerald-500 font-bold text-base">✓</span> : <span className="text-slate-300 dark:text-slate-600">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Loved by Medical Students Worldwide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "MedStudy completely changed how I revise. I upload my lecture slides and have a full MCQ set ready in 30 seconds. My USMLE Step 1 score improved massively.",
                name: 'Sarah K.',
                role: 'Year 3 Medical Student, USMLE Prep',
                stars: 5,
              },
              {
                quote: "The AI tutor actually knows what I got wrong. It's like having a personal tutor available at 2am before my PLAB exam. The study rooms are amazing too.",
                name: 'James O.',
                role: 'PLAB Candidate, UK',
                stars: 5,
              },
              {
                quote: "I tried Anki but making cards took forever. MedStudy generates them automatically from my notes. Best free medical study app I've used. Highly recommend.",
                name: 'Priya M.',
                role: 'Final Year MBBS, India',
                stars: 5,
              },
            ].map(({ quote, name, role, stars }) => (
              <div key={name} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5 italic text-slate-600 dark:text-slate-300">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                  <p className="text-xs mt-0.5 text-slate-400 dark:text-slate-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-24 bg-white dark:bg-slate-900" id="pricing">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold mb-4 border border-blue-200 dark:border-blue-800">
              <Crown className="w-3.5 h-3.5" />
              Simple Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Choose Your Plan</h2>
            <p className="mt-3 text-lg max-w-xl mx-auto text-slate-500 dark:text-slate-400">
              Start free and upgrade as you need more power. Every plan includes core AI study features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col bg-white dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Free</h3>
              <div className="mt-3 mb-5">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">£0</span>
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
                ].map(item => (
                  <li key={item.text} className="flex items-center gap-2">
                    {item.included
                      ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <X className="w-4 h-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />}
                    <span className={item.included ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>{item.text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block text-center px-6 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white">
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-blue-500 p-6 flex flex-col relative shadow-lg shadow-blue-500/10 bg-white dark:bg-slate-800">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Most Popular</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro</h3>
              <div className="mt-3 mb-5">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">£7.99</span>
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
                ].map(item => (
                  <li key={item.text} className="flex items-center gap-2">
                    {item.included
                      ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <X className="w-4 h-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />}
                    <span className={item.included ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>{item.text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block text-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                Start Pro Trial
              </Link>
            </div>

            {/* Max */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col relative bg-white dark:bg-slate-800">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">Unlimited</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Max</h3>
              <div className="mt-3 mb-5">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">£14.99</span>
                <span className="ml-1 text-slate-500 dark:text-slate-400">/month</span>
              </div>
              <p className="text-xs mb-1 text-slate-500 dark:text-slate-400">or £9.99/mo billed annually</p>
              <p className="text-sm mb-6 text-slate-500 dark:text-slate-400">No limits. Every feature. Total peace of mind.</p>
              <ul className="space-y-3 text-sm flex-1">
                {['Unlimited questions/day', 'Unlimited tutor messages', 'Unlimited sources', 'All question types', 'AI lessons & summaries', 'Clinical case generation', 'Full exam simulation lab', 'Priority support'].map(text => (
                  <li key={text} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-900 dark:text-white">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block text-center px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-colors shadow-sm">
                Go Max
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* We Listen Section */}
      <section className="py-16 sm:py-20 bg-slate-100 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-sm font-semibold mb-4 border border-rose-200 dark:border-rose-800">
                <Heart className="w-3.5 h-3.5" />
                Built With Students
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight text-slate-900 dark:text-white">Your Voice Shapes MedStudy</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                We&apos;re not just building <em>for</em> medical students — we&apos;re building <em>with</em> you. Every feature request, bug report, and suggestion from our users is reviewed and prioritized.
              </p>
              <p className="mt-3 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                Have an idea that would make your study life easier? Tell us. We actively implement student requests and ship improvements every week.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: MessageCircle, title: 'Request Features', desc: "Want something new? Suggest it directly and we'll prioritize it based on student demand.", color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
                { icon: Zap, title: 'Weekly Updates', desc: 'We ship new features and improvements every week based on real student feedback.', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' },
                { icon: Heart, title: 'Student-First Design', desc: 'Every decision is made with one question: does this help students learn better?', color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                  <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-white dark:bg-slate-900" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">Everything you need to know about MedStudy</p>
          </div>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800">
                  <span>{q}</span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-180 text-slate-500 dark:text-slate-400" />
                </summary>
                <div className="px-5 py-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 bg-blue-900 dark:bg-blue-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Stop Wasting Hours Making Flashcards.<br />
            <span className="text-blue-300">Let AI Do It in Seconds.</span>
          </h2>
          <p className="mt-5 text-lg max-w-xl mx-auto text-blue-200">
            Sign up free and start generating questions in seconds. Your exams won&apos;t wait, and neither should you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-xl text-lg font-bold hover:bg-blue-50 transition-all shadow-lg"
            >
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-4 rounded-xl text-lg font-medium transition-colors hover:bg-blue-800 text-blue-300"
            >
              Already have an account? Log in
            </Link>
          </div>
          <p className="mt-5 text-sm text-blue-300">
            Free plan available. No credit card required. Upgrade anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-8 bg-slate-100 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-xs bg-gradient-to-br from-blue-800 via-blue-500 to-cyan-400">
                M
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">MedStudy</span>
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[9px] font-bold uppercase rounded tracking-wider">AI</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/login" className="hover:text-blue-600 transition-colors">Log in</Link>
              <Link href="/signup" className="hover:text-blue-600 transition-colors">Sign up free</Link>
              <Link href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
              <Link href="#faq" className="hover:text-blue-600 transition-colors">FAQ</Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} MedStudy. Built with care for medical students everywhere.
            </p>
            <p className="text-xs flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <Globe className="w-3 h-3" /> Available worldwide · USMLE · PLAB · UKMLA · AMC · MCCQE
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
