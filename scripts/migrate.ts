import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "../lib/db/client";

async function main() {
  const sql = readFileSync(join(process.cwd(), "lib/db/schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Schema applied");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});