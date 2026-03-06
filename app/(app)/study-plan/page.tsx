'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DayPlanEditor } from '@/components/study-plan/DayPlanEditor';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Play, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ACTIVITY_LABELS, ACTIVITY_COLORS } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

interface PlanItem {
  id: string;
  planDate: string;
  title: string;
  sourceIds: string;
  activityTypes: string;
  questionCount: number;
  isCompleted: boolean;
}

interface Source {
  id: string;
  title: string;
  subject?: string | null;
}

export default function StudyPlanPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/study-plan');
    const data = await res.json();
    setPlans(data);
  }, []);

  useEffect(() => {
    fetchPlans();
    fetch('/api/content').then(r => r.json()).then(data => setSources(data)).catch(() => {});
  }, [fetchPlans]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get plans indexed by date string
  const plansByDate: Record<string, PlanItem[]> = {};
  for (const plan of plans) {
    if (!plansByDate[plan.planDate]) plansByDate[plan.planDate] = [];
    plansByDate[plan.planDate].push(plan);
  }

  async function handleDeletePlan(id: string, date: string) {
    await fetch(`/api/study-plan/${date}?id=${id}`, { method: 'DELETE' });
    toast.success('Removed');
    fetchPlans();
  }

  const selectedDatePlans = selectedDate ? (plansByDate[selectedDate] ?? []) : [];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Study Plan</h1>
        <p className="text-slate-500 text-sm mt-1">Plan your daily study sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="font-semibold text-slate-700">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for first week */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayPlans = plansByDate[dateStr] ?? [];
                  const hasPlans = dayPlans.length > 0;
                  const allDone = hasPlans && dayPlans.every(p => p.isCompleted);
                  const today = isToday(day);
                  const selected = selectedDate === dateStr;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(selected ? null : dateStr)}
                      className={`
                        relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                        ${selected ? 'bg-blue-600 text-white' : today ? 'bg-blue-50 border-2 border-blue-300' : 'hover:bg-slate-50'}
                        ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}
                      `}
                    >
                      <span className={`font-medium ${today && !selected ? 'text-blue-600' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {hasPlans && (
                        <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${allDone ? 'bg-emerald-400' : 'bg-blue-400'} ${selected ? 'bg-white' : ''}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day detail */}
        <div className="space-y-3">
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">
                  {format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy')}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setEditorOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>

              {selectedDatePlans.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No plans for this day.
                </div>
              ) : selectedDatePlans.map(plan => {
                const actTypes: string[] = JSON.parse(plan.activityTypes);
                const sourceIds: string[] = JSON.parse(plan.sourceIds);

                return (
                  <Card key={plan.id} className={plan.isCompleted ? 'bg-emerald-50 border-emerald-200' : ''}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {plan.isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                          <p className="text-sm font-medium">{plan.title}</p>
                        </div>
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                          onClick={() => handleDeletePlan(plan.id, selectedDate)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {actTypes.map(t => (
                          <span key={t} className={`text-xs px-1.5 py-0.5 rounded font-medium ${ACTIVITY_COLORS[t] ?? ''}`}>
                            {ACTIVITY_LABELS[t]}
                          </span>
                        ))}
                        <span className="text-xs text-slate-400">{plan.questionCount} Qs</span>
                      </div>
                      {!plan.isCompleted && (
                        <Button asChild size="sm" className="w-full gap-1.5">
                          <Link href={`/study?sourceIds=${sourceIds.join(',')}&types=${actTypes.join(',')}&count=${plan.questionCount}&planId=${plan.id}`}>
                            <Play className="w-3.5 h-3.5" />
                            Start
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Click a day to view or add plans
            </div>
          )}
        </div>
      </div>

      {selectedDate && (
        <DayPlanEditor
          date={selectedDate}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          sources={sources}
          onSuccess={fetchPlans}
        />
      )}
    </div>
  );
}
