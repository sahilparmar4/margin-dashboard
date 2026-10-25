import { pool } from "./client";
import { Assumptions, DEFAULT_ASSUMPTIONS, Dataset } from "../calc/types";

const num = (v: string | number | null) => (v === null ? null : Number(v));

/** Read everything the cost model needs. NUMERIC columns come back as strings, so convert. */
export async function loadDataset(): Promise<Dataset> {
  const [entries, salaries, projects, employees] = await Promise.all([
    pool.query(
      `SELECT year, month, employee_no, department, category, ref_code, hours FROM timesheet_entries`,
    ),
    pool.query(`SELECT employee_no, year, month, amount FROM salaries`),
    pool.query(`SELECT ref_code, name, price, status, category FROM projects`),
    pool.query(`SELECT employee_no, name, department, designation FROM employees`),
  ]);
  return {
    entries: entries.rows.map((r) => ({
      year: r.year, month: r.month, employeeNo: r.employee_no, department: r.department,
      category: r.category, refCode: r.ref_code, hours: Number(r.hours),
    })),
    salaries: salaries.rows.map((r) => ({
      employeeNo: r.employee_no, year: r.year, month: r.month, amount: Number(r.amount),
    })),
    projects: projects.rows.map((r) => ({
      refCode: r.ref_code, name: r.name, price: num(r.price), status: r.status, category: r.category,
    })),
    employees: employees.rows.map((r) => ({
      employeeNo: r.employee_no, name: r.name, department: r.department, designation: r.designation,
    })),
  };
}

export async function loadAssumptions(): Promise<Assumptions> {
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key = 'assumptions'`);
  const saved = rows[0]?.value as Partial<Assumptions> | undefined;
  return {
    billableCategories: saved?.billableCategories ?? DEFAULT_ASSUMPTIONS.billableCategories,
    monthlyOverhead: saved?.monthlyOverhead ?? DEFAULT_ASSUMPTIONS.monthlyOverhead,
  };
}

export async function saveAssumptions(a: Assumptions): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('assumptions', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(a)],
  );
}