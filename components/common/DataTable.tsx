"use client";

import { useMemo, useState, type ReactNode } from "react";

export type DataTableColumn<T> = {
    key: keyof T;
    header: string;
    sortable?: boolean;
    align?: "left" | "center" | "right";
    render?: (row: T) => ReactNode;
    sortValue?: (row: T) => string | number | null | undefined;
    className?: string;
};

type DataTableProps<T> = {
    columns: DataTableColumn<T>[];
    data: T[];
    rowKey: (row: T, index: number) => string | number;
    loading?: boolean;
    emptyMessage?: string;
    minWidth?: string;
    rowClassName?: string;
    onRowClick?: (row: T) => void;
};

type SortDirection = "asc" | "desc";

function compareValues(
    first: string | number | null | undefined,
    second: string | number | null | undefined,
): number {
    // Keep missing values at the bottom in either sort direction.
    const firstMissing = first == null || first === "";
    const secondMissing = second == null || second === "";

    if (firstMissing && secondMissing) return 0;
    if (firstMissing) return 1;
    if (secondMissing) return -1;

    if (typeof first === "number" && typeof second === "number") {
        return first - second;
    }

    return String(first).localeCompare(String(second), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

export default function DataTable<T>({
    columns,
    data,
    rowKey,
    loading = false,
    emptyMessage = "No data available.",
    minWidth = "700px",
    rowClassName = "",
    onRowClick,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] =
        useState<SortDirection>("asc");

    const sortedData = useMemo(() => {
        if (sortKey === null) return data;

        const column = columns.find((item) => item.key === sortKey);

        if (!column?.sortable) return data;

        return [...data].sort((firstRow, secondRow) => {
            const firstValue = column.sortValue
                ? column.sortValue(firstRow)
                : firstRow[sortKey] as string | number | null | undefined;

            const secondValue = column.sortValue
                ? column.sortValue(secondRow)
                : secondRow[sortKey] as string | number | null | undefined;

            const result = compareValues(firstValue, secondValue);

            // Missing values remain at the bottom for both directions.
            if (firstValue == null || firstValue === "") {
                return secondValue == null || secondValue === "" ? 0 : 1;
            }

            if (secondValue == null || secondValue === "") return -1;

            return sortDirection === "asc" ? result : -result;
        });
    }, [data, columns, sortKey, sortDirection]);

    function handleSort(key: keyof T) {
        const column = columns.find((item) => item.key === key);

        if (!column?.sortable) return;

        if (sortKey === key) {
            setSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
            );
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    }

    const alignmentClasses = {
        left: "text-left",
        center: "text-center",
        right: "text-right",
    };

    return (
        <div className="overflow-x-auto">
            <table
                className="w-full text-sm"
                style={{ minWidth }}
            >
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        {columns.map((column) => {
                            const isActive = sortKey === column.key;
                            const alignment = alignmentClasses[column.align ?? "left"];

                            return (
                                <th
                                    key={String(column.key)}
                                    scope="col"
                                    aria-sort={
                                        column.sortable && isActive
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : column.sortable
                                                ? "none"
                                                : undefined
                                    }
                                    className={`whitespace-nowrap px-5 py-4 font-semibold ${alignment} ${column.className ?? ""}`}
                                >
                                    {column.sortable ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSort(column.key)}
                                            className="inline-flex cursor-pointer items-center gap-2 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                            aria-label={`Sort by ${column.header}${isActive
                                                    ? sortDirection === "asc"
                                                        ? ", currently ascending"
                                                        : ", currently descending"
                                                    : ""
                                                }`}
                                        >
                                            {column.header}

                                            <span
                                                className={
                                                    isActive
                                                        ? "text-indigo-600"
                                                        : "text-slate-300"
                                                }
                                                aria-hidden="true"
                                            >
                                                {isActive
                                                    ? sortDirection === "asc"
                                                        ? "↑"
                                                        : "↓"
                                                    : "↕"}
                                            </span>
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-5 py-12 text-center text-slate-500"
                            >
                                Loading data...
                            </td>
                        </tr>
                    ) : sortedData.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-5 py-12 text-center text-slate-500"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        sortedData.map((row, index) => (
                            <tr
                                key={rowKey(row, index)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={`transition hover:bg-slate-50 ${rowClassName} ${
                                    onRowClick ? "cursor-pointer" : ""
                                }`}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={String(column.key)}
                                        className={`px-5 py-4 ${alignmentClasses[column.align ?? "left"]
                                            } ${column.className ?? ""}`}
                                    >
                                        {column.render
                                            ? column.render(row)
                                            : String(row[column.key] ?? "—")}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}