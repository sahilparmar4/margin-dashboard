import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { ingestUpload, type UploadFiles } from "../lib/ingest/upload";
import { pool } from "../lib/db/client";

// Loads whatever is in sample-data/ through the SAME code path the upload page uses.
async function main() {
  const dir = join(process.cwd(), "sample-data");
  const names = readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".xlsx"));
  const pick = (re: RegExp) => {
    const n = names.find((x) => re.test(x.toLowerCase()));
    return n ? { buffer: readFileSync(join(dir, n)), fileName: n } : undefined;
  };
  const files: UploadFiles = {
    timesheet: pick(/timesheet/),
    salaries: pick(/salar/),
    projects: pick(/project/),
  };
  const result = await ingestUpload(files);
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});