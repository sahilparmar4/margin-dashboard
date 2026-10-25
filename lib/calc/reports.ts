import type { CostModel, Line, MonthModel } from "./model";
import type { Filter } from "./types";

const inFilter = (x: { year: number; month: number }, f: Filter) =>
  (f.year === undefined || x.year === f.year) && (f.month === undefined || x.month === f.month);

const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const ratio = (num: number, den: number) => (den > 0 ? num / den : null);

function monthsIn(model: CostModel, f: Filter): MonthModel[] {
  return [...model.months.values()].filter((m) => inFilter(m, f));
}
function linesIn(model: CostModel, f: Filter): Line[] {
  return model.lines.filter((l) => inFilter(l, f));
}
const nameOf = (model: CostModel, no: string) => model.employees.get(no)?.name ?? no;

/** Years/months that actually have data, for the filter dropdowns. */
export function availablePeriods(model: CostModel) {
  const years = [...new Set([...model.months.values()].map((m) => m.year))].sort();
  const months = [...model.months.values()].map((m) => ({ year: m.year, month: m.month }));
  return { years, months };
}

// ---------------------------------------------------------------- dashboard
export function periodSummary(model: CostModel, f: Filter = {}) {
  const lines = linesIn(model, f);
  const months = monthsIn(model, f);
  const billable = lines.filter((l) => l.billable);

  const totalHours = sum(lines, (l) => l.hours);
  const billableHours = sum(billable, (l) => l.hours);
  const allocatedCost = sum(billable, (l) => l.cost);
  const unallocatedCost = sum(months, (m) => m.unallocatedCost);
  const cost = allocatedCost + unallocatedCost;
  const revenue = sum(billable, (l) => l.revenue ?? 0);
  const unpricedCost = sum(billable.filter((l) => l.revenue === null), (l) => l.cost);
  const profit = revenue - cost;

  return {
    totalHours,
    billableHours,
    utilisation: ratio(billableHours, totalHours),
    cost,
    revenue,
    profit,
    margin: ratio(profit, revenue),
    // reconciliation figures
    payroll: sum(months, (m) => m.payroll),
    overhead: sum(months, (m) => m.overhead),
    unpricedCost,
    unallocatedCost,
  };
}

/** Month-by-month series for a trend chart. */
export function monthlySeries(model: CostModel, year?: number) {
  return [...model.months.values()]
    .filter((m) => year === undefined || m.year === year)
    .map((m) => ({ year: m.year, month: m.month, ...periodSummary(model, { year: m.year, month: m.month }) }));
}

// ----------------------------------------------------------------- projects
export function projectList(model: CostModel) {
  const refs = [...new Set(model.lines.filter((l) => l.billable).map((l) => l.refCode))];
  return refs
    .map((ref) => {
      const d = projectDetail(model, ref)!;
      return {
        refCode: ref, name: d.name, status: d.status, price: d.price,
        hours: d.totalHours, cost: d.cost, profit: d.profit, margin: d.margin,
      };
    })
    .sort((a, b) => a.refCode.localeCompare(b.refCode));
}

export function projectDetail(model: CostModel, refCode: string) {
  const lines = model.lines.filter((l) => l.billable && l.refCode === refCode);
  if (lines.length === 0 && !model.projects.has(refCode)) return null;
  const project = model.projects.get(refCode);
  const price = project?.price ?? null;
  const cost = sum(lines, (l) => l.cost);
  const profit = price !== null ? price - cost : null;

  const byDepartment = new Map<string, { hours: number; cost: number }>();
  const byEmployee = new Map<string, Line[]>();
  for (const l of lines) {
    const d = byDepartment.get(l.department ?? "Unknown") ?? { hours: 0, cost: 0 };
    d.hours += l.hours;
    d.cost += l.cost;
    byDepartment.set(l.department ?? "Unknown", d);
    (byEmployee.get(l.employeeNo) ?? byEmployee.set(l.employeeNo, []).get(l.employeeNo)!).push(l);
  }

  return {
    refCode,
    name: project?.name ?? null,
    status: project?.status ?? null,
    price,
    hasPrice: price !== null,
    totalHours: sum(lines, (l) => l.hours),
    directCost: sum(lines, (l) => l.directCost),
    indirectCost: sum(lines, (l) => l.indirectCost),
    cost,
    profit,
    margin: price !== null ? ratio(profit!, price) : null,
    hoursByDepartment: [...byDepartment]
      .map(([department, v]) => ({ department, ...v }))
      .sort((a, b) => b.hours - a.hours),
    employees: [...byEmployee]
      .map(([employeeNo, ls]) => {
        const revenue = price !== null ? sum(ls, (l) => l.revenue ?? 0) : null;
        const c = sum(ls, (l) => l.cost);
        return {
          employeeNo,
          name: nameOf(model, employeeNo),
          department: ls[0].department,
          hours: sum(ls, (l) => l.hours),
          directCost: sum(ls, (l) => l.directCost),
          indirectCost: sum(ls, (l) => l.indirectCost),
          cost: c,
          revenue,
          profit: revenue !== null ? revenue - c : null,
          margin: revenue !== null ? ratio(revenue - c, revenue) : null,
        };
      })
      .sort((a, b) => b.hours - a.hours),
  };
}

// ------------------------------------------------------------- productivity
export function productivity(model: CostModel, f: Filter = {}) {
  const byPerson = new Map<string, { total: number; billable: number }>();
  for (const l of linesIn(model, f)) {
    const p = byPerson.get(l.employeeNo) ?? { total: 0, billable: 0 };
    p.total += l.hours;
    if (l.billable) p.billable += l.hours;
    byPerson.set(l.employeeNo, p);
  }
  return [...byPerson]
    .map(([employeeNo, p]) => ({
      employeeNo,
      name: nameOf(model, employeeNo),
      department: model.employees.get(employeeNo)?.department ?? null,
      totalHours: p.total,
      billableHours: p.billable,
      productivity: ratio(p.billable, p.total),
    }))
    .sort((a, b) => (b.productivity ?? -1) - (a.productivity ?? -1));
}

// ---------------------------------------------------------------- categories
export function categoryHours(model: CostModel, f: Filter = {}) {
  const lines = linesIn(model, f);
  const total = sum(lines, (l) => l.hours);
  const byCat = new Map<string, { hours: number; billable: boolean }>();
  for (const l of lines) {
    const c = byCat.get(l.category) ?? { hours: 0, billable: l.billable };
    c.hours += l.hours;
    byCat.set(l.category, c);
  }
  return [...byCat]
    .map(([category, c]) => ({ category, hours: c.hours, billable: c.billable, share: ratio(c.hours, total) }))
    .sort((a, b) => b.hours - a.hours);
}

/** Employee x category pivot (what finance builds by hand). */
export function employeeCategoryMatrix(model: CostModel, f: Filter = {}) {
  const cats = categoryHours(model, f).map((c) => c.category);
  const rows = new Map<string, Map<string, number>>();
  for (const l of linesIn(model, f)) {
    const r = rows.get(l.employeeNo) ?? new Map<string, number>();
    r.set(l.category, (r.get(l.category) ?? 0) + l.hours);
    rows.set(l.employeeNo, r);
  }
  return {
    categories: cats,
    rows: [...rows].map(([employeeNo, r]) => ({
      employeeNo,
      name: nameOf(model, employeeNo),
      hours: cats.map((c) => r.get(c) ?? 0),
      total: sum([...r.values()], (x) => x),
    })),
  };
}

// --------------------------------------------------------------- departments
export function departmentList(model: CostModel, f: Filter = {}) {
  const byDept = new Map<string, { hours: number; cost: number; people: Set<string> }>();
  for (const l of linesIn(model, f)) {
    const k = l.department ?? "Unknown";
    const d = byDept.get(k) ?? { hours: 0, cost: 0, people: new Set() };
    d.hours += l.hours;
    d.cost += l.cost;
    d.people.add(l.employeeNo);
    byDept.set(k, d);
  }
  return [...byDept]
    .map(([department, d]) => ({ department, hours: d.hours, cost: d.cost, people: d.people.size }))
    .sort((a, b) => b.hours - a.hours);
}

export function departmentDetail(model: CostModel, department: string, f: Filter = {}) {
  const lines = linesIn(model, f).filter((l) => (l.department ?? "Unknown") === department);
  const byPerson = new Map<string, Line[]>();
  for (const l of lines) (byPerson.get(l.employeeNo) ?? byPerson.set(l.employeeNo, []).get(l.employeeNo)!).push(l);
  return [...byPerson]
    .map(([employeeNo, ls]) => ({
      employeeNo,
      name: nameOf(model, employeeNo),
      hours: sum(ls, (l) => l.hours),
      billableHours: sum(ls.filter((l) => l.billable), (l) => l.hours),
      /** hours x direct rate over ALL their hours = their salary for the period. */
      salaryCost: sum(ls, (l) => l.salaryValue),
      /** cost carried by their billable work (direct + share of indirect). */
      allocatedCost: sum(ls, (l) => l.cost),
    }))
    .sort((a, b) => b.hours - a.hours);
}

// ----------------------------------------------------------------- self-check
/**
 * The brief's reconciliation: with overhead = 0, total cost must equal total salaries.
 * (With overhead > 0: total cost = salaries + overhead.)
 */
export function reconcile(model: CostModel, f: Filter = {}) {
  const s = periodSummary(model, f);
  const expected = s.payroll + s.overhead;
  return {
    totalCost: s.cost,
    totalSalaries: s.payroll,
    overhead: s.overhead,
    difference: s.cost - expected,
    ok: Math.abs(s.cost - expected) < 0.005,
  };
}