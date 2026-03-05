import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Trophy, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { cn, scoreBg, durationLabel } from '@/lib/utils';

interface SessionResult {
  score: number;
  correctCount: number;
  totalAnswered: number;
  durationSeconds: number;
  responses: Array<{
    questionId: string;
    isCorrect: boolean;
    question: string;
    type: string;
  }>;
}

interface SessionSummaryProps {
  result: SessionResult;
  onRetry: () => void;
}

export function SessionSummary({ result, onRetry }: SessionSummaryProps) {
  const { score, correctCount, totalAnswered, durationSeconds } = result;
  const roundedScore = Math.round(score);

  const scoreEmoji = score >= 85 ? '🏆' : score >= 65 ? '👍' : score >= 40 ? '📚' : '💪';
  const scoreMsg = score >= 85 ? 'Excellent work!' : score >= 65 ? 'Good job!' : score >= 40 ? 'Keep studying!' : 'Keep going!';

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Score circle */}
      <div className="text-center space-y-2 py-4">
        <div className="text-6xl">{scoreEmoji}</div>
        <h2 className="text-2xl font-bold">{scoreMsg}</h2>
        <div className={cn(
          'inline-flex items-center gap-2 px-5 py-2 rounded-full text-xl font-bold border',
          scoreBg(roundedScore)
        )}>
          {roundedScore}%
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
            <div className="text-xs text-slate-500">Correct</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-500">{totalAnswered - correctCount}</div>
            <div className="text-xs text-slate-500">Incorrect</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-600">{durationLabel(durationSeconds)}</div>
            <div className="text-xs text-slate-500">Duration</div>
          </CardContent>
        </Card>
      </div>

      {/* Wrong answers */}
      {result.responses.filter(r => !r.isCorrect).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Questions to review:</h3>
          <div className="space-y-2">
            {result.responses.filter(r => !r.isCorrect).map((r, i) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <Badge variant="outline" className="text-xs mb-1 capitalize">{r.type.replace('_', ' ')}</Badge>
                  <p className="text-sm text-slate-700 line-clamp-2">{r.question}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 gap-2" onClick={onRetry}>
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
        <Button asChild className="flex-1">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
