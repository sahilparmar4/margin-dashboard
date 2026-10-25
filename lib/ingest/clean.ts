import type { CellValue, Worksheet } from "exceljs";

/** A problem found while reading a file (shown to the user, never thrown). */
export interface Issue {
  row: number | null;
  message: string;
}

export interface ParseResult<T> {
  rows: T[];
  issues: Issue[];
}

/** Thrown when a file is not what it claims to be (wrong shape / not xlsx). */
export class FileShapeError extends Error {}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const EMPTY_MARKERS = new Set(["", "-", "–", "—", "n/a", "na", "null"]);

/** Unwrap ExcelJS cell shapes (formulas, rich text, hyperlinks) to a plain value. */
function unwrap(v: CellValue): string | number | boolean | Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return unwrap(v.result as CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    return null; // error cells etc.
  }
  return v;
}

/** Trimmed text, or null for empty cells and "-" placeholders. */
export function cleanText(v: CellValue): string | null {
  const p = unwrap(v);
  if (p === null) return null;
  const s = (p instanceof Date ? p.toISOString() : String(p)).trim();
  return EMPTY_MARKERS.has(s.toLowerCase()) ? null : s;
}

/** Number, or null for empty cells and "-" placeholders. Tolerates "1,200" / "AED 1200". */
export function cleanNumber(v: CellValue): number | null {
  const p = unwrap(v);
  if (typeof p === "number") return Number.isFinite(p) ? p : null;
  const s = cleanText(v);
  if (s === null) return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && /\d/.test(s) ? n : null;
}

/** Employee numbers are identifiers (keep leading zeros), never maths. */
export function cleanEmployeeNo(v: CellValue): string | null {
  return cleanText(v);
}

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

/**
 * Understands: "May '25", "January 2026", "Jan-25", "January", a real Date.
 * A bare month name ("January") needs `defaultYear`.
 */
export function parseYearMonth(v: CellValue, defaultYear?: number): YearMonth | null {
  const p = unwrap(v);
  if (p === null) return null;
  if (p instanceof Date) {
    return { year: p.getUTCFullYear(), month: p.getUTCMonth() + 1 };
  }
  const s = String(p).trim().toLowerCase();
  const word = s.match(/[a-z]{3,}/)?.[0];
  if (!word) return null;
  const idx = MONTH_NAMES.findIndex((m) => m.startsWith(word === "sept" ? "sep" : word));
  if (idx === -1) return null;
  const four = s.match(/\b(20\d{2})\b/);
  const two = s.match(/['’\-\/\s](\d{2})\b/);
  const year = four ? Number(four[1]) : two ? 2000 + Number(two[1]) : defaultYear;
  if (year === undefined) return null;
  return { year, month: idx + 1 };
}

/** Month from a bare column header such as "January" or "Jan 2025" (year 0 = not in the header). */
export function monthFromHeader(v: CellValue): YearMonth | null {
  return parseYearMonth(v, 0);
}

export type HeaderSpec = Record<string, { match: RegExp; required?: boolean }>;

export interface HeaderLocation {
  rowNumber: number;
  columns: Record<string, number>; // field -> 1-based column index
}

/** Find the header row (it is not always row 1) by looking for the expected column names. */
export function locateHeader(
  ws: Worksheet,
  spec: HeaderSpec,
  maxScanRows = 30,
): HeaderLocation | null {
  const last = Math.min(ws.rowCount, maxScanRows);
  for (let r = 1; r <= last; r++) {
    const columns: Record<string, number> = {};
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell, col) => {
      const text = cleanText(cell.value)?.toLowerCase();
      if (!text) return;
      for (const [field, { match }] of Object.entries(spec)) {
        if (columns[field] === undefined && match.test(text)) {
          columns[field] = col;
          break;
        }
      }
    });
    const ok = Object.entries(spec).every(
      ([field, { required }]) => !required || columns[field] !== undefined,
    );
    if (ok) return { rowNumber: r, columns };
  }
  return null;
}

export function describeSpec(spec: HeaderSpec): string {
  return Object.entries(spec)
    .filter(([, s]) => s.required)
    .map(([f]) => f)
    .join(", ");
}