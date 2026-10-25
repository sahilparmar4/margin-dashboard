import { saveUpload, type SaveSummary } from "../db/save";
import { FileShapeError, type Issue } from "./clean";
import { parseProjects, type ProjectRow } from "./projects";
import { parseSalaries, type SalaryRow } from "./salaries";
import { parseTimesheet, type TimesheetRow } from "./timesheet";

export interface UploadFiles {
  timesheet?: { buffer: Buffer; fileName?: string };
  salaries?: { buffer: Buffer; fileName?: string };
  projects?: { buffer: Buffer; fileName?: string };
}

export interface UploadResult {
  saved: SaveSummary;
  issues: Partial<Record<keyof UploadFiles, Issue[]>>;
}

/** One or more files were rejected; nothing was saved. */
export class UploadRejected extends Error {
  constructor(public problems: Partial<Record<keyof UploadFiles, string>>) {
    super(Object.values(problems).join(" "));
  }
}

/**
 * Parse every supplied file first; only if ALL are readable do we touch the database.
 * Any subset of the three files may be supplied (e.g. just a corrected timesheet).
 */
export async function ingestUpload(files: UploadFiles, opts: { defaultYear?: number } = {}): Promise<UploadResult> {
  const problems: Partial<Record<keyof UploadFiles, string>> = {};
  const issues: UploadResult["issues"] = {};
  let timesheet: TimesheetRow[] | undefined;
  let salaries: SalaryRow[] | undefined;
  let projects: ProjectRow[] | undefined;

  async function run<T>(key: keyof UploadFiles, fn: () => Promise<{ rows: T[]; issues: Issue[] }>) {
    try {
      const r = await fn();
      issues[key] = r.issues;
      return r.rows;
    } catch (e) {
      if (e instanceof FileShapeError) problems[key] = e.message;
      else throw e;
    }
  }

  if (files.timesheet) timesheet = await run("timesheet", () => parseTimesheet(files.timesheet!.buffer, opts));
  if (files.salaries)
    salaries = await run("salaries", () =>
      parseSalaries(files.salaries!.buffer, { ...opts, fileName: files.salaries!.fileName }),
    );
  if (files.projects) projects = await run("projects", () => parseProjects(files.projects!.buffer, opts));

  if (Object.keys(problems).length > 0) throw new UploadRejected(problems);
  if (!timesheet && !salaries && !projects) throw new UploadRejected({ timesheet: "No files were uploaded." });

  const saved = await saveUpload({ timesheet, salaries, projects });
  return { saved, issues };
}