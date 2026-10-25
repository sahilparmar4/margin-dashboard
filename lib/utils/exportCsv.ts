export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => unknown;
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    value = value.toISOString();
  }

  let text = String(value);

  // Prevent spreadsheet formula injection in string values.
  if (
    typeof value === "string" &&
    /^[\t\r ]*[=+\-@]/.test(text)
  ) {
    text = `'${text}`;
  }

  // Escape quotes and wrap cells containing special CSV characters.
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const header = columns
    .map((column) => formatCell(column.header))
    .join(",");

  const body = rows
    .map((row) =>
      columns
        .map((column) => formatCell(column.accessor(row)))
        .join(","),
    )
    .join("\r\n");

  const csv = `\uFEFF${header}\r\n${body}`;

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv")
    ? filename
    : `${filename}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}