import * as yup from "yup";
import ExcelJS from "exceljs";
import {
  FileShapeError, Issue, ParseResult,
  cleanEmployeeNo, cleanNumber, cleanText, locateHeader, monthFromHeader,
} from "./clean";
import type { ParseOptions } from "./timesheet";

export const salaryRowSchema = yup.object({
  employeeNo: yup.string().required(),
  employeeName: yup.string().nullable().defined(),
  year: yup.number().integer().required(),
  month: yup.number().integer().min(1).max(12).required(),
  amount: yup.number().min(0).required(),
});

export type SalaryRow = yup.InferType<typeof salaryRowSchema>;

export async function parseSalaries(
  buffer: Buffer,
  opts: ParseOptions & { fileName?: string } = {},
): Promise<ParseResult<SalaryRow>> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new FileShapeError("The salary file is not a readable .xlsx workbook.");
  }

  for (const ws of wb.worksheets) {
    // Header = a row with "Employee No." and "Employee Name" (title row sits above it)
    const header = locateHeader(ws, {
      employeeNo: { match: /employee\s*(no|number|id)/, required: true },
      employeeName: { match: /employee\s*name/, required: true },
    });
    if (!header) continue;

    // Month columns: every header cell that is a month name.
    const headerRow = ws.getRow(header.rowNumber);
    const monthCols: { col: number; month: number; year?: number }[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
      const ym = monthFromHeader(cell.value);
      if (ym) monthCols.push({ col, month: ym.month, year: ym.year || undefined });
    });
    if (monthCols.length === 0) continue;

    // Year: from the month headers ("January 2025"), else the title above ("Salary Overview 2025"),
    // else the file name, else the caller's default.
    let year = monthCols.find((m) => m.year)?.year;
    if (!year) {
      for (let r = 1; r < header.rowNumber && !year; r++) {
        ws.getRow(r).eachCell((cell) => {
          const m = cleanText(cell.value)?.match(/\b(20\d{2})\b/);
          if (m && !year) year = Number(m[1]);
        });
      }
    }
    if (!year) year = Number(opts.fileName?.match(/(20\d{2})/)?.[1]) || opts.defaultYear;

    const issues: Issue[] = [];
    if (!year) {
      throw new FileShapeError("Couldn't work out which year this salary file covers.");
    }

    const rows: SalaryRow[] = [];
    for (let r = header.rowNumber + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const employeeNo = cleanEmployeeNo(row.getCell(header.columns.employeeNo).value);
      const employeeName = cleanText(row.getCell(header.columns.employeeName).value);
      if (!employeeNo && !employeeName) continue;
      if (!employeeNo) {
        issues.push({ row: r, message: `No employee number for "${employeeName}" – row skipped.` });
        continue;
      }
      for (const { col, month, year: y } of monthCols) {
        const amount = cleanNumber(row.getCell(col).value); // "-" => null => no salary that month
        if (amount === null) continue;
        try {
          rows.push(
            salaryRowSchema.validateSync(
              { employeeNo, employeeName, year: y ?? year, month, amount },
              { abortEarly: false },
            ),
          );
        } catch (e) {
          const msg = e instanceof yup.ValidationError ? e.errors.join("; ") : "invalid";
          issues.push({ row: r, message: `${msg} – cell skipped.` });
        }
      }
    }
    return { rows, issues };
  }

  throw new FileShapeError(
    "This doesn't look like a salary file. Couldn't find 'Employee No.', 'Employee Name' and month columns.",
  );
}