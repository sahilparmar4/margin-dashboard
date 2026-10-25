import { describe, expect, it } from "vitest";
import { buildCostModel } from "../lib/calc/model";
import { productivity, projectDetail, periodSummary, reconcile, categoryHours } from "../lib/calc/reports";
import type { Dataset } from "../lib/calc/types";

/**
 * Jan 2025, hand-calculated:
 *  A: salary 1000, 60h on P1 + 20h meetings + 20h leave  => 100h, direct rate 10
 *  B: salary 2000, 40h on P1                              => 40h,  direct rate 50
 *  C: salary 500, logged nothing (support staff)
 *  absorbed = 40 x 10 = 400;  pool = 500 + 400 = 900;  billable = 100h => indirect rate 9
 *  A cost on P1 = 60 x 19 = 1140;  B = 40 x 59 = 2360;  project cost = 3500 = 1000+2000+500
 */
const base: Dataset = {
  entries: [
    { year: 2025, month: 1, employeeNo: "A", department: "Design", category: "Projects", refCode: "P1", hours: 60 },
    { year: 2025, month: 1, employeeNo: "A", department: "Design", category: "FC - Meetings", refCode: "FC - Meetings", hours: 20 },
    { year: 2025, month: 1, employeeNo: "A", department: "Design", category: "FC - Leaves", refCode: "FC - Leaves", hours: 20 },
    { year: 2025, month: 1, employeeNo: "B", department: "Backend", category: "Projects", refCode: "P1", hours: 40 },
  ],
  salaries: [
    { employeeNo: "A", year: 2025, month: 1, amount: 1000 },
    { employeeNo: "B", year: 2025, month: 1, amount: 2000 },
    { employeeNo: "C", year: 2025, month: 1, amount: 500 },
  ],
  projects: [{ refCode: "P1", name: "Project One", price: 5000, status: "completed", category: "Projects" }],
  employees: [
    { employeeNo: "A", name: "Ann", department: "Design", designation: null },
    { employeeNo: "B", name: "Bob", department: "Backend", designation: null },
    { employeeNo: "C", name: "Cat", department: "Admin", designation: null },
  ],
};
const A0 = { billableCategories: ["Projects", "Enhancements", "Hosting"], monthlyOverhead: 0 };

describe("cost model", () => {
  const model = buildCostModel(base, A0);

  it("computes the monthly rates", () => {
    const m = model.months.get(202501)!;
    expect(m.supportSalaries).toBe(500);
    expect(m.absorbedCost).toBe(400);
    expect(m.indirectPool).toBe(900);
    expect(m.indirectRate).toBe(9);
  });

  it("costs the project per employee", () => {
    const p = projectDetail(model, "P1")!;
    const ann = p.employees.find((e) => e.employeeNo === "A")!;
    const bob = p.employees.find((e) => e.employeeNo === "B")!;
    expect(ann.cost).toBeCloseTo(1140);
    expect(bob.cost).toBeCloseTo(2360);
    expect(p.cost).toBeCloseTo(3500);
    expect(p.profit).toBeCloseTo(1500);
    expect(p.margin).toBeCloseTo(0.3);
  });

  it("shares revenue by hours and gives per-employee margins", () => {
    const p = projectDetail(model, "P1")!;
    const ann = p.employees.find((e) => e.employeeNo === "A")!;
    const bob = p.employees.find((e) => e.employeeNo === "B")!;
    expect(ann.revenue).toBeCloseTo(3000);
    expect(bob.revenue).toBeCloseTo(2000);
    expect(ann.margin).toBeCloseTo(0.62);
    expect(bob.margin).toBeCloseTo(-0.18);
    expect(p.employees.reduce((a, e) => a + (e.revenue ?? 0), 0)).toBeCloseTo(5000);
  });

  it("reconciles: total cost equals total salaries when overhead is 0", () => {
    const r = reconcile(model);
    expect(r.totalCost).toBeCloseTo(3500);
    expect(r.totalSalaries).toBe(3500);
    expect(r.ok).toBe(true);
  });

  it("adds overhead to the pool and still reconciles", () => {
    const m = buildCostModel(base, { ...A0, monthlyOverhead: 300 });
    expect(m.months.get(202501)!.indirectRate).toBe(12);
    const r = reconcile(m);
    expect(r.totalCost).toBeCloseTo(3800);
    expect(r.ok).toBe(true);
  });

  it("computes productivity = billable / total", () => {
    const p = productivity(model);
    expect(p.find((x) => x.employeeNo === "A")!.productivity).toBeCloseTo(0.6);
    expect(p.find((x) => x.employeeNo === "B")!.productivity).toBeCloseTo(1);
  });

  it("respects the configurable billable categories", () => {
    const m = buildCostModel(base, { ...A0, billableCategories: ["Projects", "FC - Meetings"] });
    expect(m.months.get(202501)!.billableHours).toBe(120);
    expect(reconcile(m).ok).toBe(true);
    expect(categoryHours(m).find((c) => c.category === "FC - Meetings")!.billable).toBe(true);
  });

  it("flags a missing salary instead of crashing", () => {
    const d: Dataset = { ...base, salaries: base.salaries.filter((s) => s.employeeNo !== "B") };
    const m = buildCostModel(d, A0);
    expect(m.gaps.missingSalary).toEqual([{ employeeNo: "B", year: 2025, month: 1, hours: 40 }]);
    expect(Number.isFinite(periodSummary(m).cost)).toBe(true);
    expect(reconcile(m).ok).toBe(true); // still equals the salaries that DO exist
  });

  it("flags an unpriced project and gives it no margin", () => {
    const d: Dataset = { ...base, projects: [] };
    const m = buildCostModel(d, A0);
    expect(m.gaps.unpricedProjects[0].refCode).toBe("P1");
    const p = projectDetail(m, "P1")!;
    expect(p.hasPrice).toBe(false);
    expect(p.margin).toBeNull();
    expect(p.cost).toBeCloseTo(3500);
  });

  it("keeps cost when a month has no billable hours", () => {
    const d: Dataset = { ...base, entries: base.entries.filter((e) => e.category !== "Projects") };
    const m = buildCostModel(d, A0);
    expect(m.gaps.monthsWithoutBillableHours).toHaveLength(1);
    expect(reconcile(m).ok).toBe(true);
  });

  it("filters by month without mixing periods", () => {
    const feb: Dataset = {
      ...base,
      entries: [...base.entries, { year: 2025, month: 2, employeeNo: "A", department: "Design", category: "Projects", refCode: "P1", hours: 10 }],
      salaries: [...base.salaries, { employeeNo: "A", year: 2025, month: 2, amount: 1000 }],
    };
    const m = buildCostModel(feb, A0);
    expect(periodSummary(m, { year: 2025, month: 1 }).payroll).toBe(3500);
    expect(periodSummary(m, { year: 2025, month: 2 }).payroll).toBe(1000);
    expect(reconcile(m).ok).toBe(true);
  });
});