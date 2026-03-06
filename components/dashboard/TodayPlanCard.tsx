import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Play, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ACTIVITY_LABELS, ACTIVITY_COLORS } from '@/lib/utils';

interface PlanItem {
  id: string;
  title: string;
  sourceIds: string;
  activityTypes: string;
  questionCount: number;
  isCompleted: boolean;
}

interface TodayPlanCardProps {
  plans: PlanItem[];
}

export function TodayPlanCard({ plans }: TodayPlanCardProps) {
  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium text-muted-foreground">No plan for today</p>
            <p className="text-sm text-muted-foreground">Set up your study plan for the day</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/study-plan">Create Study Plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          Today's Study Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plans.map(plan => {
          const actTypes: string[] = JSON.parse(plan.activityTypes);
          const sourceIds: string[] = JSON.parse(plan.sourceIds);

          return (
            <div key={plan.id} className={`flex items-center justify-between p-3 rounded-lg border ${plan.isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-card border-border'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {plan.isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  <p className="text-sm font-medium truncate">{plan.title}</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {actTypes.map(t => (
                    <span key={t} className={`text-xs px-1.5 py-0.5 rounded font-medium ${ACTIVITY_COLORS[t] ?? 'bg-muted text-muted-foreground'}`}>
                      {ACTIVITY_LABELS[t] ?? t}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground">{plan.questionCount} Qs</span>
                </div>
              </div>
              {!plan.isCompleted && (
                <Button asChild size="sm" className="ml-3 gap-1.5 flex-shrink-0">
                  <Link href={`/study?sourceIds=${sourceIds.join(',')}&types=${actTypes.join(',')}&count=${plan.questionCount}&planId=${plan.id}`}>
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
