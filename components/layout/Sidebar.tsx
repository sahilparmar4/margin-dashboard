"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: "dashboard", href: "/" },
  { label: "Projects", icon: "projects", href: "/projects" },
  { label: "Employees", icon: "employees", href: "/employees" },
  { label: "Departments", icon: "departments", href: "/departments" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg {...common} aria-hidden="true">
      {name === "dashboard" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      )}

      {name === "projects" && (
        <>
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M8 6V4h8v2M3 11h18M10 11v2h4v-2" />
        </>
      )}

      {name === "employees" && (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      )}

      {name === "departments" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="8.5" y="14" width="7" height="7" rx="1" />
          <path d="M6.5 10v2h11v-2M12 12v2" />
        </>
      )}

      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" />
        </>
      )}
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer when the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock background scrolling while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          Margin<span className="text-indigo-600">Board</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          className="flex h-10 cursor-pointer w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
        >
          {mobileOpen ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      {/* Sidebar: fixed on desktop, slide-in drawer on mobile */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            Margin<span className="text-indigo-600">Board</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-2 text-slate-500 md:hidden cursor-pointer"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>

          {navItems.slice(0, 4).map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  active
                    ? "bg-indigo-50 font-semibold text-indigo-700"
                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>

                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
                )}
              </Link>
            );
          })}

          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Configuration
          </p>

          {navItems.slice(4).map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  active
                    ? "bg-indigo-50 font-semibold text-indigo-700"
                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>

                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden p-4 md:block">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">
              Financial intelligence
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Monitor project costs, profitability and margins.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}