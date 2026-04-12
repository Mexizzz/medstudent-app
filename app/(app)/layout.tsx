import { Sidebar } from "@/components/layout/Sidebar";
import { TrialBanner } from "@/components/layout/TrialBanner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className="lg:pl-56 pt-14 lg:pt-0">
        <TrialBanner />
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}
