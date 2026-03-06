import type { Question } from '@/db/schema';
import { MCQCard } from './MCQCard';
import { FlashCard } from './FlashCard';
import { FillBlankCard } from './FillBlankCard';
import { ShortAnswerCard } from './ShortAnswerCard';
import { ClinicalCaseCard } from './ClinicalCaseCard';

interface ActivityRouterProps {
  question: Question;
  onAnswer: (isCorrect: boolean, answer: string, aiScore?: number, aiFeedback?: string) => void;
}

export function ActivityRouter({ question, onAnswer }: ActivityRouterProps) {
  switch (question.type) {
    case 'mcq':
      return <MCQCard question={question} onAnswer={onAnswer} />;
    case 'flashcard':
      return <FlashCard question={question} onAnswer={onAnswer} />;
    case 'fill_blank':
      return <FillBlankCard question={question} onAnswer={onAnswer} />;
    case 'short_answer':
    case 'structured':
    case 'table':
      return <ShortAnswerCard question={question} onAnswer={onAnswer} />;
    case 'clinical_case':
      return <ClinicalCaseCard question={question} onAnswer={onAnswer} />;
    default:
      return <div className="text-muted-foreground text-sm">Unknown question type: {question.type}</div>;
  }
}
