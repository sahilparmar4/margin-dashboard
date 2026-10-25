import * as yup from "yup";
import ExcelJS from "exceljs";
import {
  FileShapeError, Issue, ParseResult, HeaderSpec,
  cleanNumber, cleanText, locateHeader, parseYearMonth, describeSpec,
} from "./clean";
import type { ParseOptions } from "./timesheet";

const SPEC: HeaderSpec = {
  refCode: { match: /ref\s*code/, required: true },
  name: { match: /project.*name|^name$/ },
  price: { match: /price/, required: true },
  salesMonth: { match: /sales\s*month|^month$/ },
  category: { match: /^category$/ },
  status: { match: /^status$/ },
};

export const projectRowSchema = yup.object({
  refCode: yup.string().required(),
  name: yup.string().nullable().defined(),
  price: yup.number().min(0).nullable().defined(), // null = sold but no price recorded
  salesYear: yup.number().integer().nullable().defined(),
  salesMonth: yup.number().integer().min(1).max(12).nullable().defined(),
  category: yup.string().nullable().defined(),
  status: yup.string().nullable().defined(),
});

export type ProjectRow = yup.InferType<typeof projectRowSchema>;

export async function parseProjects(
  buffer: Buffer,
  opts: ParseOptions = {},
): Promise<ParseResult<ProjectRow>> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new FileShapeError("The project prices file is not a readable .xlsx workbook.");
  }

  for (const ws of wb.worksheets) {
    const header = locateHeader(ws, SPEC);
    if (!header) continue;
    const c = header.columns;

    const rows: ProjectRow[] = [];
    const issues: Issue[] = [];
    const seen = new Set<string>();

    for (let r = header.rowNumber + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = (f: string) => (c[f] ? row.getCell(c[f]).value : null);
      const refCode = cleanText(get("refCode"));
      if (!refCode) continue;

      if (seen.has(refCode)) {
        issues.push({ row: r, message: `Duplicate ref code ${refCode} – the later row wins.` });
        const i = rows.findIndex((x) => x.refCode === refCode);
        if (i >= 0) rows.splice(i, 1);
      }
      seen.add(refCode);

      const ym = parseYearMonth(get("salesMonth"), opts.defaultYear);
      const price = cleanNumber(get("price"));
      if (price === null) {
        issues.push({ row: r, message: `${refCode} has no price – its margin can't be calculated.` });
      }
      try {
        rows.push(
          projectRowSchema.validateSync(
            {
              refCode,
              name: cleanText(get("name")),
              price,
              salesYear: ym?.year ?? null,
              salesMonth: ym?.month ?? null,
              category: cleanText(get("category")),
              status: cleanText(get("status")),
            },
            { abortEarly: false },
          ),
        );
      } catch (e) {
        const msg = e instanceof yup.ValidationError ? e.errors.join("; ") : "invalid row";
        issues.push({ row: r, message: `${msg} – row skipped.` });
      }
    }
    return { rows, issues };
  }

  throw new FileShapeError(
    `This doesn't look like a project prices file. Couldn't find a header row with: ${describeSpec(SPEC)}.`,
  );
}