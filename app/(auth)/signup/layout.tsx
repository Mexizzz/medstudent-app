import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a free MedStudy account. Generate AI-powered MCQs, flashcards, and clinical cases from your medical notes. Start studying smarter today.',
  alternates: { canonical: '/signup' },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
