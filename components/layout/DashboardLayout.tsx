import { Suspense, type ReactNode } from "react";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<div className="hidden w-64 md:block" />}>
         <Sidebar />
      </Suspense>

      <main className="min-h-screen md:ml-64">
        {children}
      </main>
    </div>
  );
}