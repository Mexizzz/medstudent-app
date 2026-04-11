import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPosts, getPost } from '@/lib/blog';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';

const SITE_URL = 'https://www.medstudy.space';

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `${SITE_URL}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const allPosts = getAllPosts();
  const related = allPosts.filter(p => p.slug !== slug).slice(0, 2);

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
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-sm font-medium" style={{ color: '#64748b' }}>Blog</Link>
            <Link href="/signup" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors">
              Sign up free
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Back */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:text-blue-600 transition-colors" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="text-5xl mb-5">{post.coverEmoji}</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4" style={{ color: '#0f172a' }}>
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm" style={{ color: '#94a3b8' }}>
            <span>{post.author}</span>
            <span>·</span>
            <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readingTime} min read</span>
          </div>
        </div>

        {/* Content */}
        <article
          className="prose-blog"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA in article */}
        <div className="mt-12 p-6 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)', border: '1px solid #bfdbfe' }}>
          <p className="text-lg font-bold mb-1" style={{ color: '#0f172a' }}>Try MedStudy free today</p>
          <p className="text-sm mb-4" style={{ color: '#475569' }}>Upload your notes, generate questions instantly. No credit card required.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm">
            Start studying free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-6" style={{ color: '#0f172a' }}>More from the Blog</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group rounded-xl border p-5 hover:shadow-md transition-all" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                  <div className="text-2xl mb-2">{p.coverEmoji}</div>
                  <h3 className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors" style={{ color: '#0f172a' }}>{p.title}</h3>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#94a3b8' }}>
                    <Clock className="w-3 h-3" /> {p.readingTime} min read
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-16" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="font-semibold text-sm" style={{ color: '#0f172a' }}>MedStudy</Link>
          <p className="text-xs" style={{ color: '#94a3b8' }}>&copy; {new Date().getFullYear()} MedStudy</p>
        </div>
      </footer>

      <style>{`
        .prose-blog h2 { font-size: 1.5rem; font-weight: 700; margin: 2rem 0 1rem; color: #0f172a; }
        .prose-blog h3 { font-size: 1.2rem; font-weight: 600; margin: 1.5rem 0 0.75rem; color: #0f172a; }
        .prose-blog p { margin: 1rem 0; line-height: 1.75; color: #334155; }
        .prose-blog ul { margin: 1rem 0 1rem 1.5rem; list-style: disc; }
        .prose-blog ol { margin: 1rem 0 1rem 1.5rem; list-style: decimal; }
        .prose-blog li { margin: 0.4rem 0; line-height: 1.7; color: #334155; }
        .prose-blog strong { font-weight: 600; color: #0f172a; }
        .prose-blog em { font-style: italic; }
        .prose-blog a { color: #2563eb; text-decoration: underline; }
        .prose-blog a:hover { color: #1d4ed8; }
        .prose-blog table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.875rem; }
        .prose-blog th { background: #f8fafc; padding: 0.6rem 1rem; text-align: left; font-weight: 600; color: #0f172a; border-bottom: 2px solid #e2e8f0; }
        .prose-blog td { padding: 0.6rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .prose-blog tr:last-child td { border-bottom: none; }
        .prose-blog code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; font-family: monospace; color: #0f172a; }
        .prose-blog pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1.5rem 0; }
        .prose-blog blockquote { border-left: 3px solid #3b82f6; padding-left: 1rem; margin: 1.5rem 0; color: #475569; font-style: italic; }
        .prose-blog hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
      `}</style>
    </div>
  );
}
