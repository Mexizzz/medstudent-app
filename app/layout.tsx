import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
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
    default: "MedStudy — AI-Powered Medical Study App for Medical Students Worldwide",
    template: "%s | MedStudy",
  },
  description:
    "MedStudy is a free AI-powered study platform for medical students worldwide. Upload your notes and instantly generate MCQs, flashcards, and clinical cases. Prepare for USMLE, PLAB, UKMLA, AMC, MCCQE or any medical exam with personalized AI tutoring and analytics.",
  keywords: [
    "medstudy",
    "medical study app",
    "AI medical questions",
    "medical student",
    "MCQ generator",
    "medical flashcards",
    "clinical cases",
    "USMLE study",
    "PLAB study app",
    "UKMLA revision",
    "medical exam prep",
    "AI tutor medicine",
    "study rooms medical",
    "med school study tool",
    "free medical study app",
    "AI flashcard generator",
    "spaced repetition medicine",
    "medical quiz generator",
    "upload notes generate questions",
    "medical school revision",
    "clinical case generator",
    "anatomy flashcards AI",
    "pharmacology MCQs",
    "pathology questions AI",
    "medical student app",
    "best medical study app 2025",
    "USMLE Step 1 study app",
    "USMLE Step 2 study app",
    "AMC exam preparation",
    "MCCQE study app",
    "medical student app worldwide",
    "free AI study tool doctors",
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
      "Generate AI-powered MCQs, flashcards & clinical cases from your notes. Study smarter with personalized analytics, voice study rooms, and an AI tutor. Free for medical students.",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "MedStudy — AI-Powered Medical Study App for Medical Students Worldwide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MedStudy — AI-Powered Medical Study App",
    description:
      "Generate AI-powered MCQs, flashcards & clinical cases from your notes. Free for medical students. USMLE, PLAB, UKMLA ready.",
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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  verification: {
    google: "sUerWaKDwdRHIZGr4nrgKimZQuQzi4KUKSwO-uNxbLs",
  },
};

// JSON-LD structured data
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MedStudy",
    url: SITE_URL,
    description:
      "AI-powered medical study platform. Generate MCQs, flashcards, and clinical cases from your notes. Features study rooms, AI tutor, analytics, and spaced repetition.",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Android",
    inLanguage: "en",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "GBP", name: "Free" },
      { "@type": "Offer", price: "7.99", priceCurrency: "GBP", name: "Pro", billingIncrement: "P1M" },
      { "@type": "Offer", price: "14.99", priceCurrency: "GBP", name: "Max", billingIncrement: "P1M" },
    ],
    featureList: [
      "AI-generated MCQs and flashcards",
      "Clinical case generation",
      "Personalized AI tutor",
      "Study analytics and progress tracking",
      "Collaborative study rooms with voice chat",
      "Spaced repetition system",
      "Wrong answers review",
      "Exam simulation mode",
      "Timed exam mode",
      "AI answer explanations",
      "Weekly study insights",
      "PDF & notes export",
      "Global leaderboard",
      "Custom themes",
    ],
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      audienceType: "Medical Students",
    },
    screenshot: `${SITE_URL}/og-image.png`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "120",
      bestRating: "5",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MedStudy",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: "AI-powered medical study platform for students worldwide.",
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is MedStudy?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "MedStudy is a free AI-powered study platform for medical students. Upload your notes and it generates MCQs, flashcards, and clinical cases instantly. It also features an AI tutor, collaborative study rooms, analytics, and spaced repetition.",
        },
      },
      {
        "@type": "Question",
        name: "Is MedStudy free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! MedStudy offers a generous free tier with question generation, AI tutor access, study sessions, and analytics. Pro (£7.99/mo) and Max (£14.99/mo) plans unlock additional features like timed exam mode, custom themes, and more.",
        },
      },
      {
        "@type": "Question",
        name: "What types of questions can MedStudy generate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "MedStudy generates multiple choice questions (MCQs), flashcards, fill-in-the-blank, short answer questions, and clinical case scenarios — all powered by AI from your own study materials.",
        },
      },
      {
        "@type": "Question",
        name: "Does MedStudy work for USMLE, PLAB, and UKMLA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. MedStudy works for any medical exam worldwide including USMLE, PLAB, UKMLA, and any university-based medical curriculum. The AI generates questions from your own uploaded material so it adapts to any syllabus.",
        },
      },
      {
        "@type": "Question",
        name: "Can I study with friends on MedStudy?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! MedStudy includes collaborative study rooms with voice chat, a friends system, leaderboard, and real-time quizzing so you can study with classmates.",
        },
      },
      {
        "@type": "Question",
        name: "How does the AI tutor work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The AI tutor is a personalized chat assistant that knows your weak topics and wrong answers. Ask it anything about your material and it gives targeted explanations to fill your knowledge gaps.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to study with MedStudy",
    description: "Get started with AI-powered medical study in 3 steps",
    step: [
      {
        "@type": "HowToStep",
        name: "Upload your notes",
        text: "Upload your lecture notes, PDFs, or paste text from any medical textbook or resource.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Generate questions",
        text: "The AI instantly creates MCQs, flashcards, clinical cases, and short answer questions from your material.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Study and track progress",
        text: "Complete study sessions, review wrong answers, and use the AI tutor to fill knowledge gaps. Track your progress with analytics.",
        position: 3,
      },
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {jsonLd.map((ld, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
          />
        ))}
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
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2380490503915154"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
