"use client";

import DataTable, {
  type DataTableColumn,
} from "@/components/common/DataTable";
import ExportCsvButton from "@/components/ExportCsvButton";
import { CsvColumn } from "@/lib/utils/exportCsv";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProjectSummary = {
  refCode: string;
  name: string | null;
  status: string | null;
  price: number | null;
  hours: number;
  cost: number;
  profit: number | null;
  margin: number | null;
  accessors?: string;
};

type ProjectListResponse = {
  success: boolean;
  projects?: ProjectSummary[];
  error?: string;
};

const money = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
};

const number = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 1,
  }).format(value);
};

const percentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";

  return `${(value * 100).toFixed(1)}%`;
};

const projectCsvColumns: CsvColumn<ProjectSummary>[] = [
  { header: "Project Code", accessor: (project) => project.refCode },
  { header: "Project Name", accessor: (project) => project.name },
  { header: "Status", accessor: (project) => project.status },
  { header: "Price (AED)", accessor: (project) => project.price },
  { header: "Hours", accessor: (project) => project.hours },
  { header: "Cost (AED)", accessor: (project) => project.cost },
  { header: "Profit (AED)", accessor: (project) => project.profit },
  {
    header: "Margin",
    accessor: (project) =>
      project.margin === null
        ? ""
        : `${(project.margin * 100).toFixed(1)}%`,
  },
];

const projectColumns: DataTableColumn<ProjectSummary>[] = [
  {
    key: "refCode",
    header: "Project Code",
    sortable: true,
    render: (project) => (
      <Link
        href={`/projects/${encodeURIComponent(project.refCode)}`}
        className="font-semibold text-indigo-600 hover:text-indigo-800"
      >
        {project.refCode || "—"}
      </Link>
    ),
  },
  {
    key: "name",
    header: "Project Name",
    sortable: true,
    render: (project) => (
      <Link
        href={`/projects/${encodeURIComponent(project.refCode)}`}
        className="font-semibold text-slate-800 hover:text-indigo-600"
      >
        {project.name || "Unnamed project"}
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (project) => {
      const status = project.status || "Unknown";

      return (
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {status}
        </span>
      );
    },
  },
  {
    key: "price",
    header: "Price",
    sortable: true,
    align: "right",
    render: (project) => money(project.price),
  },
  {
    key: "hours",
    header: "Hours",
    sortable: true,
    align: "right",
    render: (project) => number(project.hours),
  },
  {
    key: "cost",
    header: "Total Cost",
    sortable: true,
    align: "right",
    render: (project) => money(project.cost),
  },
  {
    key: "profit",
    header: "Profit",
    sortable: true,
    align: "right",
    render: (project) => (
      <span
        className={
          project.profit === null
            ? "text-slate-400"
            : project.profit >= 0
              ? "font-semibold text-emerald-700"
              : "font-semibold text-rose-700"
        }
      >
        {money(project.profit)}
      </span>
    ),
  },
  {
    key: "margin",
    header: "Margin",
    sortable: true,
    align: "right",
    render: (project) => (
      <span
        className={
          project.margin === null
            ? "text-slate-400"
            : project.margin >= 0
              ? "font-semibold text-emerald-700"
              : "font-semibold text-rose-700"
        }
      >
        {percentage(project.margin)}
      </span>
    ),
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        cache: "no-store",
      });

      const result = (await response.json()) as ProjectListResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load projects.");
      }

      setProjects(result.projects ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return projects;

    return projects.filter((project) =>
      [
        project.refCode,
        project.name,
        project.status,
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [projects, search]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Workspace / Projects
          </p>

          <h1 className="mt-1 text-lg font-bold tracking-tight">
            Projects
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Project management
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Project profitability
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Browse your projects and review their revenue, costs, profit,
              and margins. Select a project to view its detailed breakdown.
            </p>
          </div>

         <ExportCsvButton
            filename="projects"
            columns={projectCsvColumns}
            rows={filteredProjects}
            disabled={loading}
        />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Total projects
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "—" : projects.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Projects available for analysis
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Search results
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "—" : filteredProjects.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Projects matching your search
            </p>
          </div>
        </section>

        {error && (
          <section
            role="alert"
            className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-semibold text-rose-800">
                Unable to load projects
              </p>

              <p className="mt-1 text-sm text-rose-700">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => void loadProjects()}
              className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Retry
            </button>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h3 className="font-semibold text-slate-900">
                All projects
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Select a project code or name to view its details.
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by code, name, or status..."
                aria-label="Search projects"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-slate-800">
                Projects could not be loaded
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Retry to load your project data.
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18M9 10v10" />
                </svg>
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                {search ? "No matching projects" : "No projects found"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try another project code, name, or status."
                  : "Load your timesheet and project-price data to see project profitability."}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 sm:p-5">
              <DataTable
                columns={projectColumns}
                data={filteredProjects}
                rowKey={(project) => project.refCode}
                emptyMessage="No projects available."
                minWidth="1000px"
              />
            </div>
          )}

          {!loading && !error && filteredProjects.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-6">
              Showing {filteredProjects.length} of {projects.length} projects
            </div>
          )}
        </section>

        <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-4 text-xs text-slate-400 sm:flex-row">
          <span>MarginBoard · Project profitability</span>
          <span>Currency: AED · Values rounded for display</span>
        </footer>
      </main>
    </div>
  );
}