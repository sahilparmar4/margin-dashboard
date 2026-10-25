"use client";

import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import ExportCsvButton from "@/components/ExportCsvButton";
import { CsvColumn } from "@/lib/utils/exportCsv";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";


type Employee = {
  employeeNo: string;
  name: string;
  department: string;
  totalHours: number;
  billableHours: number;
  productivity: number;
};

type EmployeesResponse = {
  success: boolean;
  count?: number;
  employees?: Employee[];
  error?: string;
};

const employeeCsvColumns: CsvColumn<Employee>[] = [
  { header: "Employee No.", accessor: (employee) => employee.employeeNo },
  { header: "Employee", accessor: (employee) => employee.name },
  { header: "Department", accessor: (employee) => employee.department },
  { header: "Total Hours", accessor: (employee) => employee.totalHours },
  { header: "Billable Hours", accessor: (employee) => employee.billableHours },
  {
    header: "Productivity",
    accessor: (employee) => percentage(employee.productivity),
  },
];

const employeeColumns: DataTableColumn<Employee>[] = [
  {
    key: "employeeNo",
    header: "Employee No.",
    sortable: true,
    render: (employee) => (
      <span className="font-medium text-slate-700">
        {employee.employeeNo || "—"}
      </span>
    ),
  },
  {
    key: "name",
    header: "Employee",
    sortable: true,
    render: (employee) => (
      <span className="font-semibold text-slate-800">
        {employee.name || "—"}
      </span>
    ),
  },
  {
    key: "department",
    header: "Department",
    sortable: true,
    render: (employee) => employee.department || "—",
  },
  {
    key: "totalHours",
    header: "Total Hours",
    sortable: true,
    align: "right",
    sortValue: (employee) => employee.totalHours,
    render: (employee) => number(employee.totalHours),
  },
  {
    key: "billableHours",
    header: "Billable Hours",
    sortable: true,
    align: "right",
    sortValue: (employee) => employee.billableHours,
    render: (employee) => number(employee.billableHours),
  },
  {
    key: "productivity",
    header: "Productivity",
    sortable: true,
    align: "right",
    sortValue: (employee) => employee.productivity,
    render: (employee) => percentage(employee.productivity),
  },
];

const number = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-AE", {
        maximumFractionDigits: 1,
      }).format(value);

const percentage = (value: number | null | undefined) =>
  value == null ? "—" : `${(value * 100).toFixed(1)}%`;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    async function loadEmployees() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/employees", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json()) as EmployeesResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load employees.");
        }

        setEmployees(result.employees ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Failed to load employees."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadEmployees();

    return () => controller.abort();
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return employees;

    return employees.filter((employee) =>
      [employee.name, employee.employeeNo, employee.department].some(
        (value) => value?.toLowerCase().includes(query)
      )
    );
  }, [employees, search]);

  const totalHours = filteredEmployees.reduce(
    (sum, employee) => sum + (employee.totalHours ?? 0),
    0
  );

  const billableHours = filteredEmployees.reduce(
    (sum, employee) => sum + (employee.billableHours ?? 0),
    0
  );

  // Overall productivity is weighted by hours, not averaged across employees.
  const overallProductivity =
    totalHours > 0 ? billableHours / totalHours : 0;

  return (
    <div className="min-w-0 bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Workspace / People
          </p>
          <h1 className="mt-1 text-lg font-bold tracking-tight">Employees</h1>
        </div>

        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          Employee performance
        </span>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              People analytics
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Understand your team&apos;s contribution.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review employee hours, billable work, and productivity.
            </p>
          </div>

            <ExportCsvButton
                filename="employees"
                columns={employeeCsvColumns}
                rows={filteredEmployees}
                disabled={loading}
            />
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Employees",
              value: String(filteredEmployees.length),
              description: "Employees matching your search",
            },
            {
              label: "Total Hours",
              value: `${number(totalHours)} h`,
              description: "Hours recorded",
            },
            {
              label: "Billable Hours",
              value: `${number(billableHours)} h`,
              description: "Hours assigned to billable work",
            },
            {
              label: "Productivity",
              value: percentage(overallProductivity),
              description: "Billable hours as a percentage of total hours",
            },
          ].map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>
              <p className="mt-4 break-words text-2xl font-bold tracking-tight">
                {metric.value}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {metric.description}
              </p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">Employee directory</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredEmployees.length} employees
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, ID or department..."
              aria-label="Search employees"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                columns={employeeColumns}
                data={filteredEmployees}
                rowKey={(employee) => employee.employeeNo}
                loading={loading}
                minWidth="900px"
                emptyMessage={
                  search
                    ? "No employees match your search."
                    : "No employee data available."
                }
                onRowClick={(employee) =>
                    router.push(`/employees/${encodeURIComponent(employee.employeeNo)}`)
                }
              />
            </div>
          )}
        </section>

        <footer className="border-t border-slate-200 py-4 text-xs text-slate-400">
          MarginBoard · Employee performance
        </footer>
      </div>
    </div>
  );
}