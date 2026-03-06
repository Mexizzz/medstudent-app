import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Script from "next/script";

const SITE_URL = "https://www.medstudy.space";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "MedStudy — AI-Powered Medical Study App",
    template: "%s | MedStudy",
  },
  description:
    "MedStudy is a free AI-powered study platform for medical students. Generate MCQs, flashcards, and clinical cases from your own notes. Track progress with analytics, study rooms, and personalized AI tutoring.",
  keywords: [
    "medstudy",
    "medical study app",
    "AI medical questions",
    "medical student",
    "MCQ generator",
    "medical flashcards",
    "clinical cases",
    "USMLE study",
    "medical exam prep",
    "AI tutor medicine",
    "study rooms medical",
    "med school study tool",
    "free medical study app",
  ],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "MedStudy",
    title: "MedStudy — AI-Powered Medical Study App",
    description:
      "Generate AI-powered MCQs, flashcards & clinical cases from your notes. Study smarter with personalized analytics, voice study rooms, and an AI tutor.",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "MedStudy — AI-Powered Medical Study App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MedStudy — AI-Powered Medical Study App",
    description:
      "Generate AI-powered MCQs, flashcards & clinical cases from your notes. Study smarter with personalized analytics and AI tutoring.",
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: "sUerWaKDwdRHIZGr4nrgKimZQuQzi4KUKSwO-uNxbLs",
  },
};

// JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MedStudy",
  url: SITE_URL,
  description:
    "AI-powered medical study platform. Generate MCQs, flashcards, and clinical cases from your notes. Features study rooms, AI tutor, analytics, and spaced repetition.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI-generated MCQs and flashcards",
    "Clinical case generation",
    "Personalized AI tutor",
    "Study analytics and progress tracking",
    "Collaborative study rooms with voice chat",
    "Spaced repetition system",
    "Wrong answers review",
    "Exam simulation mode",
  ],
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
    audienceType: "Medical Students",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
