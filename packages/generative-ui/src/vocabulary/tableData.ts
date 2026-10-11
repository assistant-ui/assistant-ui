import { isNumericTableFormat } from "./formatValue";

type TableColumn = {
  label: string;
  align?: "start" | "end";
  format?: unknown;
};
type TableCell = string | number | boolean;

export type TableSort = {
  column: number;
  direction: "ascending" | "descending";
};

const tableCollator = new Intl.Collator("en-US", { numeric: true });

export const isTableColumn = (column: unknown): column is TableColumn =>
  column !== null &&
  typeof column === "object" &&
  "label" in column &&
  typeof column.label === "string";

const isTableCell = (cell: unknown): cell is TableCell =>
  typeof cell === "string" ||
  typeof cell === "number" ||
  typeof cell === "boolean";

export const tableAlignment = (
  column: unknown,
): "start" | "end" | undefined => {
  if (!isTableColumn(column)) return undefined;
  if (column.align === "start" || column.align === "end") return column.align;
  return isNumericTableFormat(column.format) ? "end" : undefined;
};

export const compareTableCells = (left: unknown, right: unknown): number => {
  if (
    typeof left === "number" &&
    Number.isFinite(left) &&
    typeof right === "number" &&
    Number.isFinite(right)
  ) {
    return left - right;
  }
  if (typeof left === "number" && Number.isFinite(left)) return -1;
  if (typeof right === "number" && Number.isFinite(right)) return 1;
  return tableCollator.compare(
    isTableCell(left) ? String(left) : "",
    isTableCell(right) ? String(right) : "",
  );
};

export function sortTableRows(rows: unknown[][], sort: TableSort): unknown[][] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareTableCells(
        left.row[sort.column],
        right.row[sort.column],
      );
      return comparison === 0
        ? left.index - right.index
        : sort.direction === "ascending"
          ? comparison
          : -comparison;
    })
    .map(({ row }) => row);
}

export function nextTableSort(
  current: TableSort | undefined,
  column: number,
): TableSort | undefined {
  return current?.column !== column
    ? { column, direction: "ascending" }
    : current.direction === "ascending"
      ? { column, direction: "descending" }
      : undefined;
}
