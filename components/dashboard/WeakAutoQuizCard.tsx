'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Lock, Loader2, Crown } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';
import { toast } from 'sonner';

export function WeakAutoQuizCard({ tier }: { tier: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isMax = tier === 'max';

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch('/api/weakness/auto-quiz', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start');
        return;
      }
      toast.success(`Quiz created with ${data.total} questions from your weakest topics`);
      router.push(`/study/session/${data.sessionId}`);
    } catch {
      toast.error('Failed to start auto-quiz');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={isMax ? 'border-amber-200 bg-amber-50/30' : 'opacity-70'}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-xl ${isMax ? 'bg-amber-100' : 'bg-muted'}`}>
            <Zap className={`w-5 h-5 ${isMax ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-sm">Weak Topic Auto-Quiz</p>
              {!isMax && <TierBadge tier="max" size="sm" />}
            </div>
            <p className="text-xs text-muted-foreground">AI picks your weakest topics</p>
          </div>
        </div>
        {isMax ? (
          <Button size="sm" onClick={handleStart} disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Start Auto-Quiz
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" /> Upgrade to Max to unlock
          </div>
        )}
      </CardContent>
    </Card>
  );
}
