"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UploadForm from "@/components/import/UploadForm";

type Period = {
  year: number;
  month: number;
};

type Summary = {
  totalHours: number;
  billableHours: number;
  utilisation: number;
  cost: number;
  revenue: number;
  profit: number;
  margin: number;
  payroll: number;
  overhead: number;
  unpricedCost: number;
  unallocatedCost: number;
};

type Trend = Summary & Period;

type Category = {
  category: string;
  hours: number;
  billable: boolean;
  share: number;
};

type DashboardResponse = {
  success: boolean;
  hasData?: boolean;
  message?: string;
  filters: {
    year?: number;
    month?: number;
  };
  summary?: Summary;
  trends?: Trend[];
  categories?: Category[];
  reconciliation?: {
    totalCost: number;
    totalSalaries: number;
    overhead: number;
    difference: number;
    ok: boolean;
  };
  availablePeriods?: {
    years: number[];
    months: Period[];
  };
  gaps?: {
    missingSalary: unknown[];
    unpricedProjects: unknown[];
    monthsWithoutBillableHours: unknown[];
  };
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const money = (value: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);

const number = (value: number) =>
  new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 1,
  }).format(value);

const percentage = (value: number) =>
  `${(value * 100).toFixed(1)}%`;

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    projects: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M8 6V4h8v2M3 11h18M10 11v2h4v-2" />
      </>
    ),
    employees: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    departments: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="8.5" y="14" width="7" height="7" rx="1" />
        <path d="M6.5 10v2h11v-2M12 12v2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" />
      </>
    ),
    revenue: (
      <>
        <path d="M3 3v18h18M7 14l4-4 4 3 6-7" />
        <path d="M16 6h5v5" />
      </>
    ),
    cost: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    profit: (
      <>
        <path d="M3 17l6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.dashboard}
    </svg>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  accent: "indigo" | "emerald" | "amber" | "blue" | "violet" | "rose";
}) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-xl p-2.5 ${accents[accent]}`}>
          <Icon name={icon} size={19} />
        </div>
      </div>
      <p className="mt-5 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </article>
  );
}

function TrendChart({ data }: { data: Trend[] }) {
  const [visible, setVisible] = useState({
    revenue: true,
    cost: true,
    profit: true,
  });

  const width = 760;
  const height = 260;
  const left = 12;
  const right = 12;
  const top = 20;
  const bottom = 35;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [
      visible.revenue ? item.revenue : 0,
      visible.cost ? item.cost : 0,
      visible.profit ? Math.max(0, item.profit) : 0,
    ]),
  );

  const x = (index: number) =>
    left +
    (data.length <= 1
      ? plotWidth / 2
      : (index / (data.length - 1)) * plotWidth);

  const y = (value: number) =>
    top + plotHeight - (Math.max(0, value) / maxValue) * plotHeight;

  const line = (key: "revenue" | "cost" | "profit") =>
    data
      .map((item, index) => {
        const point = `${x(index)},${y(item[key])}`;
        return `${index === 0 ? "M" : "L"} ${point}`;
      })
      .join(" ");

  const colors = {
    revenue: "#4f46e5",
    cost: "#f59e0b",
    profit: "#10b981",
  };

  const series = [
    { key: "revenue" as const, label: "Revenue" },
    { key: "cost" as const, label: "Cost" },
    { key: "profit" as const, label: "Profit" },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-semibold text-slate-900">
            Financial performance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monthly revenue, cost and profit
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {series.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setVisible((current) => ({
                  ...current,
                  [item.key]: !current[item.key],
                }))
              }
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${visible[item.key]
                ? "border-slate-200 bg-white text-slate-700"
                : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: visible[item.key]
                    ? colors[item.key]
                    : "#cbd5e1",
                }}
              />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          No monthly trend data available.
        </div>
      ) : (
        <>
          <div className="mt-6 w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-auto w-full"
              role="img"
              aria-label="Monthly revenue, cost and profit trend chart"
            >
              {[0, 1, 2, 3].map((tick) => {
                const value = (maxValue * tick) / 3;
                const yy = y(value);

                return (
                  <g key={tick}>
                    <line
                      x1={left}
                      y1={yy}
                      x2={width - right}
                      y2={yy}
                      stroke="#e2e8f0"
                      strokeDasharray="4 5"
                    />
                    <text
                      x={left + 2}
                      y={yy - 6}
                      fill="#94a3b8"
                      fontSize="10"
                    >
                      {value >= 1000
                        ? `${(value / 1000).toFixed(0)}k`
                        : value.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {visible.revenue && (
                <path
                  d={line("revenue")}
                  fill="none"
                  stroke={colors.revenue}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {visible.cost && (
                <path
                  d={line("cost")}
                  fill="none"
                  stroke={colors.cost}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {visible.profit && (
                <path
                  d={line("profit")}
                  fill="none"
                  stroke={colors.profit}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {data.map((item, index) => (
                <text
                  key={`${item.year}-${item.month}`}
                  x={x(index)}
                  y={height - 9}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                >
                  {MONTHS[item.month - 1]?.slice(0, 3)}
                </text>
              ))}
            </svg>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Values are in AED. Select a legend item to show or hide a series.
          </p>
        </>
      )}
    </section>
  );
}

function CategoryBreakdown({ data }: { data: Category[] }) {
  const total = data.reduce((sum, item) => sum + item.hours, 0);
  const sorted = [...data].sort((a, b) => b.hours - a.hours);
  const billableHours = data
    .filter((item) => item.billable)
    .reduce((sum, item) => sum + item.hours, 0);
  const nonBillableHours = total - billableHours;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-slate-900">Where time goes</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hours by timesheet category
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-700">Billable</p>
          <p className="mt-1 text-xl font-bold text-emerald-800">
            {number(billableHours)} h
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">Non-billable</p>
          <p className="mt-1 text-xl font-bold text-amber-800">
            {number(nonBillableHours)} h
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {sorted.map((item) => (
          <div key={item.category}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-medium text-slate-700">
                {item.category}
              </span>
              <span className="shrink-0 text-slate-500">
                {number(item.hours)} h
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.billable ? "bg-indigo-500" : "bg-slate-300"
                  }`}
                style={{
                  width: `${total > 0 ? (item.hours / total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          No category data available.
        </p>
      )}

      <p className="mt-5 text-xs text-slate-400">
        {number(total)} total hours across {data.length} categories
      </p>
    </section>
  );
}

function CostReconciliation({
  summary,
  reconciliation,
}: {
  summary: Summary;
  reconciliation?: DashboardResponse["reconciliation"];
}) {
  const difference =
    reconciliation?.difference ?? summary.cost - summary.payroll - summary.overhead;
  const ok = reconciliation?.ok ?? Math.abs(difference) < 0.01;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-semibold text-slate-900">Cost reconciliation</h2>
          <p className="mt-1 text-sm text-slate-500">
            Verify the monthly cost components
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${ok
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700"
            }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"
              }`}
          />
          {ok ? "Balanced" : "Check required"}
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500">Payroll</span>
          <span className="text-sm font-semibold text-slate-900">
            {money(summary.payroll)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500">Monthly overhead</span>
          <span className="text-sm font-semibold text-slate-900">
            {money(summary.overhead)}
          </span>
        </div>
        <div className="border-t border-dashed border-slate-200 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-700">
              Calculated cost
            </span>
            <span className="text-sm font-bold text-slate-900">
              {money(summary.payroll + summary.overhead)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-slate-700">
            Reported total cost
          </span>
          <span className="text-sm font-bold text-slate-900">
            {money(summary.cost)}
          </span>
        </div>
        <div
          className={`flex items-center justify-between rounded-xl p-3 ${ok ? "bg-emerald-50" : "bg-rose-50"
            }`}
        >
          <span
            className={`text-sm font-medium ${ok ? "text-emerald-800" : "text-rose-800"
              }`}
          >
            Difference
          </span>
          <span
            className={`text-sm font-bold ${ok ? "text-emerald-800" : "text-rose-800"
              }`}
          >
            {money(difference)}
          </span>
        </div>
      </div>
    </section>
  );
}

function formatPeriod(year?: number, month?: number) {
  if (!year) return "All available periods";
  if (!month) return `Year ${year}`;
  return `${MONTHS[month - 1]} ${year}`;
}

export default function Home() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadDashboard = useCallback(async (selectedYear: string, selectedMonth: string) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (selectedYear) params.set("year", selectedYear);
      if (selectedMonth) params.set("month", selectedMonth);

      const query = params.toString();
      const response = await fetch(
        `/api/dashboard${query ? `?${query}` : ""}`,
        { cache: "no-store" }, // for fetching latest data from the database otherwise next js default caching will return the cached data
      );

      const result = (await response.json()) as DashboardResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load dashboard data.",
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeDashboard() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        const result = (await response.json()) as DashboardResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load dashboard data.",
          );
        }

        if (cancelled) return;

        const availableYears = result.availablePeriods?.years ?? [];
        const latestYear = availableYears.length
          ? String(Math.max(...availableYears))
          : "";

        setYear(latestYear);
        setMonth("");
        setData(result);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the dashboard.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initializeDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const years = data?.availablePeriods?.years ?? [];
  const periods = data?.availablePeriods?.months ?? [];

  const monthsForYear = useMemo(
    () =>
      periods
        .filter((period) => !year || period.year === Number(year))
        .map((period) => period.month)
        .filter((value, index, values) => values.indexOf(value) === index)
        .sort((a, b) => a - b),
    [periods, year],
  );

  const summary = data?.summary;
  const hasData = data?.hasData !== false && Boolean(summary);

  const applyFilters = () => {
    loadDashboard(year, month);
  };

  const resetFilters = () => {
    setYear("");
    setMonth("");
    loadDashboard("", "");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Workspace / Overview
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportOpen(true)}
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              Import Data
            </button>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Icon name="settings" size={18} />
              <span>Settings</span>
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Financial overview
              </p>
              <p className="text-xs text-slate-500">Agency performance</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              MB
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
          <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                Performance overview
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Know where your margins stand.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor revenue, delivery costs and profitability across your
                agency.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <label className="flex min-w-28 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Year
                </span>
                <select
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value);
                    setMonth("");
                  }}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Latest / default</option>
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-32 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Month
                </span>
                <select
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Full year</option>
                  {monthsForYear.map((item) => (
                    <option key={item} value={item}>
                      {MONTHS[item - 1]}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={applyFilters}
                disabled={loading}
                className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Apply filters"}
              </button>

              <button
                type="button"
                onClick={resetFilters}
                disabled={loading}
                className="h-10 rounded-lg px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Could not load dashboard
                </p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard(year, month)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {loading && !data ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : !hasData ? (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon name="dashboard" size={25} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No data for this period
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {data?.message ??
                  "Choose another year or month to view available financial data."}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                View available data
              </button>
            </section>
          ) : summary ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Showing results for{" "}
                  <span className="font-semibold text-slate-800">
                    {formatPeriod(data?.filters.year, data?.filters.month)}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Currency: AED · Values rounded for display
                </p>
              </div>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  title="Total revenue"
                  value={money(summary.revenue)}
                  description="Revenue from priced projects"
                  icon="revenue"
                  accent="indigo"
                />
                <MetricCard
                  title="Total cost"
                  value={money(summary.cost)}
                  description={`Payroll ${money(summary.payroll)} + overhead ${money(summary.overhead)}`}
                  icon="cost"
                  accent="amber"
                />
                <MetricCard
                  title="Net profit"
                  value={money(summary.profit)}
                  description="Revenue minus total cost"
                  icon="profit"
                  accent={summary.profit >= 0 ? "emerald" : "rose"}
                />
                <MetricCard
                  title="Profit margin"
                  value={percentage(summary.margin)}
                  description="Profit as a share of revenue"
                  icon="revenue"
                  accent={summary.margin >= 0 ? "emerald" : "rose"}
                />
                <MetricCard
                  title="Billable hours"
                  value={`${number(summary.billableHours)} h`}
                  description={`${number(summary.totalHours)} total hours logged`}
                  icon="clock"
                  accent="blue"
                />
                <MetricCard
                  title="Utilisation"
                  value={percentage(summary.utilisation)}
                  description="Billable hours ÷ total hours"
                  icon="clock"
                  accent="violet"
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
                <TrendChart data={data?.trends ?? []} />
                <CategoryBreakdown data={data?.categories ?? []} />
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <CostReconciliation
                  summary={summary}
                  reconciliation={data?.reconciliation}
                />

                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <h2 className="font-semibold text-slate-900">
                    Data quality
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Issues identified by the cost model
                  </p>

                  {(() => {
                    const gaps = data?.gaps;
                    const checks = [
                      {
                        label: "Missing salaries",
                        count: gaps?.missingSalary.length ?? 0,
                      },
                      {
                        label: "Unpriced projects",
                        count: gaps?.unpricedProjects.length ?? 0,
                      },
                      {
                        label: "Months without billable hours",
                        count: gaps?.monthsWithoutBillableHours.length ?? 0,
                      },
                    ];
                    const issueCount = checks.reduce(
                      (sum, item) => sum + item.count,
                      0,
                    );

                    return (
                      <>
                        <div
                          className={`mt-5 rounded-xl p-4 ${issueCount === 0
                            ? "bg-emerald-50"
                            : "bg-amber-50"
                            }`}
                        >
                          <p
                            className={`text-sm font-semibold ${issueCount === 0
                              ? "text-emerald-800"
                              : "text-amber-800"
                              }`}
                          >
                            {issueCount === 0
                              ? "No data quality gaps detected"
                              : `${issueCount} data quality item(s) need review`}
                          </p>
                          <p
                            className={`mt-1 text-xs ${issueCount === 0
                              ? "text-emerald-700"
                              : "text-amber-700"
                              }`}
                          >
                            Based on the loaded dataset and cost model.
                          </p>
                        </div>

                        <div className="mt-4 divide-y divide-slate-100">
                          {checks.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between gap-3 py-3"
                            >
                              <span className="text-sm text-slate-600">
                                {item.label}
                              </span>
                              <span
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${item.count === 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                                  }`}
                              >
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </section>
              </section>

              <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-4 text-xs text-slate-400 sm:flex-row">
                <span>MarginBoard · Financial performance overview</span>
                <span>Data supplied by your local dashboard API</span>
              </footer>
            </>
          ) : null}
        </div>
        {isImportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsImportOpen(false)}
          >
            <div
              className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Import Data</h2>

                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="text-gray-500 hover:text-black"
                  aria-label="Close import dialog"
                >
                  ✕
                </button>
              </div>

              <UploadForm />
            </div>
          </div>
        )}
    </div>
  );
}