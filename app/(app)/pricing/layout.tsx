import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'MedStudy plans and pricing. Free, Pro ($7.99/mo), and Max ($14.99/mo) tiers. Unlock AI-powered MCQs, exam mode, study insights, custom themes, and more.',
  alternates: { canonical: '/pricing' },
  robots: { index: true, follow: true },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
