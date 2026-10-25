type ListQueryOptions<T> = {
  search?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  searchFields: (keyof T)[];
  sortableFields: (keyof T)[];
};

export function searchAndSort<T extends Record<string, unknown>>(
  rows: T[],
  options: ListQueryOptions<T>,
): T[] {
  const {
    search,
    sortBy,
    sortOrder,
    searchFields,
    sortableFields,
  } = options;

  let result = [...rows];

  // Search
  const term = search?.trim().toLowerCase();

  if (term) {
    result = result.filter((row) =>
      searchFields.some((field) =>
        String(row[field] ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }

  // Validate sorting
  if (sortBy) {
    const field = sortableFields.find(
      (item) => String(item) === sortBy,
    );

    if (!field) {
      throw new Error(`Invalid sort field: ${sortBy}`);
    }

    if (
      sortOrder &&
      !["asc", "desc"].includes(sortOrder.toLowerCase())
    ) {
      throw new Error("sortOrder must be 'asc' or 'desc'.");
    }

    const direction =
      sortOrder?.toLowerCase() === "desc" ? -1 : 1;

    result.sort((a, b) => {
      const left = a[field];
      const right = b[field];

      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;

      let comparison: number;

      if (typeof left === "number" && typeof right === "number") {
        comparison = left - right;
      } else {
        comparison = String(left).localeCompare(
          String(right),
          undefined,
          { numeric: true, sensitivity: "base" },
        );
      }

      return comparison * direction;
    });
  } else if (sortOrder) {
    throw new Error("sortBy is required when sortOrder is provided.");
  }

  return result;
}   