"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Employee = {
  employeeNo: string;
  name: string;
  department: string;
  designation?: string;
  hours?: number;
  totalHours?: number;
  billableHours?: number;
  productivity: number;
};

type CategoryBreakdown = {
  categories: string[];
  hours: number[];
  total: number;
};

type EmployeeResponse = {
  success: boolean;
  employee?: Employee;
  categoryBreakdown?: CategoryBreakdown;
  error?: string;
};

const number = (value: number | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-AE", {
        maximumFractionDigits: 1,
      }).format(value);

const percentage = (value: number | undefined) =>
  value == null ? "—" : `${(value * 100).toFixed(1)}%`;

function EmployeeDetailContent() {
  const params = useParams<{ employeeNo: string }>();
  const searchParams = useSearchParams();

  const employeeNo = params.employeeNo;

  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const [data, setData] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadEmployee() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams({ employeeNo });

        if (year) query.set("year", year);
        if (month) query.set("month", month);

        const response = await fetch(`/api/employees?${query.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json()) as EmployeeResponse;

        if (!response.ok || !result.success || !result.employee) {
          throw new Error(result.error || "Unable to load employee details.");
        }

        setData(result);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load employee details.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadEmployee();

    return () => controller.abort();
  }, [employeeNo, year, month]);

  const employee = data?.employee;
  const breakdown = data?.categoryBreakdown;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/employees"
          className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to employees
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-4 w-72 animate-pulse rounded bg-slate-100" />
            <div className="mt-8 h-32 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"
          >
            {error}
          </div>
        ) : employee ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-indigo-600">
                Employee details
              </p>

              <h1 className="mt-2 text-2xl font-bold">
                {employee.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Employee No.: {employee.employeeNo}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Department",
                    value: employee.department || "—",
                  },
                  {
                    label: "Designation",
                    value: employee.designation || "—",
                  },
                  {
                    label: "Total Hours",
                    value: number(employee.totalHours ?? employee.hours),
                  },
                  {
                    label: "Productivity",
                    value: percentage(employee.productivity),
                  },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 break-words text-lg font-semibold">
                      {item.value}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-semibold">Category breakdown</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hours recorded in each activity category.
                </p>
              </div>

              {!breakdown || breakdown.categories.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">
                  No category breakdown is available for this employee.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Category</th>
                        <th className="px-5 py-3 text-right font-medium">
                          Hours
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {breakdown.categories.map((category, index) => (
                        <tr key={category}>
                          <td className="px-5 py-3 font-medium text-slate-700">
                            {category}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {number(breakdown.hours[index] ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold">
                      <tr>
                        <td className="px-5 py-3">Total</td>
                        <td className="px-5 py-3 text-right">
                          {number(breakdown.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function EmployeeDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-8">
          Loading employee details...
        </main>
      }
    >
      <EmployeeDetailContent />
    </Suspense>
  );
}