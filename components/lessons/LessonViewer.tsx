'use client';

import { SVGDiagram } from './SVGDiagram';
import { BookOpen, Lightbulb, Heart, CheckCircle2, Globe, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { LessonData } from '@/lib/lessons';

interface LessonViewerProps {
  lesson: LessonData;
}

export function LessonViewer({ lesson }: LessonViewerProps) {
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="text-center space-y-3 pb-6 border-b border-slate-200">
        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
          {lesson.topic}
        </Badge>
        <h1 className="text-2xl font-bold text-slate-800 leading-tight">{lesson.title}</h1>
        <p className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed">{lesson.overview}</p>
      </div>

      {/* Sections */}
      {lesson.sections.map((section, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-600">{i + 1}</span>
            </div>
            <h2 className="font-semibold text-slate-800">{section.heading}</h2>
          </div>

          {/* Main visual: web image takes priority, SVG is fallback */}
          {section.imageUrl ? (
            <div className="relative border-b border-slate-100 bg-white">
              <img
                src={section.imageUrl}
                alt={section.heading}
                className="w-full max-h-80 object-contain p-4"
              />
              <span className="absolute bottom-2 right-3 flex items-center gap-1 text-[10px] text-slate-400 bg-white/80 px-2 py-0.5 rounded-full border border-slate-100">
                <Globe className="w-2.5 h-2.5" /> Web
              </span>
            </div>
          ) : section.svgCode ? (
            <div className="p-5 bg-amber-50/40 border-b border-slate-100">
              <SVGDiagram svgCode={section.svgCode} />
            </div>
          ) : null}

          {/* Chat diagram update — real web image takes priority over SVG */}
          {(section.chatImageUrl || section.chatSvgCode) && (
            <div className="border-b border-slate-100 bg-violet-50/30">
              <div className="flex items-center gap-1.5 px-5 pt-3 pb-1">
                <Cpu className="w-3 h-3 text-violet-500" />
                <span className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">
                  {section.chatImageUrl ? 'Diagram from Web' : 'AI Diagram Update'}
                </span>
              </div>
              <div className="px-5 pb-4">
                {section.chatImageUrl ? (
                  <div className="relative bg-white rounded-xl border border-violet-100 overflow-hidden">
                    <img
                      src={section.chatImageUrl}
                      alt="Requested diagram"
                      className="w-full max-h-72 object-contain p-3"
                    />
                  </div>
                ) : section.chatSvgCode ? (
                  <SVGDiagram svgCode={section.chatSvgCode} />
                ) : null}
              </div>
            </div>
          )}

          {/* Explanation + Key Points */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-slate-600 text-sm leading-relaxed">{section.explanation}</p>

            {section.keyPoints?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Key Points
                </p>
                <ul className="space-y-1.5">
                  {section.keyPoints.map((pt, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Summary + Clinical Relevance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <p className="font-semibold text-blue-800 text-sm">Summary</p>
          </div>
          <p className="text-blue-700 text-sm leading-relaxed">{lesson.summary}</p>
        </div>
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-rose-600" />
            <p className="font-semibold text-rose-800 text-sm">Clinical Relevance</p>
          </div>
          <p className="text-rose-700 text-sm leading-relaxed">{lesson.clinicalRelevance}</p>
        </div>
      </div>
    </div>
  );
}
