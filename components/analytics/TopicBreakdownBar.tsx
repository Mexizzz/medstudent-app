'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

interface TopicData {
  id: string;
  subject: string | null;
  topic: string | null;
  avgScore: number | null;
  totalAttempts: number | null;
}

export function TopicBreakdownBar({ data }: { data: TopicData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No topic data yet. Complete some study sessions first.
      </div>
    );
  }

  const chartData = data
    .filter(t => (t.totalAttempts ?? 0) >= 1)
    .slice(0, 15)
    .map(t => ({
      name: t.topic || t.subject || 'Unknown',
      score: Math.round(t.avgScore ?? 0),
      attempts: t.totalAttempts ?? 0,
    }));

  function barColor(score: number): string {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#d97706';
    return '#dc2626';
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} width={100} />
        <Tooltip
          formatter={(value, _, props) => [`${value}% (${props.payload?.attempts} attempts)`, 'Score']}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={barColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
