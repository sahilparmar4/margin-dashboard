"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import Link from "next/link";

type Assumptions = {
  billableCategories: string[];
  monthlyOverhead: number;
};

type SettingsResponse = {
  success: boolean;
  settings?: Assumptions;
  message?: string;
  error?: string;
};

function Icon({
  name,
  size = 20,
}: {
  name: "dashboard" | "projects" | "settings" | "check" | "plus" | "trash";
  size?: number;
}) {
  const paths = {
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
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
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
      {paths[name]}
    </svg>
  );
}

function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
          M
        </div>

        <div>
          <p className="text-base font-bold tracking-tight text-slate-900">
            Margin<span className="text-indigo-600">Board</span>
          </p>
          <p className="text-xs text-slate-500">Financial intelligence</p>
        </div>
      </div>

      <div className="px-4 pt-7">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>

        <nav className="space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon name="dashboard" size={19} />
            Dashboard
          </Link>

          <Link
            href="/projects"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon name="projects" size={19} />
            Projects
          </Link>
        </nav>

        <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Configuration
        </p>

        <Link
          href="/settings"
          aria-current="page"
          className="flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-700"
        >
          <Icon name="settings" size={19} />
          Settings
          <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
        </Link>
      </div>

      <div className="mt-auto hidden p-4 lg:block">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-700">
              Local environment
            </span>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Configure the assumptions used to calculate project costs and
            profitability.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [monthlyOverhead, setMonthlyOverhead] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/settings", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as SettingsResponse;

        if (!response.ok || !result.success || !result.settings) {
          throw new Error(result.error || "Unable to load settings.");
        }

        if (cancelled) return;

        setCategories(result.settings.billableCategories);
        setMonthlyOverhead(String(result.settings.monthlyOverhead));
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading settings.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const addCategory = () => {
    const category = newCategory.trim();

    if (!category) {
      setError("Please enter a category name.");
      return;
    }

    const alreadyExists = categories.some(
      (existing) => existing.toLowerCase() === category.toLowerCase(),
    );

    if (alreadyExists) {
      setError("This category already exists.");
      return;
    }

    setCategories((current) => [...current, category]);
    setNewCategory("");
    setError("");
    setSuccess("");
  };

  const handleCategoryKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCategory();
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    if (categories.length === 1) {
      setError("At least one billable category is required.");
      return;
    }

    setCategories((current) =>
      current.filter((category) => category !== categoryToRemove),
    );

    setError("");
    setSuccess("");
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedCategories = [
      ...new Set(
        categories
          .map((category) => category.trim())
          .filter(Boolean),
      ),
    ];

    if (normalizedCategories.length === 0) {
      setError("Add at least one billable category before saving.");
      return;
    }

    const overhead = Number(monthlyOverhead);

    if (
      monthlyOverhead.trim() === "" ||
      !Number.isFinite(overhead) ||
      overhead < 0
    ) {
      setError("Monthly overhead must be a valid non-negative number.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billableCategories: normalizedCategories,
          monthlyOverhead: overhead,
        } satisfies Assumptions),
      });

      const result = (await response.json()) as SettingsResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save settings.");
      }

      if (result.settings) {
        setCategories(result.settings.billableCategories);
        setMonthlyOverhead(String(result.settings.monthlyOverhead));
      } else {
        setCategories(normalizedCategories);
        setMonthlyOverhead(String(overhead));
      }

      setSuccess("Settings have been saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      <main className="min-w-0">
        <header className="sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Configuration / Settings
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight">
              Settings
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Cost assumptions
              </p>
              <p className="text-xs text-slate-500">
                Financial configuration
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              MB
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
          <section>
            <p className="text-sm font-medium text-indigo-600">
              Configuration
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Manage your cost assumptions.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure which timesheet categories count as billable work and
              set the monthly overhead used by the cost calculation engine.
            </p>
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4"
            >
              <span className="mt-0.5 font-bold text-rose-600">!</span>
              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Something needs your attention
                </p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <span className="mt-0.5 text-emerald-700">
                <Icon name="check" size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Changes saved
                </p>
                <p className="mt-1 text-sm text-emerald-700">{success}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              <div className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Billable categories */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon name="settings" size={22} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Billable categories
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        Categories whose hours contribute to billable work
                        and the indirect cost rate calculation.
                      </p>
                    </div>

                    <span className="ml-auto hidden shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 sm:inline-flex">
                      {categories.length}{" "}
                      {categories.length === 1 ? "category" : "categories"}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <label
                    htmlFor="newCategory"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Add a category
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="newCategory"
                      type="text"
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      placeholder="e.g. Projects"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />

                    <button
                      type="button"
                      onClick={addCategory}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Icon name="plus" size={17} />
                      Add category
                    </button>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Configured categories
                      </p>
                      <p className="text-xs text-slate-400">
                        Changes apply after saving
                      </p>
                    </div>

                    {categories.length > 0 ? (
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <div
                            key={category}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />

                              <span className="break-words text-sm font-medium text-slate-700">
                                {category}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeCategory(category)}
                              aria-label={`Remove ${category}`}
                              title="Remove category"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Icon name="trash" size={17} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-slate-700">
                          No categories configured
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Add at least one billable category to continue.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      How this setting is used
                    </p>
                    <p className="mt-1 text-sm leading-5 text-blue-800">
                      The calculation engine uses these categories to
                      distinguish billable hours from non-billable hours.
                      Non-billable time contributes to the indirect cost pool
                      according to the configured cost model.
                    </p>
                  </div>
                </div>
              </section>

              {/* Monthly overhead */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <span className="text-lg font-bold">AED</span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Monthly overhead
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        Set the additional monthly operating overhead included
                        in the indirect cost pool.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <label
                    htmlFor="monthlyOverhead"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Monthly overhead amount
                  </label>

                  <div className="flex max-w-xl items-center overflow-hidden rounded-xl border border-slate-200 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                    <span className="flex h-12 items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600">
                      AED
                    </span>

                    <input
                      id="monthlyOverhead"
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      required
                      value={monthlyOverhead}
                      onChange={(event) => {
                        setMonthlyOverhead(event.target.value);
                        setError("");
                        setSuccess("");
                      }}
                      placeholder="0"
                      className="h-12 min-w-0 flex-1 bg-white px-4 text-sm outline-none"
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    This amount is applied per month by the cost calculation
                    engine. Enter zero if no additional overhead should be
                    allocated.
                  </p>

                  <div className="mt-5 rounded-xl bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      Impact on profitability
                    </p>
                    <p className="mt-1 text-sm leading-5 text-amber-800">
                      Monthly overhead is included in the indirect cost pool.
                      Changing this value can change the indirect cost rate
                      and the calculated cost and margin of billable projects.
                    </p>
                  </div>
                </div>
              </section>

              {/* Save actions */}
              <div className="flex flex-col-reverse justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
                <p className="text-xs leading-5 text-slate-500">
                  Your changes are persisted when you save.
                </p>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="check" size={17} />
                  {saving ? "Saving settings..." : "Save settings"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}