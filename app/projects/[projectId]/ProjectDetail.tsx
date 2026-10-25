"use client";

import DataTable, {
  type DataTableColumn,
} from "@/components/common/DataTable";
import ExportCsvButton from "@/components/ExportCsvButton";
import { CsvColumn } from "@/lib/utils/exportCsv";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DepartmentSummary = {
  department: string;
  hours: number;
  cost: number;
};

type EmployeeContribution = {
  employeeNo: string;
  name: string;
  department: string | null;
  hours: number;
  directCost: number;
  indirectCost: number;
  cost: number;
  revenue: number | null;
  profit: number | null;
  margin: number | null;
};

type ProjectDetail = {
  refCode: string;
  name: string | null;
  status: string | null;
  price: number | null;
  hasPrice: boolean;
  totalHours: number;
  directCost: number;
  indirectCost: number;
  cost: number;
  profit: number | null;
  margin: number | null;
  hoursByDepartment: DepartmentSummary[];
  employees: EmployeeContribution[];
};

type ProjectDetailResponse = {
  success: boolean;
  project?: ProjectDetail;
  error?: string;
};

const departmentCsvColumns: CsvColumn<DepartmentSummary>[] = [
  {
    header: "Department",
    accessor: (row) => row.department,
  },
  {
    header: "Hours",
    accessor: (row) => row.hours,
  },
  {
    header: "Cost (AED)",
    accessor: (row) => row.cost,
  },
];

const employeeCsvColumns: CsvColumn<EmployeeContribution>[] = [
  {
    header: "Employee No.",
    accessor: (row) => row.employeeNo,
  },
  {
    header: "Employee Name",
    accessor: (row) => row.name,
  },
  {
    header: "Department",
    accessor: (row) => row.department,
  },
  {
    header: "Hours",
    accessor: (row) => row.hours,
  },
  {
    header: "Direct Cost (AED)",
    accessor: (row) => row.directCost,
  },
  {
    header: "Indirect Cost (AED)",
    accessor: (row) => row.indirectCost,
  },
  {
    header: "Total Cost (AED)",
    accessor: (row) => row.cost,
  },
  {
    header: "Revenue Share (AED)",
    accessor: (row) => row.revenue,
  },
  {
    header: "Profit (AED)",
    accessor: (row) => row.profit,
  },
  {
    header: "Margin",
    accessor: (row) =>
      row.margin === null
        ? null
        : `${(row.margin * 100).toFixed(1)}%`,
  },
];

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

const departmentColumns: DataTableColumn<DepartmentSummary>[] = [
  {
    key: "department",
    header: "Department",
    sortable: true,
    render: (row) => (
      <span className="font-medium text-slate-800">
        {row.department}
      </span>
    ),
  },
  {
    key: "hours",
    header: "Hours",
    sortable: true,
    align: "right",
    render: (row) => number(row.hours),
  },
  {
    key: "cost",
    header: "Allocated Cost",
    sortable: true,
    align: "right",
    render: (row) => money(row.cost),
  },
];

const employeeColumns: DataTableColumn<EmployeeContribution>[] = [
  {
    key: "name",
    header: "Employee",
    sortable: true,
    render: (row) => (
      <div>
        <p className="font-semibold text-slate-800">{row.name}</p>
        <p className="mt-1 text-xs text-slate-400">
          {row.employeeNo}
        </p>
      </div>
    ),
  },
  {
    key: "department",
    header: "Department",
    sortable: true,
    render: (row) => row.department || "Unknown",
  },
  {
    key: "hours",
    header: "Hours",
    sortable: true,
    align: "right",
    render: (row) => number(row.hours),
  },
  {
    key: "directCost",
    header: "Direct Cost",
    sortable: true,
    align: "right",
    render: (row) => money(row.directCost),
  },
  {
    key: "indirectCost",
    header: "Indirect Cost",
    sortable: true,
    align: "right",
    render: (row) => money(row.indirectCost),
  },
  {
    key: "cost",
    header: "Total Cost",
    sortable: true,
    align: "right",
    render: (row) => money(row.cost),
  },
  {
    key: "revenue",
    header: "Revenue Share",
    sortable: true,
    align: "right",
    render: (row) => money(row.revenue),
  },
  {
    key: "profit",
    header: "Profit",
    sortable: true,
    align: "right",
    render: (row) => money(row.profit),
  },
  {
    key: "margin",
    header: "Margin",
    sortable: true,
    align: "right",
    render: (row) => percentage(row.margin),
  },
];

function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const escapeCell = (
    value: string | number | null | undefined,
  ) => {
    let text =
      value === null || value === undefined ? "" : String(value);

    // Prevent spreadsheet formula injection.
    if (/^[\t\r ]*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const content = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv")
    ? filename
    : `${filename}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function MetricCard({
  title,
  value,
  description,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  accent: "indigo" | "amber" | "emerald" | "rose" | "blue";
}) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div
        className={`mb-4 inline-flex rounded-lg px-2.5 py-1.5 text-xs font-semibold ${accents[accent]}`}
      >
        {title}
      </div>

      <p className="text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </section>
  );
}

function SectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function ProjectDetail({
  projectId,
}: {
  projectId: string;
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const loadProjectDetail = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      setProject(null);

      try {
        const query = new URLSearchParams({ projectId });

        const response = await fetch(
          `/api/projects?${query.toString()}`,
          {
            cache: "no-store",
            signal,
          },
        );

        const result =
          (await response.json()) as ProjectDetailResponse;

        if (!response.ok || !result.success || !result.project) {
          throw new Error(
            result.error || "Unable to load project details.",
          );
        }

        setProject(result.project);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load project details.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [projectId],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadProjectDetail(controller.signal);

    return () => controller.abort();
  }, [loadProjectDetail]);

  const departmentRows = project?.hoursByDepartment ?? [];
  const employeeRows = project?.employees ?? [];

  const exportDepartments = () => {
    if (!project) return;

    exportToCsv(
      `project-${project.refCode}-departments.csv`,
      ["Department", "Hours", "Cost (AED)"],
      departmentRows.map((row) => [
        row.department,
        row.hours,
        row.cost,
      ]),
    );
  };

  const exportEmployees = () => {
    if (!project) return;

    exportToCsv(
      `project-${project.refCode}-employees.csv`,
      [
        "Employee No.",
        "Employee Name",
        "Department",
        "Hours",
        "Direct Cost (AED)",
        "Indirect Cost (AED)",
        "Total Cost (AED)",
        "Revenue Share (AED)",
        "Profit (AED)",
        "Margin",
      ],
      employeeRows.map((row) => [
        row.employeeNo,
        row.name,
        row.department,
        row.hours,
        row.directCost,
        row.indirectCost,
        row.cost,
        row.revenue,
        row.profit,
        row.margin === null
          ? null
          : `${(row.margin * 100).toFixed(1)}%`,
      ]),
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Workspace / Projects
          </p>

          <h1 className="mt-1 text-lg font-bold tracking-tight">
            Project profitability
          </h1>
        </div>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
            <path d="M20 12H9" />
          </svg>

          Back to Projects
        </button>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
        <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Project analysis
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Understand the true cost of delivery.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review project revenue, allocated costs, departmental effort,
              and employee-level profitability.
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
                Unable to load project data
              </p>

              <p className="mt-1 text-sm text-rose-700">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadProjectDetail()}
              className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Retry
            </button>
          </section>
        )}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading project details…
          </div>
        )}

        {!loading && !error && !project && (
          <EmptyState
            title="Project not found"
            description="The requested project could not be found. Check the project URL and try again."
          />
        )}

        {!loading && !error && project && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {project.refCode}
                    </span>

                    {project.status && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {project.status}
                      </span>
                    )}

                    {!project.hasPrice && (
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Missing project price
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                    {project.name || "Unnamed project"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Full available project history
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Project price
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {money(project.price)}
                  </p>
                </div>
              </div>

              {!project.hasPrice && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Profitability cannot be calculated reliably.
                  </p>

                  <p className="mt-1 text-sm leading-5 text-amber-800">
                    This project has logged work but no recorded price.
                    Costs and hours are shown, but profit and margin are
                    unavailable.
                  </p>
                </div>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total hours"
                value={`${number(project.totalHours)} h`}
                description="Billable hours allocated to this project"
                accent="blue"
              />

              <MetricCard
                title="Total project cost"
                value={money(project.cost)}
                description={`Direct ${money(project.directCost)} · Indirect ${money(project.indirectCost)}`}
                accent="amber"
              />

              <MetricCard
                title="Project profit"
                value={money(project.profit)}
                description="Project price minus allocated project cost"
                accent={
                  project.profit === null
                    ? "amber"
                    : project.profit >= 0
                      ? "emerald"
                      : "rose"
                }
              />

              <MetricCard
                title="Profit margin"
                value={percentage(project.margin)}
                description="Profit as a share of project price"
                accent={
                  project.margin === null
                    ? "amber"
                    : project.margin >= 0
                      ? "emerald"
                      : "rose"
                }
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading
                title="Hours by department"
                description="See where the project's effort and allocated costs sit."
              >
                <ExportCsvButton
                    filename={`project-${project.refCode}-departments`}
                    columns={departmentCsvColumns}
                    rows={departmentRows}
                    disabled={loading}
                />
              </SectionHeading>

              <div className="mt-5 overflow-x-auto">
                {departmentRows.length === 0 ? (
                  <EmptyState
                    title="No departmental activity"
                    description="There are no billable hours recorded for this project."
                  />
                ) : (
                  <DataTable
                    columns={departmentColumns}
                    data={departmentRows}
                    rowKey={(row) => row.department}
                    emptyMessage="There are no billable hours recorded for this project."
                    onRowClick={(row) =>
                      router.push(
                        `/departments/${encodeURIComponent(row.department)}`
                      )
                    }
                  />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeading
                title="Employee contribution"
                description="Review each employee's effort, revenue share, cost, and profitability."
              >
                <ExportCsvButton
                    filename={`project-${project.refCode}-employees`}
                    columns={employeeCsvColumns}
                    rows={employeeRows}
                    disabled={loading}
                />
              </SectionHeading>

              <div className="mt-5 overflow-x-auto">
                {employeeRows.length === 0 ? (
                  <EmptyState
                    title="No employee contributions"
                    description="No employee-level billable activity is available for this project."
                  />
                ) : (
                  <DataTable
                    columns={employeeColumns}
                    data={employeeRows}
                    rowKey={(row) => row.employeeNo}
                    emptyMessage="No employee-level billable activity is available for this project."
                    onRowClick={(row) =>
                      router.push(
                        `/employees/${encodeURIComponent(row.employeeNo)}`
                      )
                    }
                  />
                )}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Employee revenue share is allocated by the calculation
                model. Profitability is unavailable when revenue share
                cannot be calculated.
              </p>
            </section>

            <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-4 text-xs text-slate-400 sm:flex-row">
              <span>MarginBoard · Project profitability</span>
              <span>Currency: AED · Values rounded for display</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}