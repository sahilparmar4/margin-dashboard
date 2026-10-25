import {
  Assumptions, Dataset, DEFAULT_ASSUMPTIONS, EmployeeInput, EntryInput, ProjectInput,
} from "./types";

/**
 * THE COST MODEL (pure functions, no I/O).
 *
 * Per month:
 *   direct rate (per person)  = salary / total hours logged that month
 *   indirect pool             = salaries of people who logged no hours
 *                             + everyone's NON-billable hours x their direct rate
 *                             + monthly overhead
 *   indirect rate             = indirect pool / billable hours that month
 *   cost of a billable hour   = direct rate + indirect rate
 *
 * Only billable lines carry cost. Non-billable time is NOT costed on its own line,
 * because its value already sits inside the indirect pool. Counting it twice would
 * make total cost exceed total salaries.
 */

export const monthKey = (year: number, month: number) => year * 100 + month;

export interface MonthModel {
  year: number;
  month: number;
  totalHours: number;
  billableHours: number;
  /** Sum of every salary in the month (what the company actually pays out). */
  payroll: number;
  /** Salaries of people who logged no hours that month. */
  supportSalaries: number;
  /** Non-billable hours valued at each person's direct rate. */
  absorbedCost: number;
  overhead: number;
  indirectPool: number;
  /** AED per billable hour. 0 when the month has no billable hours. */
  indirectRate: number;
  /** The whole pool, when there are no billable hours to spread it over. */
  unallocatedCost: number;
}

export interface Line {
  year: number;
  month: number;
  employeeNo: string;
  department: string | null;
  category: string;
  refCode: string;
  hours: number;
  billable: boolean;
  /** That person's AED/hour this month (0 if salary missing). */
  directRate: number;
  indirectRate: number;
  /** hours x directRate for ANY line: informational, what that time "is worth" in salary. */
  salaryValue: number;
  /** Billable lines only (0 otherwise): */
  directCost: number;
  indirectCost: number;
  cost: number;
  /** Share of the project price, by hours. null = project has no price. Billable lines only. */
  revenue: number | null;
}

export interface Gaps {
  /** Logged hours but no salary row that month: direct cost is treated as 0. */
  missingSalary: { employeeNo: string; year: number; month: number; hours: number }[];
  /** Billable ref codes that have hours but no price (or no project row at all). */
  unpricedProjects: { refCode: string; hours: number; cost: number }[];
  /** Months with cost but no billable hours to absorb it. */
  monthsWithoutBillableHours: { year: number; month: number; cost: number }[];
}

export interface CostModel {
  assumptions: Assumptions;
  months: Map<number, MonthModel>;
  lines: Line[];
  projects: Map<string, ProjectInput>;
  employees: Map<string, EmployeeInput>;
  /** Total billable hours per ref code over the whole dataset (the revenue-share denominator). */
  projectHours: Map<string, number>;
  gaps: Gaps;
}

const norm = (s: string) => s.trim().toLowerCase();

export function buildCostModel(
  data: Dataset,
  assumptions: Assumptions = DEFAULT_ASSUMPTIONS,
): CostModel {
  const billableSet = new Set(assumptions.billableCategories.map(norm));
  const isBillable = (category: string) => billableSet.has(norm(category));

  // ---- index inputs -------------------------------------------------------
  const salaryOf = new Map<string, number>(); // "emp|monthKey" -> amount
  const payrollOf = new Map<number, number>();
  const monthKeys = new Set<number>();
  for (const s of data.salaries) {
    const k = monthKey(s.year, s.month);
    monthKeys.add(k);
    salaryOf.set(`${s.employeeNo}|${k}`, (salaryOf.get(`${s.employeeNo}|${k}`) ?? 0) + s.amount);
    payrollOf.set(k, (payrollOf.get(k) ?? 0) + s.amount);
  }

  const entriesByMonth = new Map<number, EntryInput[]>();
  for (const e of data.entries) {
    const k = monthKey(e.year, e.month);
    monthKeys.add(k);
    (entriesByMonth.get(k) ?? entriesByMonth.set(k, []).get(k)!).push(e);
  }

  const lines: Line[] = [];
  const months = new Map<number, MonthModel>();
  const gaps: Gaps = { missingSalary: [], unpricedProjects: [], monthsWithoutBillableHours: [] };

  // ---- month by month -----------------------------------------------------
  for (const k of [...monthKeys].sort((a, b) => a - b)) {
    const year = Math.floor(k / 100);
    const month = k % 100;
    const entries = entriesByMonth.get(k) ?? [];

    const perPerson = new Map<string, { total: number; billable: number; nonBillable: number }>();
    for (const e of entries) {
      const p = perPerson.get(e.employeeNo) ?? { total: 0, billable: 0, nonBillable: 0 };
      p.total += e.hours;
      if (isBillable(e.category)) p.billable += e.hours;
      else p.nonBillable += e.hours;
      perPerson.set(e.employeeNo, p);
    }

    // direct rate = salary / total hours
    const directRate = new Map<string, number>();
    let absorbedCost = 0;
    let totalHours = 0;
    let billableHours = 0;
    for (const [emp, p] of perPerson) {
      totalHours += p.total;
      billableHours += p.billable;
      const salary = salaryOf.get(`${emp}|${k}`);
      if (p.total > 0 && salary === undefined) {
        gaps.missingSalary.push({ employeeNo: emp, year, month, hours: p.total });
      }
      const rate = salary !== undefined && p.total > 0 ? salary / p.total : 0;
      directRate.set(emp, rate);
      absorbedCost += p.nonBillable * rate;
    }

    // people paid this month who logged no hours at all = support staff
    let supportSalaries = 0;
    for (const [key, amount] of salaryOf) {
      const [emp, mk] = key.split("|");
      if (Number(mk) !== k) continue;
      if ((perPerson.get(emp)?.total ?? 0) === 0) supportSalaries += amount;
    }

    const overhead = assumptions.monthlyOverhead;
    const indirectPool = supportSalaries + absorbedCost + overhead;
    const indirectRate = billableHours > 0 ? indirectPool / billableHours : 0;
    const unallocatedCost = billableHours > 0 ? 0 : indirectPool;

    months.set(k, {
      year, month, totalHours, billableHours,
      payroll: payrollOf.get(k) ?? 0,
      supportSalaries, absorbedCost, overhead, indirectPool, indirectRate, unallocatedCost,
    });
    if (unallocatedCost > 0) gaps.monthsWithoutBillableHours.push({ year, month, cost: unallocatedCost });

    for (const e of entries) {
      const billable = isBillable(e.category);
      const dRate = directRate.get(e.employeeNo) ?? 0;
      const directCost = billable ? e.hours * dRate : 0;
      const indirectCost = billable ? e.hours * indirectRate : 0;
      lines.push({
        year, month,
        employeeNo: e.employeeNo,
        department: e.department,
        category: e.category,
        refCode: e.refCode,
        hours: e.hours,
        billable,
        directRate: dRate,
        indirectRate: billable ? indirectRate : 0,
        salaryValue: e.hours * dRate,
        directCost,
        indirectCost,
        cost: directCost + indirectCost,
        revenue: null,
      });
    }
  }

  // ---- revenue: project price shared out by hours -------------------------
  const projects = new Map(data.projects.map((p) => [p.refCode, p]));
  const projectHours = new Map<string, number>();
  for (const l of lines) {
    if (l.billable) projectHours.set(l.refCode, (projectHours.get(l.refCode) ?? 0) + l.hours);
  }
  for (const l of lines) {
    if (!l.billable) continue;
    const price = projects.get(l.refCode)?.price;
    const total = projectHours.get(l.refCode) ?? 0;
    l.revenue = price != null && total > 0 ? price * (l.hours / total) : null;
  }

  // billable work nobody priced
  const unpriced = new Map<string, { hours: number; cost: number }>();
  for (const l of lines) {
    if (!l.billable || l.revenue !== null || (projectHours.get(l.refCode) ?? 0) === 0) continue;
    const u = unpriced.get(l.refCode) ?? { hours: 0, cost: 0 };
    u.hours += l.hours;
    u.cost += l.cost;
    unpriced.set(l.refCode, u);
  }
  gaps.unpricedProjects = [...unpriced].map(([refCode, v]) => ({ refCode, ...v }));

  return {
    assumptions, months, lines, projects,
    employees: new Map(data.employees.map((e) => [e.employeeNo, e])),
    projectHours, gaps,
  };
}