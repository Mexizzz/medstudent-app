import Link from 'next/link';
import {
  Stethoscope, Brain, BookOpen, Users, BarChart2, GraduationCap,
  Mic, Zap, ArrowRight, CheckCircle2, MessageCircle, Target,
  FlaskConical, XCircle, Lightbulb, CalendarDays, UserPlus, Heart, Sparkles
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-card">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Stethoscope className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-bold text-xl text-foreground">MedStudy</span>
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Beta</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              Log in
            </Link>
            <Link href="/signup" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
              Sign up free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold mb-6 border border-emerald-200">
            <Sparkles className="w-4 h-4" />
            Free during Beta — No limits, no credit card
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Your AI Study Partner for <span className="text-blue-600">Medical School</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload your lectures, notes, or textbooks — MedStudy&apos;s AI instantly creates questions, flashcards, and study plans personalized to <em>your</em> material. Study smarter, track your progress, and connect with classmates.
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
              className="flex items-center gap-2 px-6 py-3.5 bg-card text-foreground rounded-xl text-base font-semibold hover:bg-muted transition-colors border border-border"
            >
              See How It Works
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Free</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant access</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Your data stays yours</span>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Medical School Is Hard. Studying Doesn&apos;t Have to Be.</h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              You&apos;re drowning in lecture slides, anatomy atlases, and textbook chapters. Making your own flashcards takes hours. MedStudy does the heavy lifting so you can focus on <strong className="text-foreground">actually learning</strong>.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                emoji: '1',
                title: 'Upload Anything',
                desc: 'Paste your lecture notes, upload PDFs, or drop a YouTube link. MedStudy reads and understands your content in seconds.',
              },
              {
                emoji: '2',
                title: 'AI Creates Your Study Material',
                desc: 'Get MCQs, fill-in-the-blank questions, short answers, clinical cases, and summaries — all generated from YOUR specific material.',
              },
              {
                emoji: '3',
                title: 'Study, Review, Improve',
                desc: 'Take quizzes, review wrong answers, track your weak topics, and watch your scores climb. The AI adapts to what you need most.',
              },
            ].map(({ emoji, title, desc }) => (
              <div key={emoji} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-blue-500/20">
                  {emoji}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-muted py-16 sm:py-24" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Packed with Features Built for Med Students</h2>
            <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
              Every tool you need in one place — no switching between apps.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Brain,
                title: 'AI Question Generator',
                desc: 'Upload any content and instantly get MCQs, fill-in-the-blank, and short answer questions. Each set is unique to your material.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                icon: GraduationCap,
                title: 'AI Tutor Chat',
                desc: 'Chat with a personalized AI tutor that knows your weak topics, reviews your wrong answers, and explains concepts clearly.',
                color: 'bg-violet-50 text-violet-600',
              },
              {
                icon: BarChart2,
                title: 'Smart Analytics',
                desc: 'Detailed dashboards showing accuracy by topic, study streaks, time spent, and progress trends over weeks.',
                color: 'bg-emerald-50 text-emerald-600',
              },
              {
                icon: Users,
                title: 'Study Rooms',
                desc: 'Create or join live rooms with study timers, group chat, and see how long everyone has been studying.',
                color: 'bg-orange-50 text-orange-600',
              },
              {
                icon: Mic,
                title: 'Voice Chat',
                desc: 'Built-in voice calls in study rooms. Room creators can mute participants. Study together from anywhere.',
                color: 'bg-pink-50 text-pink-600',
              },
              {
                icon: FlaskConical,
                title: 'Exam Simulation',
                desc: 'Simulate real exam conditions with timed sessions, randomized question pools, and detailed score breakdowns.',
                color: 'bg-red-50 text-red-600',
              },
              {
                icon: XCircle,
                title: 'Wrong Answer Review',
                desc: 'All your mistakes in one place. Quiz yourself specifically on questions you got wrong until you master them.',
                color: 'bg-amber-50 text-amber-600',
              },
              {
                icon: CalendarDays,
                title: 'Study Planner',
                desc: 'Set goals, track daily study time, and build consistent habits with streak tracking and XP rewards.',
                color: 'bg-indigo-50 text-indigo-600',
              },
              {
                icon: UserPlus,
                title: 'Friends & Messaging',
                desc: 'Add classmates, send direct messages, and motivate each other. See your friends\' ranks and progress.',
                color: 'bg-teal-50 text-teal-600',
              },
              {
                icon: Lightbulb,
                title: 'AI Lessons',
                desc: 'AI-generated lesson summaries and breakdowns of complex topics, personalized to your content.',
                color: 'bg-yellow-50 text-yellow-600',
              },
              {
                icon: Target,
                title: 'Weakness Targeting',
                desc: 'The AI identifies your weakest topics and creates targeted drill sessions to close knowledge gaps.',
                color: 'bg-rose-50 text-rose-600',
              },
              {
                icon: BookOpen,
                title: 'Content Library',
                desc: 'All your uploaded materials organized in one place. Generate new question sets from any source anytime.',
                color: 'bg-cyan-50 text-cyan-600',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-border transition-all group">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta Banner */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-card/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-card/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-card/15 rounded-full text-sm font-semibold mb-4">
                <Zap className="w-3.5 h-3.5" />
                Beta Program
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                We&apos;re in Beta — And That Means <span className="text-amber-300">Completely Free</span>
              </h2>
              <p className="mt-4 text-lg text-blue-100 leading-relaxed">
                MedStudy is in active development, and we&apos;re giving early users full access to every feature at no cost. No trials, no paywalls, no limits. Use everything while we perfect the platform.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  'All features unlocked — AI questions, tutor, analytics, study rooms, voice chat',
                  'Unlimited content uploads and question generation',
                  'Your feedback directly shapes what we build next',
                ].map(text => (
                  <div key={text} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-50">{text}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-card text-blue-700 rounded-xl text-base font-bold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Join the Beta <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* We Listen Section */}
      <section className="bg-muted py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-semibold mb-4 border border-rose-200">
                <Heart className="w-3.5 h-3.5" />
                Built With Students
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                Your Voice Shapes MedStudy
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                We&apos;re not just building <em>for</em> medical students — we&apos;re building <em>with</em> you. Every feature request, bug report, and suggestion from our users is reviewed and prioritized.
              </p>
              <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                Have an idea that would make your study life easier? Tell us. We actively implement student requests and ship improvements every week.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: MessageCircle,
                  title: 'Request Features',
                  desc: 'Want something new? Suggest it directly and we\'ll prioritize it based on student demand.',
                  color: 'bg-blue-50 text-blue-600',
                },
                {
                  icon: Zap,
                  title: 'Weekly Updates',
                  desc: 'We ship new features and improvements every week based on real student feedback.',
                  color: 'bg-amber-50 text-amber-600',
                },
                {
                  icon: Heart,
                  title: 'Student-First Design',
                  desc: 'Every decision is made with one question: does this help students learn better?',
                  color: 'bg-rose-50 text-rose-600',
                },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex gap-4 bg-card p-5 rounded-xl border border-border">
                  <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Stop Wasting Hours Making Flashcards.<br />
            <span className="text-blue-600">Let AI Do It in Seconds.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
            Join the beta and get full access to every feature — completely free. Your exams won&apos;t wait, and neither should you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl"
            >
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-4 text-muted-foreground rounded-xl text-lg font-medium hover:bg-muted transition-colors"
            >
              Already have an account? Log in
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Free during beta. No credit card. No limits. No catch.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-foreground">MedStudy</span>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase rounded tracking-wider">Beta</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MedStudy. Built with care for medical students everywhere.
          </p>
        </div>
      </footer>
    </div>
  );
}
