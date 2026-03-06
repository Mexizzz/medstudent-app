import Link from 'next/link';
import { Stethoscope, Brain, BookOpen, Users, BarChart2, GraduationCap, Mic, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Stethoscope className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-bold text-xl text-slate-900">MedStudy</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
              Log in
            </Link>
            <Link href="/signup" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
              Sign up free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
          <Zap className="w-3.5 h-3.5" />
          Powered by AI
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
          Study Medicine <span className="text-blue-600">Smarter</span>, Not Harder
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload your notes, textbooks, or lecture slides and let AI generate personalized MCQs, flashcards, and clinical cases. Track your progress, join study rooms, and ace your exams.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-200 transition-colors"
          >
            Log in
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">No credit card required. Free forever.</p>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16 sm:py-24" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Everything You Need to Excel</h2>
            <p className="mt-3 text-lg text-slate-500 max-w-xl mx-auto">
              Built specifically for medical students, powered by the latest AI technology.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI Question Generator',
                desc: 'Upload any medical content and get MCQs, fill-in-the-blank, and short answer questions generated instantly.',
              },
              {
                icon: GraduationCap,
                title: 'AI Tutor',
                desc: 'Chat with a personalized AI tutor that knows your weak topics and adapts to your learning style.',
              },
              {
                icon: BarChart2,
                title: 'Smart Analytics',
                desc: 'Track your study streaks, accuracy by topic, and progress over time with detailed dashboards.',
              },
              {
                icon: Users,
                title: 'Study Rooms',
                desc: 'Create or join live study rooms with timers, chat, and voice calls. Study together from anywhere.',
              },
              {
                icon: Mic,
                title: 'Voice Chat',
                desc: 'Built-in voice chat in study rooms. Room creators can manage and mute participants.',
              },
              {
                icon: BookOpen,
                title: 'Exam Mode',
                desc: 'Simulate real exam conditions with timed sessions, question pools, and detailed score breakdowns.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How It Works</h2>
            <p className="mt-3 text-lg text-slate-500">Three simple steps to supercharge your studying.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Upload Your Content', desc: 'Paste text, upload PDFs, or link YouTube lectures. MedStudy accepts any medical content.' },
              { step: '2', title: 'AI Generates Questions', desc: 'Our AI analyzes your material and creates MCQs, flashcards, clinical cases, and more.' },
              { step: '3', title: 'Study & Track Progress', desc: 'Take quizzes, review wrong answers, track analytics, and climb the rank leaderboard.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-10">Why Medical Students Choose MedStudy</h2>
            <div className="space-y-4">
              {[
                'AI-generated questions tailored to your exact study material',
                'Personalized AI tutor that adapts to your weak areas',
                'Collaborative study rooms with voice chat and study timers',
                'Detailed analytics and progress tracking across all topics',
                'Wrong answer review with spaced repetition for better retention',
                'Exam simulation mode with real exam-like conditions',
                'Works with any medical content — notes, PDFs, YouTube lectures',
                'Completely free — no subscription or credit card needed',
              ].map(text => (
                <div key={text} className="flex items-start gap-3 bg-white p-4 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Ready to Study Smarter?</h2>
          <p className="mt-4 text-lg text-slate-500">
            Join medical students who are using AI to transform their study sessions. Sign up in seconds.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
          >
            Start Studying Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">MedStudy</span>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} MedStudy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
