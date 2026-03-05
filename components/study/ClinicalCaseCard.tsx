'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/db/schema';

interface ClinicalCaseCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, answer: string) => void;
}

export function ClinicalCaseCard({ question, onAnswer }: ClinicalCaseCardProps) {
  const [showExam, setShowExam] = useState(false);
  const [showInvestigations, setShowInvestigations] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [rated, setRated] = useState(false);

  function handleReveal() {
    setShowAnswer(true);
  }

  function rate(correct: boolean) {
    setRated(true);
    onAnswer(correct, correct ? 'correct' : 'incorrect');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-orange-300 text-orange-700">Clinical Case</Badge>
        {question.difficulty && (
          <Badge variant="secondary" className="capitalize text-xs">{question.difficulty}</Badge>
        )}
      </div>

      {/* Patient presentation */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 bg-slate-100 border-b border-slate-200 px-4 py-2.5">
          <Stethoscope className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-600">Patient Presentation</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-800 leading-relaxed">{question.caseScenario}</p>
        </div>
      </div>

      {/* Examination */}
      {question.examinationFindings && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowExam(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-600">Examination Findings</span>
            {showExam ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showExam && (
            <div className="px-4 pb-4 bg-white border-t border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed pt-3">{question.examinationFindings}</p>
            </div>
          )}
        </div>
      )}

      {/* Investigations */}
      {question.investigations && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowInvestigations(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-600">Investigation Results</span>
            {showInvestigations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showInvestigations && (
            <div className="px-4 pb-4 bg-white border-t border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed pt-3 font-mono text-xs">{question.investigations}</p>
            </div>
          )}
        </div>
      )}

      {/* The Question */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-500 uppercase mb-1.5">Question</p>
        <p className="text-sm font-medium text-blue-900">{question.caseQuestion}</p>
      </div>

      {!showAnswer && (
        <Button onClick={handleReveal} className="w-full">Reveal Answer & Rationale</Button>
      )}

      {showAnswer && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase mb-1.5">Answer</p>
            <p className="text-sm font-semibold text-emerald-900">{question.caseAnswer}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Rationale</p>
            <p className="text-sm text-slate-700 leading-relaxed">{question.caseRationale}</p>
          </div>

          {question.teachingPoint && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-500 uppercase mb-1">Teaching Point</p>
              <p className="text-sm text-purple-800">{question.teachingPoint}</p>
            </div>
          )}

          {!rated && (
            <div className="space-y-2">
              <p className="text-center text-sm text-slate-500">Did you get it right?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => rate(true)} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  Yes, I got it
                </Button>
                <Button onClick={() => rate(false)} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                  No, I was wrong
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
