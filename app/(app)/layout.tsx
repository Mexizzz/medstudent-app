import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className="lg:pl-56 pt-14 lg:pt-0">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}
