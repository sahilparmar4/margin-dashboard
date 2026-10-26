"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: "dashboard", href: "/" },
  { label: "Projects", icon: "projects", href: "/projects" },
  { label: "Employees", icon: "employees", href: "/employees" },
  { label: "Departments", icon: "departments", href: "/departments" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
      <div className="mb-8 px-3 py-2">
        <h1 className="text-lg font-bold text-slate-900">
          Margin Dashboard
        </h1>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {/* Replace with your existing Icon component */}
              <span>{item.label}</span>

              {active && (
                <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}