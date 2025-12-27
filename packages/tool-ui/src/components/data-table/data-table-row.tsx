"use client";

import { useDataTable } from "./data-table";
import { DataTableCell } from "./data-table-cell";
import { TableRow } from "../shared";
import type { DataTableRowData } from "./types";

interface DataTableRowProps {
  row: DataTableRowData;
  className?: string;
}

export function DataTableRow({ row, className }: DataTableRowProps) {
  const { columns } = useDataTable();

  return (
    <TableRow className={className}>
      {columns.map((column, columnIndex) => (
        <DataTableCell
          key={column.key}
          value={row[column.key] ?? null}
          column={column}
          row={row}
          columnIndex={columnIndex}
        />
      ))}
    </TableRow>
  );
}
