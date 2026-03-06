import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Youtube } from 'lucide-react';
import Link from 'next/link';
import { subjectColor, ACTIVITY_LABELS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SourceDetailPage({ params }: { params: Promise<{ sourceId: string }> }) {
  let userId: string;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
  } catch {
    redirect('/login');
  }

  const { sourceId } = await params;

  const source = await db.query.contentSources.findFirst({
    where: (s, { eq: e, and: a }) => a(e(s.id, sourceId), e(s.userId, userId)),
  });

  if (!source) notFound();

  const allQuestions = await db.select().from(questions).where(eq(questions.sourceId, sourceId));

  const byType: Record<string, typeof allQuestions> = {};
  for (const q of allQuestions) {
    if (!byType[q.type]) byType[q.type] = [];
    byType[q.type].push(q);
  }

  const types = Object.keys(byType);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <Link href="/library">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Button>
      </Link>

      {/* Source header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-slate-100 rounded-xl">
          {source.type === 'youtube'
            ? <Youtube className="w-7 h-7 text-red-500" />
            : <FileText className="w-7 h-7 text-blue-500" />
          }
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{source.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {source.subject && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subjectColor(source.subject)}`}>
                {source.subject}
              </span>
            )}
            {source.topic && <span className="text-sm text-slate-500">{source.topic}</span>}
            <Badge variant="outline" className="text-xs">
              {source.type === 'mcq_pdf' ? 'MCQ PDF' : source.type === 'youtube' ? 'YouTube' : 'PDF'}
            </Badge>
            {source.wordCount && (
              <span className="text-xs text-slate-400">{source.wordCount.toLocaleString()} words</span>
            )}
          </div>
          {source.youtubeUrl && (
            <a href={source.youtubeUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-blue-500 hover:underline mt-1 block">
              Watch on YouTube ↗
            </a>
          )}
        </div>
      </div>

      {/* Questions summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['mcq', 'flashcard', 'fill_blank', 'short_answer', 'clinical_case'].map(type => (
          <Card key={type} className={byType[type] ? '' : 'opacity-40'}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{byType[type]?.length ?? 0}</div>
              <div className="text-xs text-slate-500 mt-0.5">{ACTIVITY_LABELS[type]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Questions by type */}
      {types.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No questions generated yet.</p>
          <p className="text-sm">Go back to the Library and click Generate on this source.</p>
        </div>
      ) : (
        <Tabs defaultValue={types[0]}>
          <TabsList>
            {types.map(type => (
              <TabsTrigger key={type} value={type} className="gap-1.5">
                {ACTIVITY_LABELS[type] ?? type}
                <Badge variant="secondary" className="text-xs ml-1">{byType[type].length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {types.map(type => (
            <TabsContent key={type} value={type} className="space-y-3 mt-4">
              {byType[type].map((q, i) => (
                <Card key={q.id}>
                  <CardContent className="p-4 text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-slate-400 mt-0.5 flex-shrink-0">#{i + 1}</span>
                      <div className="flex-1 space-y-2">
                        {/* MCQ */}
                        {type === 'mcq' && (
                          <>
                            <p className="font-medium">{q.question}</p>
                            <div className="grid grid-cols-2 gap-1">
                              {(['A', 'B', 'C', 'D'] as const).map(opt => {
                                const text = q[`option${opt}` as keyof typeof q] as string;
                                if (!text) return null;
                                return (
                                  <div key={opt} className={`text-xs p-1.5 rounded border ${q.correctAnswer === opt ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold' : 'border-slate-100 text-slate-600'}`}>
                                    {opt}. {text}
                                  </div>
                                );
                              })}
                            </div>
                            {q.explanation && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">{q.explanation}</p>}
                          </>
                        )}
                        {/* Flashcard */}
                        {type === 'flashcard' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-400 font-semibold mb-1">Front</p>
                              <p>{q.front}</p>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-lg">
                              <p className="text-xs text-emerald-400 font-semibold mb-1">Back</p>
                              <p>{q.back}</p>
                            </div>
                          </div>
                        )}
                        {/* Fill blank */}
                        {type === 'fill_blank' && (
                          <>
                            <p className="bg-slate-50 p-2 rounded font-mono text-xs">{q.blankText}</p>
                            <p>Answer: <strong>{q.blankAnswer}</strong></p>
                          </>
                        )}
                        {/* Short answer */}
                        {type === 'short_answer' && (
                          <>
                            <p className="font-medium">{q.question}</p>
                            {q.keyPoints && (
                              <ul className="text-xs text-slate-500 space-y-0.5 list-disc list-inside">
                                {(JSON.parse(q.keyPoints) as string[]).map((kp, j) => <li key={j}>{kp}</li>)}
                              </ul>
                            )}
                            {q.modelAnswer && <p className="bg-slate-50 p-2 rounded text-xs">{q.modelAnswer}</p>}
                          </>
                        )}
                        {/* Clinical case */}
                        {type === 'clinical_case' && (
                          <>
                            <p className="bg-slate-50 p-2 rounded text-xs">{q.caseScenario}</p>
                            <p className="font-medium">{q.caseQuestion}</p>
                            <p className="text-emerald-700 font-semibold text-xs">{q.caseAnswer}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
