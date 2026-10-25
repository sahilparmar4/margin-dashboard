import type { PoolClient } from "pg";
import { pool } from "./client";
import type { TimesheetRow } from "../ingest/timesheet";
import type { SalaryRow } from "../ingest/salaries";
import type { ProjectRow } from "../ingest/projects";

export interface SaveInput {
  timesheet?: TimesheetRow[];
  salaries?: SalaryRow[];
  projects?: ProjectRow[];
}

export interface SaveSummary {
  timesheet?: { rows: number; periods: string[] };
  salaries?: { rows: number; periods: string[] };
  projects?: { rows: number };
}

const period = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

function distinctPeriods(rows: { year: number; month: number }[]) {
  const map = new Map<string, { year: number; month: number }>();
  for (const r of rows) map.set(period(r.year, r.month), { year: r.year, month: r.month });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Insert/refresh people. Never blanks out a name/department we already know. */
async function upsertEmployees(
  db: PoolClient,
  people: { employeeNo: string; name: string | null; department: string | null; designation: string | null }[],
) {
  const byNo = new Map<string, (typeof people)[number]>();
  for (const p of people) byNo.set(p.employeeNo, p);
  if (byNo.size === 0) return;
  const list = [...byNo.values()];
  await db.query(
    `INSERT INTO employees (employee_no, name, department, designation)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
     ON CONFLICT (employee_no) DO UPDATE SET
       name        = CASE WHEN EXCLUDED.name = EXCLUDED.employee_no THEN employees.name ELSE EXCLUDED.name END,
       department  = COALESCE(EXCLUDED.department,  employees.department),
       designation = COALESCE(EXCLUDED.designation, employees.designation)`,
    [
      list.map((p) => p.employeeNo),
      list.map((p) => p.name ?? p.employeeNo), // name is NOT NULL: fall back to the number
      list.map((p) => p.department),
      list.map((p) => p.designation),
    ],
  );
}

/**
 * Saves everything in ONE transaction: either all of it lands or none of it.
 *
 * Re-upload rules:
 *  - timesheet / salaries: the months present in the file are replaced; other months are untouched.
 *  - projects: upserted by ref code; projects not in the file are kept.
 */
export async function saveUpload(input: SaveInput): Promise<SaveSummary> {
  const db = await pool.connect();
  const summary: SaveSummary = {};
  try {
    await db.query("BEGIN");

    if (input.timesheet) {
      const rows = input.timesheet;
      const periods = distinctPeriods(rows);
      await upsertEmployees(
        db,
        rows.map((r) => ({
          employeeNo: r.employeeNo,
          name: r.employeeName,
          department: r.department,
          designation: r.designation,
        })),
      );
      await db.query(
        `DELETE FROM timesheet_entries
         WHERE (year, month) IN (SELECT * FROM unnest($1::int[], $2::int[]))`,
        [periods.map(([, p]) => p.year), periods.map(([, p]) => p.month)],
      );
      await db.query(
        `INSERT INTO timesheet_entries
           (year, month, employee_no, expense_type, department, category, ref_code, task_name, company, description, hours)
         SELECT * FROM unnest(
           $1::int[], $2::int[], $3::text[], $4::text[], $5::text[], $6::text[],
           $7::text[], $8::text[], $9::text[], $10::text[], $11::numeric[])`,
        [
          rows.map((r) => r.year),
          rows.map((r) => r.month),
          rows.map((r) => r.employeeNo),
          rows.map((r) => r.expenseType),
          rows.map((r) => r.department),
          rows.map((r) => r.category),
          rows.map((r) => r.refCode),
          rows.map((r) => r.taskName),
          rows.map((r) => r.company),
          rows.map((r) => r.description),
          rows.map((r) => r.hours),
        ],
      );
      summary.timesheet = { rows: rows.length, periods: periods.map(([k]) => k) };
    }

    if (input.salaries) {
      const rows = input.salaries;
      const periods = distinctPeriods(rows);
      await upsertEmployees(
        db,
        rows.map((r) => ({ employeeNo: r.employeeNo, name: r.employeeName, department: null, designation: null })),
      );
      await db.query(
        `DELETE FROM salaries
         WHERE (year, month) IN (SELECT * FROM unnest($1::int[], $2::int[]))`,
        [periods.map(([, p]) => p.year), periods.map(([, p]) => p.month)],
      );
      await db.query(
        `INSERT INTO salaries (employee_no, year, month, amount)
         SELECT * FROM unnest($1::text[], $2::int[], $3::int[], $4::numeric[])`,
        [rows.map((r) => r.employeeNo), rows.map((r) => r.year), rows.map((r) => r.month), rows.map((r) => r.amount)],
      );
      summary.salaries = { rows: rows.length, periods: periods.map(([k]) => k) };
    }

    if (input.projects) {
      const rows = input.projects;
      if (rows.length > 0) {
        await db.query(
          `INSERT INTO projects (ref_code, name, price, sales_year, sales_month, category, status)
           SELECT * FROM unnest($1::text[], $2::text[], $3::numeric[], $4::int[], $5::int[], $6::text[], $7::text[])
           ON CONFLICT (ref_code) DO UPDATE SET
             name = EXCLUDED.name, price = EXCLUDED.price, sales_year = EXCLUDED.sales_year,
             sales_month = EXCLUDED.sales_month, category = EXCLUDED.category, status = EXCLUDED.status`,
          [
            rows.map((r) => r.refCode),
            rows.map((r) => r.name),
            rows.map((r) => r.price),
            rows.map((r) => r.salesYear),
            rows.map((r) => r.salesMonth),
            rows.map((r) => r.category),
            rows.map((r) => r.status),
          ],
        );
      }
      summary.projects = { rows: rows.length };
    }

    await db.query("COMMIT");
    return summary;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  } finally {
    db.release();
  }
}