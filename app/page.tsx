import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroPlayer } from '@/components/animations/HeroPlayer';
import { AnimatedStatsBar } from '@/components/animations/StatsCounter';
import { AnimatedSteps } from '@/components/animations/AnimatedSteps';
import { AnimatedPricingCards } from '@/components/animations/AnimatedPricingCards';
import { AnimatedTestimonials } from '@/components/animations/AnimatedTestimonials';
import { AnimatedFeatureCards } from '@/components/animations/AnimatedFeatureCards';
import { HeroNoisePlayer } from '@/components/animations/NoisePlayer';
import { ForceLightMode } from '@/components/ForceLightMode';
import {
  Zap, ArrowRight, CheckCircle2, MessageCircle,
  Heart, Sparkles, Crown, Check, X, ChevronDown, Globe
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
        <HeroNoisePlayer />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
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

          {/* Hero Animation */}
          <div className="mt-14 max-w-2xl mx-auto">
            <HeroPlayer />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <AnimatedStatsBar />

      {/* Problem / Solution */}
      <section className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Medical School Is Hard. Studying Doesn&apos;t Have to Be.</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              You&apos;re drowning in lecture slides, anatomy atlases, and textbook chapters. Making your own flashcards takes hours. MedStudy does the heavy lifting so you can focus on <strong className="text-slate-900 dark:text-white">actually learning</strong>.
            </p>
          </div>
          <AnimatedSteps />
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
          <AnimatedFeatureCards />
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
          <AnimatedTestimonials />
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

          <AnimatedPricingCards />
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
