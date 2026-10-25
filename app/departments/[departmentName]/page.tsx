"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type DepartmentEmployee = {
  employeeNo: string;
  name: string;
  department?: string;
  designation?: string;
  hours?: number;
  totalHours?: number;
  cost?: number;
  productivity?: number;
};

type DepartmentResponse = {
  success: boolean;
  department?: string;
  count?: number;
  employees?: DepartmentEmployee[];
  filters?: {
    year?: number;
    month?: number;
  };
  error?: string;
};

const number = (value: number | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-AE", {
        maximumFractionDigits: 1,
      }).format(value);

const money = (value: number | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-AE", {
        style: "currency",
        currency: "AED",
        maximumFractionDigits: 0,
      }).format(value);

const percentage = (value: number | undefined) =>
  value == null ? "—" : `${(value * 100).toFixed(1)}%`;

function DepartmentDetailContent() {
  const params = useParams<{ departmentName: string }>();
  const searchParams = useSearchParams();

  const departmentName = params.departmentName;
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const [data, setData] = useState<DepartmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDepartment() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams({
          department: departmentName,
        });

        if (year) query.set("year", year);
        if (month) query.set("month", month);

        const response = await fetch(
          `/api/departments?${query.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = (await response.json()) as DepartmentResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Unable to load department details.",
          );
        }

        setData(result);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load department details.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDepartment();

    return () => controller.abort();
  }, [departmentName, year, month]);

  const employees = data?.employees ?? [];

  const totalHours = employees.reduce(
    (sum, employee) => sum + (employee.totalHours ?? employee.hours ?? 0),
    0,
  );

  const totalCost = employees.reduce(
    (sum, employee) => sum + (employee.cost ?? 0),
    0,
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/departments"
          className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to departments
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
        ) : data ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-indigo-600">
                Department details
              </p>

              <h1 className="mt-2 text-2xl font-bold">
                {data.department}
              </h1>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Employees",
                    value: number(data.count ?? employees.length),
                  },
                  {
                    label: "Total Hours",
                    value: number(totalHours),
                  },
                  {
                    label: "Total Cost",
                    value: money(totalCost),
                  },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold">
                      {item.value}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-semibold">Department employees</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Employees associated with this department.
                </p>
              </div>

              {employees.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">
                  No employees found for this department in the selected period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">
                          Employee No.
                        </th>
                        <th className="px-5 py-3 font-medium">Employee</th>
                        <th className="px-5 py-3 font-medium">Designation</th>
                        <th className="px-5 py-3 text-right font-medium">
                          Hours
                        </th>
                        <th className="px-5 py-3 text-right font-medium">
                          Cost
                        </th>
                        <th className="px-5 py-3 text-right font-medium">
                          Productivity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.map((employee) => (
                        <tr
                          key={employee.employeeNo}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-3 text-slate-500">
                            {employee.employeeNo}
                          </td>
                          <td className="px-5 py-3 font-medium">
                            <Link
                              href={`/employees/${encodeURIComponent(employee.employeeNo)}`}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              {employee.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3">
                            {employee.designation || "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {number(employee.totalHours ?? employee.hours)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {money(employee.cost)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {percentage(employee.productivity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
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

export default function DepartmentDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-8">
          Loading department details...
        </main>
      }
    >
      <DepartmentDetailContent />
    </Suspense>
  );
}