'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';

interface SessionData {
  id: string;
  score: number | null;
  startedAt: Date | number;
  totalQuestions: number | null;
  correctCount: number | null;
}

export function PerformanceLineChart({ data }: { data: SessionData[] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        Complete more sessions to see your progress chart
      </div>
    );
  }

  const chartData = data.map((s, i) => ({
    name: `Session ${i + 1}`,
    score: s.score ? Math.round(s.score) : 0,
    date: s.startedAt ? format(new Date(s.startedAt), 'MMM d') : '',
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Tooltip
          formatter={(value) => [`${value}%`, 'Score']}
          labelStyle={{ color: '#334155' }}
        />
        <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Pass', fill: '#f59e0b', fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ fill: '#2563eb', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
