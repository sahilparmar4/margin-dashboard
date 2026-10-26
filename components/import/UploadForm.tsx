"use client";

import { useState } from "react";

type UploadField = "timesheet" | "salaries" | "projects";

const FILE_FIELDS: {
  key: UploadField;
  label: string;
}[] = [
  { key: "timesheet", label: "Timesheet" },
  { key: "salaries", label: "Salaries" },
  { key: "projects", label: "Projects" },
];

export default function UploadForm() {
  const [files, setFiles] = useState<
    Partial<Record<UploadField, File>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [defaultYear, setDefaultYear] = useState(
    new Date().getFullYear(),
  );

  function handleFileChange(field: UploadField, file?: File) {
    setError("");
    setSuccess("");

    setFiles((previous) => {
      const updated = { ...previous };

      if (file) {
        updated[field] = file;
      } else {
        delete updated[field];
      }

      return updated;
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (Object.keys(files).length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      if (files.timesheet) {
        formData.append("timesheet", files.timesheet);
      }

      if (files.salaries) {
        formData.append("salaries", files.salaries);
      }

      if (files.projects) {
        formData.append("projects", files.projects);
      }

      if (defaultYear > 2000) {
        formData.append("defaultYear", String(defaultYear));
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const problems = data.problems
          ? Object.values(data.problems).join(" ")
          : data.error || "Upload failed.";

        throw new Error(String(problems));
      }

      setSuccess("Files uploaded successfully!");
      setFiles({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Data</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your timesheet, salary, and project Excel files.
          You can upload any combination of these files.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {FILE_FIELDS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-xl border border-gray-200 p-4"
          >
            <label
              htmlFor={key}
              className="mb-3 block font-medium"
            >
              {label}
            </label>

            <input
              id={key}
              type="file"
              accept=".xlsx"
              disabled={loading}
              onChange={(event) =>
                handleFileChange(
                  key,
                  event.target.files?.[0],
                )
              }
              className="block w-full text-sm cursor-pointer"
            />

            {files[key] && (
              <p className="mt-2 break-all text-xs text-gray-500">
                {files[key].name}
              </p>
            )}
          </div>
        ))}
      </div>

      <div>
        <label
          htmlFor="defaultYear"
          className="mb-2 block text-sm font-medium"
        >
          Default Year
        </label>

        <input
          id="defaultYear"
          type="number"
          min={2001}
          max={2100}
          value={defaultYear}
          disabled={loading}
          onChange={(event) =>
            setDefaultYear(Number(event.target.value))
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 md:w-48"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || Object.keys(files).length === 0}
        className="rounded-lg bg-black px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Importing..." : "Upload Files"}
      </button>
    </form>
  );
}