"use client";

import { cn } from "../../utils/cn";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../shared";
import { useDataTable } from "./data-table";
import type { Column, DataTableRowData } from "./types";
import { renderFormattedValue } from "./formatters";
import { getRowIdentifier } from "./utilities";

interface DataTableAccordionCardProps {
  row: DataTableRowData;
  index: number;
  isFirst?: boolean;
}

function categorizeColumns(columns: Column[]) {
  const primary: Column[] = [];
  const secondary: Column[] = [];

  let seenVisible = 0;
  columns.forEach((col) => {
    if (col.hideOnMobile) return;

    if (col.priority === "primary") {
      primary.push(col);
    } else if (col.priority === "secondary") {
      secondary.push(col);
    } else if (col.priority === "tertiary") {
      return;
    } else {
      if (seenVisible < 2) {
        primary.push(col);
      } else {
        secondary.push(col);
      }
      seenVisible++;
    }
  });

  return { primary, secondary };
}

export function DataTableAccordionCard({
  row,
  index,
  isFirst = false,
}: DataTableAccordionCardProps) {
  const { columns, locale, rowIdKey } = useDataTable();

  const { primary, secondary } = categorizeColumns(columns);

  if (secondary.length === 0) {
    return (
      <SimpleCard row={row} columns={primary} index={index} isFirst={isFirst} />
    );
  }

  const primaryColumn = primary[0];
  const secondaryPrimary = primary.slice(1);

  const stableRowId =
    getRowIdentifier(row, rowIdKey ? String(rowIdKey) : undefined) ||
    `${index}-${primaryColumn?.key ?? "row"}`;

  const headingId = `row-${stableRowId}-heading`;
  const detailsId = `row-${stableRowId}-details`;
  const secondaryDataIds = secondaryPrimary.map(
    (col) => `row-${stableRowId}-${String(col.key)}`,
  );

  const primaryValue = primaryColumn
    ? String(row[primaryColumn.key] ?? "")
    : "";
  const rowLabel = `Row ${index + 1}: ${primaryValue}`;
  const itemValue = `row-${stableRowId}`;

  return (
    <Accordion
      type="single"
      collapsible
      className={cn(!isFirst && "border-t")}
      role="listitem"
      aria-label={rowLabel}
    >
      <AccordionItem value={itemValue} className="group border-0">
        <AccordionTrigger
          className="group-data-[state=closed]:hover:bg-accent/50 active:bg-accent/50 group-data-[state=open]:bg-muted w-full rounded-none px-4 py-3 hover:no-underline"
          aria-controls={detailsId}
          aria-label={`${rowLabel}. ${secondary.length > 0 ? "Expand for details" : ""}`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {primaryColumn && (
              <div
                id={headingId}
                role="heading"
                aria-level={3}
                className="truncate"
                aria-label={`${primaryColumn.label}: ${row[primaryColumn.key]}`}
              >
                {renderFormattedValue({
                  value: row[primaryColumn.key] ?? null,
                  column: { format: primaryColumn.format },
                  row,
                  locale,
                })}
              </div>
            )}

            {secondaryPrimary.length > 0 && (
              <div
                className="text-muted-foreground flex w-full flex-wrap gap-x-4 gap-y-0.5"
                role="group"
                aria-label="Summary information"
              >
                {secondaryPrimary.map((col, idx) => (
                  <span
                    key={col.key}
                    id={secondaryDataIds[idx]}
                    className="flex min-w-0 gap-1 font-normal"
                    role="cell"
                    aria-label={`${col.label}: ${row[col.key]}`}
                  >
                    <span className="sr-only">{col.label}:</span>
                    <span aria-hidden="true">{col.label}:</span>
                    <span className="truncate">
                      {renderFormattedValue({
                        value: row[col.key] ?? null,
                        column: { format: col.format },
                        row,
                        locale,
                      })}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </AccordionTrigger>

        <AccordionContent
          className={cn("flex flex-col gap-4", "px-4 pb-4")}
          id={detailsId}
          role="region"
          aria-labelledby={headingId}
        >
          {secondary.length > 0 && (
            <dl
              className={cn(
                "flex flex-col gap-2 pt-4",
                "group-data-[state=open]:animate-in group-data-[state=open]:fade-in-0",
                "group-data-[state=open]:slide-in-from-top-1",
                "group-data-[state=closed]:animate-out group-data-[state=closed]:fade-out-0",
                "group-data-[state=closed]:slide-out-to-top-1",
                "duration-150",
              )}
              role="list"
              aria-label="Additional data"
            >
              {secondary.map((col) => (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-4"
                  role="listitem"
                >
                  <dt
                    className="text-muted-foreground shrink-0"
                    id={`row-${stableRowId}-${String(col.key)}-label`}
                  >
                    {col.label}
                  </dt>
                  <dd
                    className={cn(
                      "text-foreground min-w-0 text-pretty break-words",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                    role="cell"
                    aria-labelledby={`row-${stableRowId}-${String(col.key)}-label`}
                  >
                    {renderFormattedValue({
                      value: row[col.key] ?? null,
                      column: { format: col.format },
                      row,
                      locale,
                    })}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/**
 * Simple card (no accordion) for when there are only primary columns
 */
function SimpleCard({
  row,
  columns,
  index,
  isFirst = false,
}: {
  row: DataTableRowData;
  columns: Column[];
  index: number;
  isFirst?: boolean;
}) {
  const { locale, rowIdKey } = useDataTable();
  const primaryColumn = columns[0];
  const otherColumns = columns.slice(1);

  const stableRowId =
    getRowIdentifier(row, rowIdKey ? String(rowIdKey) : undefined) ||
    `${index}-${primaryColumn?.key ?? "row"}`;

  const primaryValue = primaryColumn
    ? String(row[primaryColumn.key] ?? "")
    : "";
  const rowLabel = `Row ${index + 1}: ${primaryValue}`;

  return (
    <div
      className={cn("flex flex-col gap-2 p-4", !isFirst && "border-t")}
      role="listitem"
      aria-label={rowLabel}
    >
      {primaryColumn && (
        <div
          role="heading"
          aria-level={3}
          aria-label={`${primaryColumn.label}: ${row[primaryColumn.key]}`}
        >
          {renderFormattedValue({
            value: row[primaryColumn.key] ?? null,
            column: { format: primaryColumn.format },
            row,
            locale,
          })}
        </div>
      )}

      {otherColumns.map((col) => (
        <div
          key={col.key}
          className="flex items-start justify-between gap-4"
          role="group"
        >
          <span
            className="text-muted-foreground"
            id={`row-${stableRowId}-${String(col.key)}-label`}
          >
            {col.label}:
          </span>
          <span
            className={cn(
              "min-w-0 break-words",
              col.align === "right" && "text-right",
              col.align === "center" && "text-center",
            )}
            role="cell"
            aria-labelledby={`row-${stableRowId}-${String(col.key)}-label`}
          >
            {renderFormattedValue({
              value: row[col.key] ?? null,
              column: { format: col.format },
              row,
              locale,
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
