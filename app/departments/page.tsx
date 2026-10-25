"use client";

import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import ExportCsvButton from "@/components/ExportCsvButton";
import { CsvColumn } from "@/lib/utils/exportCsv";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Department = {
    department: string;
    name?: string;
    people?: number;
    employees?: number;
    totalHours?: number;
    hours?: number;
    billableHours?: number;
    cost?: number;
    revenue?: number | null;
    profit?: number | null;
    margin?: number | null;
};

type DepartmentsResponse = {
    success: boolean;
    count?: number;
    departments?: Department[];
    error?: string;
};

const departmentCsvColumns: CsvColumn<Department>[] = [
    {
        header: "Department",
        accessor: (department) =>
            department.department || department.name || "",
    },
    {
        header: "Employees",
        accessor: (department) =>
            department.people ?? department.employees ?? 0,
    },
    {
        header: "Total Hours",
        accessor: (department) =>
            department.totalHours ?? department.hours ?? 0,
    },
    {
        header: "Cost",
        accessor: (department) => department.cost ?? "",
    },
    {
        header: "Revenue",
        accessor: (department) => department.revenue ?? "",
    },
    {
        header: "Profit",
        accessor: (department) => department.profit ?? "",
    },
    {
        header: "Margin",
        accessor: (department) =>
            department.margin == null
                ? ""
                : `${(department.margin * 100).toFixed(1)}%`,
    },
];

const departmentColumns: DataTableColumn<Department>[] = [
    {
        key: "department",
        header: "Department",
        sortable: true,
        sortValue: (row) => row.department || row.name || "",
        render: (row) => (
            <span className="font-semibold text-slate-800">
                {row.department || row.name || "Unassigned"}
            </span>
        ),
    },
    {
        key: "people",
        header: "Employees",
        sortable: true,
        align: "right",
        sortValue: (row) => row.people ?? row.employees,
        render: (row) =>
            number(row.people ?? row.employees),
    },
    {
        key: "totalHours",
        header: "Total hours",
        sortable: true,
        align: "right",
        sortValue: (row) => row.totalHours ?? row.hours,
        render: (row) =>
            number(row.totalHours ?? row.hours),
    },
    {
        key: "cost",
        header: "Cost",
        sortable: true,
        align: "right",
        sortValue: (row) => row.cost,
        render: (row) => money(row.cost),
    },
];

const money = (value: number | null | undefined) =>
    value == null
        ? "—"
        : new Intl.NumberFormat("en-AE", {
            style: "currency",
            currency: "AED",
            maximumFractionDigits: 0,
        }).format(value);

const number = (value: number | null | undefined) =>
    value == null
        ? "—"
        : new Intl.NumberFormat("en-AE", {
            maximumFractionDigits: 1,
        }).format(value);

const percentage = (value: number | null | undefined) =>
    value == null ? "—" : `${(value * 100).toFixed(1)}%`;

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);

    const escapeCsv = (value: unknown) => {
        const text = value == null ? "" : String(value);
        return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) =>
            headers.map((header) => escapeCsv(row[header])).join(","),
        ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const controller = new AbortController();

        async function loadDepartments() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch("/api/departments", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                const result = (await response.json()) as DepartmentsResponse;

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Unable to load departments.");
                }

                setDepartments(result.departments ?? []);
            } catch (err) {
                if (controller.signal.aborted) return;

                setError(
                    err instanceof Error ? err.message : "Failed to load departments.",
                );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void loadDepartments();

        return () => controller.abort();
    }, []);

    const filteredDepartments = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return departments;

        return departments.filter((department) =>
            (department.department || department.name || "")
                .toLowerCase()
                .includes(query),
        );
    }, [departments, search]);

    const totalHours = filteredDepartments.reduce(
        (sum, department) =>
            sum + (department.totalHours ?? department.hours ?? 0),
        0,
    );

    const totalEmployees = filteredDepartments.reduce(
        (sum, department) =>
            sum + (department.people ?? department.employees ?? 0),
        0,
    );

    const totalCost = filteredDepartments.reduce(
        (sum, department) => sum + (department.cost ?? 0),
        0,
    );

    const totalRevenue = filteredDepartments.reduce(
        (sum, department) => sum + (department.revenue ?? 0),
        0,
    );

    return (
        <div className="min-w-0 bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-10 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
                <div>
                    <p className="text-xs font-medium text-slate-400">
                        Workspace / Organisation
                    </p>
                    <h1 className="mt-1 text-lg font-bold tracking-tight">
                        Departments
                    </h1>
                </div>

                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    Department performance
                </span>
            </header>

            <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-sm font-medium text-indigo-600">
                            Organisational analytics
                        </p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                            Compare performance across departments.
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Understand how working hours, costs and revenue are distributed
                            across your organisation.
                        </p>
                    </div>
                    <ExportCsvButton
                        filename="departments"
                        columns={departmentCsvColumns}
                        rows={filteredDepartments}
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
                            label: "Departments",
                            value: String(filteredDepartments.length),
                            description: "Departments matching your search",
                        },
                        {
                            label: "Employees",
                            value: number(totalEmployees),
                            description: "Employees across listed departments",
                        },
                        {
                            label: "Total hours",
                            value: `${number(totalHours)} h`,
                            description: "Recorded working hours",
                        },
                        {
                            label: "Total cost",
                            value: money(totalCost),
                            description: `Revenue: ${money(totalRevenue)}`,
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
                            <h2 className="font-semibold">Department breakdown</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {filteredDepartments.length} departments
                            </p>
                        </div>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search departments..."
                            aria-label="Search departments"
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
                                columns={departmentColumns}
                                data={filteredDepartments}
                                rowKey={(row, index) => `${row.department}-${index}`}
                                loading={loading}
                                minWidth="900px"
                                emptyMessage={
                                    search
                                        ? "No departments match your search."
                                        : "No department data available."
                                }
                                onRowClick={(department) =>
                                    router.push(
                                        `/departments/${encodeURIComponent(
                                            department.department || department.name || "",
                                        )}`,
                                    )
                                }
                            />
                        </div>
                    )}
                </section>

                <footer className="border-t border-slate-200 py-4 text-xs text-slate-400">
                    MarginBoard · Department performance
                </footer>
            </div>
        </div>
    );
}