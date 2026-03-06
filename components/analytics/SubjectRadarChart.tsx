'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';

interface SubjectData {
  subject: string;
  avgScore: number;
  totalAttempts: number;
}

export function SubjectRadarChart({ data }: { data: SubjectData[] }) {
  if (data.length < 3) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Study at least 3 subjects to see the radar chart
      </div>
    );
  }

  const chartData = data.map(d => ({
    subject: d.subject.length > 10 ? d.subject.slice(0, 10) + '…' : d.subject,
    score: Math.round(d.avgScore),
    fullSubject: d.subject,
    attempts: d.totalAttempts,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#2563eb"
          fill="#2563eb"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value, _, props) => [
            `${value}% (${props.payload?.attempts} attempts)`,
            props.payload?.fullSubject
          ]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
