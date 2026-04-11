import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { ArrowRight, Clock, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog — MedStudy | AI Study Tips for Medical Students',
  description:
    'Study tips, app comparisons, and guides for medical students. Learn how to use AI to study smarter for USMLE, PLAB, UKMLA, and more.',
  alternates: { canonical: 'https://www.medstudy.space/blog' },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen" style={{ background: '#ffffff', color: '#0f172a' }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderColor: '#e2e8f0' }}>
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)' }}>
              M
            </div>
            <span className="font-bold" style={{ color: '#0f172a' }}>MedStudy</span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase rounded tracking-wider">Blog</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium" style={{ color: '#64748b' }}>Log in</Link>
            <Link href="/signup" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors">
              Sign up free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="py-14 sm:py-20 border-b" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)', borderColor: '#e2e8f0' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: '#0f172a' }}>
            Study Smarter. Score Higher.
          </h1>
          <p className="mt-3 text-lg max-w-xl mx-auto" style={{ color: '#475569' }}>
            Guides, comparisons, and AI study tips for medical students preparing for USMLE, PLAB, UKMLA, and beyond.
          </p>
        </div>
      </section>

      {/* Posts */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {posts.length === 0 ? (
          <p className="text-center" style={{ color: '#64748b' }}>No posts yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border p-6 hover:shadow-md transition-all flex flex-col"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              >
                <div className="text-3xl mb-4">{post.coverEmoji}</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-lg font-bold leading-snug mb-2 group-hover:text-blue-600 transition-colors" style={{ color: '#0f172a' }}>
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: '#64748b' }}>{post.description}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <div className="flex items-center gap-3 text-xs" style={{ color: '#94a3b8' }}>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readingTime} min read</span>
                    <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-2 transition-all">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* CTA */}
      <section className="py-16 border-t" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#0f172a' }}>Ready to study smarter?</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Upload your notes and generate your first MCQ set in under a minute. Free to start.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">
            Try MedStudy Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>MedStudy</span>
          </Link>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            &copy; {new Date().getFullYear()} MedStudy. AI-powered study for medical students worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}
