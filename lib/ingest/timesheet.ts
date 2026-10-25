import * as yup from "yup";
import ExcelJS from "exceljs";
import {
  FileShapeError, Issue, ParseResult, HeaderSpec,
  cleanEmployeeNo, cleanNumber, cleanText, locateHeader, parseYearMonth, describeSpec,
} from "./clean";

const SPEC: HeaderSpec = {
  month: { match: /^month$/, required: true },
  employeeNo: { match: /employee\s*(no|number|id)/, required: true },
  employeeName: { match: /employee\s*name/ },
  expenseType: { match: /type\s*of\s*expense/ },
  department: { match: /^department$/ },
  designation: { match: /^designation$/ },
  category: { match: /^category$/, required: true },
  refCode: { match: /ref\s*code/, required: true },
  taskName: { match: /project.*task|task.*name|^project/ },
  company: { match: /^company/ },
  description: { match: /^description$/ },
  hours: { match: /^hours$/, required: true },
};

export const timesheetRowSchema = yup.object({
  year: yup.number().integer().required(),
  month: yup.number().integer().min(1).max(12).required(),
  employeeNo: yup.string().required(),
  employeeName: yup.string().nullable().defined(),
  expenseType: yup.string().nullable().defined(),
  department: yup.string().nullable().defined(),
  designation: yup.string().nullable().defined(),
  category: yup.string().required(),
  refCode: yup.string().required(),
  taskName: yup.string().nullable().defined(),
  company: yup.string().nullable().defined(),
  description: yup.string().nullable().defined(),
  hours: yup.number().min(0).required(),
});

export type TimesheetRow = yup.InferType<typeof timesheetRowSchema>;

export interface ParseOptions {
  /** Used only for month cells that carry no year (e.g. "January"). */
  defaultYear?: number;
}

export async function parseTimesheet(
  buffer: Buffer,
  opts: ParseOptions = {},
): Promise<ParseResult<TimesheetRow>> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new FileShapeError("The timesheet file is not a readable .xlsx workbook.");
  }

  for (const ws of wb.worksheets) {
    const header = locateHeader(ws, SPEC);
    if (!header) continue;

    const { columns: c, rowNumber } = header;
    const rows: TimesheetRow[] = [];
    const issues: Issue[] = [];

    for (let r = rowNumber + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = (f: string) => (c[f] ? row.getCell(c[f]).value : null);

      const employeeNo = cleanEmployeeNo(get("employeeNo"));
      const category = cleanText(get("category"));
      const monthRaw = get("month");
      // fully blank / spacer rows
      if (!employeeNo && !category && cleanText(monthRaw) === null) continue;

      const ym = parseYearMonth(monthRaw, opts.defaultYear);
      if (!ym) {
        issues.push({ row: r, message: `Unreadable month "${cleanText(monthRaw) ?? ""}" – row skipped.` });
        continue;
      }

      const candidate = {
        ...ym,
        employeeNo,
        employeeName: cleanText(get("employeeName")),
        expenseType: cleanText(get("expenseType"))?.toUpperCase() ?? null,
        department: cleanText(get("department")),
        designation: cleanText(get("designation")),
        category,
        // internal rows sometimes have no ref code: fall back to the category
        refCode: cleanText(get("refCode")) ?? category,
        taskName: cleanText(get("taskName")),
        company: cleanText(get("company")),
        description: cleanText(get("description")),
        hours: cleanNumber(get("hours")) ?? 0,
      };

      try {
        rows.push(timesheetRowSchema.validateSync(candidate, { abortEarly: false }));
      } catch (e) {
        const msg = e instanceof yup.ValidationError ? e.errors.join("; ") : "invalid row";
        issues.push({ row: r, message: `${msg} – row skipped.` });
      }
    }
    return { rows, issues };
  }

  throw new FileShapeError(
    `This doesn't look like a timesheet. Couldn't find a header row with: ${describeSpec(SPEC)}.`,
  );
}