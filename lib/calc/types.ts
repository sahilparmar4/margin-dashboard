/** Plain data going into the cost model. No database, no Excel: just numbers and strings. */

export interface EntryInput {
  year: number;
  month: number; // 1-12
  employeeNo: string;
  department: string | null;
  category: string;
  refCode: string;
  hours: number;
}

export interface SalaryInput {
  employeeNo: string;
  year: number;
  month: number;
  amount: number;
}

export interface ProjectInput {
  refCode: string;
  name: string | null;
  price: number | null; // null = no price recorded
  status: string | null;
  category: string | null;
}

export interface EmployeeInput {
  employeeNo: string;
  name: string;
  department: string | null;
  designation: string | null;
}

export interface Dataset {
  entries: EntryInput[];
  salaries: SalaryInput[];
  projects: ProjectInput[];
  employees: EmployeeInput[];
}

/** The user-editable assumptions (Settings page). */
export interface Assumptions {
  /** Categories that count as billable work charged to a project. */
  billableCategories: string[];
  /** Extra company overhead, in AED, added to the indirect pool of EVERY month. */
  monthlyOverhead: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  billableCategories: ["Projects", "Enhancements", "Hosting"],
  monthlyOverhead: 0,
};

/** Period filter. Leave a field undefined for "all". */
export interface Filter {
  year?: number;
  month?: number;
}