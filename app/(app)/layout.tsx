import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className="pl-56">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}
