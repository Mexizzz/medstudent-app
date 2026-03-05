'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WeakTopic {
  id: string;
  subject: string;
  topic: string;
  avgScore: number | null;
  totalAttempts: number | null;
  confidence: number;
}

export function WeaknessRemediationCard({ weakTopics }: { weakTopics: WeakTopic[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  if (weakTopics.length === 0) return null;

  async function startDrill(topic: WeakTopic) {
    setLoading(topic.id);
    try {
      const res = await fetch('/api/weakness/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: topic.subject, topic: topic.topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create drill');
      router.push(`/study/session/${data.sessionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start drill');
      setLoading(null);
    }
  }

  return (
    <Card className="border-orange-100 bg-orange-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-orange-600">
          <Zap className="w-4 h-4" />
          Fix Your Weaknesses
        </CardTitle>
        <p className="text-xs text-slate-400">15-minute focused drills on your worst topics</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {weakTopics.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-orange-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{t.topic || t.subject}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-24">
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${Math.round(t.confidence)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{Math.round(t.confidence)}% confidence</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-orange-200 text-orange-700 hover:bg-orange-50"
              onClick={() => startDrill(t)}
              disabled={loading === t.id}
            >
              {loading === t.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : 'Drill →'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
