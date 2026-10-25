"use client";

import { exportToCsv, type CsvColumn } from "@/lib/utils/exportCsv";

type ExportCsvButtonProps<T> = {
  filename: string;
  columns: CsvColumn<T>[];
  rows: T[];
  disabled?: boolean;
};

export default function ExportCsvButton<T>({
  filename,
  columns,
  rows,
  disabled = false,
}: ExportCsvButtonProps<T>) {
  const handleExport = () => {
    if (rows.length === 0) return;

    exportToCsv(filename, columns, rows);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || rows.length === 0}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
      </svg>

      Export CSV
    </button>
  );
}