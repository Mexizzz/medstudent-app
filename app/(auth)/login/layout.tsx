import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to MedStudy — your AI-powered medical study platform. Access your MCQs, flashcards, study rooms, and analytics.',
  alternates: { canonical: '/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
