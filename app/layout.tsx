import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "MedStudy — AI-Powered Medical Study App",
  description: "Study smarter with AI-generated questions, clinical cases, and personalized analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <TooltipProvider>
          <Sidebar />
          <div className="pl-56">
            <main className="min-h-screen">
              {children}
            </main>
          </div>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
