import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your MedStudy account password. Enter your email to receive a password reset code.',
  alternates: { canonical: '/forgot-password' },
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
