import { loadAssumptions, loadDataset } from "../lib/db/load";
import { buildCostModel } from "../lib/calc/model";
import { periodSummary, reconcile } from "../lib/calc/reports";
import { pool } from "../lib/db/client";

// Prints the year's totals and runs the brief's self-check.
async function main() {
  const data = await loadDataset();
  const saved = await loadAssumptions();
  const f2 = (n: number | null) => (n === null ? "n/a" : n.toLocaleString("en-US", { maximumFractionDigits: 2 }));

  for (const [label, overhead] of [["overhead = 0 (self-check)", 0], [`saved overhead = ${saved.monthlyOverhead}`, saved.monthlyOverhead]] as const) {
    const model = buildCostModel(data, { ...saved, monthlyOverhead: overhead });
    const s = periodSummary(model);
    const r = reconcile(model);
    console.log(`\n== ${label}`);
    console.log("total hours      ", f2(s.totalHours));
    console.log("billable hours   ", f2(s.billableHours));
    console.log("cost             ", f2(s.cost));
    console.log("revenue          ", f2(s.revenue));
    console.log("profit           ", f2(s.profit));
    console.log("margin           ", s.margin === null ? "n/a" : (s.margin * 100).toFixed(2) + "%");
    console.log("total salaries   ", f2(r.totalSalaries), "| overhead", f2(r.overhead));
    console.log("cost - (salaries+overhead) =", r.difference.toFixed(6), r.ok ? "  PASS" : "  FAIL");
    console.log("gaps:", JSON.stringify(model.gaps));
  }
  await pool.end();
}
main();