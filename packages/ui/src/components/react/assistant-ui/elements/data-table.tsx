"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { safeHref } from "../utils/href";
import { clamp } from "../utils/range";
import { field, mono, paper } from "./surfaces";

export type DataTableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[];

export type DataTableRow = Readonly<Record<string, DataTableValue>>;

export type DataTableFormat =
  | { kind: "text" }
  | {
      kind: "number";
      decimals?: number | undefined;
      compact?: boolean | undefined;
      unit?: string | undefined;
    }
  | {
      kind: "currency";
      currency: string;
      decimals?: number | undefined;
      compact?: boolean | undefined;
    }
  | {
      kind: "percent";
      decimals?: number | undefined;
      basis?: "fraction" | "unit" | undefined;
    }
  | {
      kind: "delta";
      decimals?: number | undefined;
      unit?: string | undefined;
      upIsGood?: boolean | undefined;
    }
  | { kind: "date"; style?: "date" | "datetime" | "relative" | undefined }
  | {
      kind: "boolean";
      trueLabel?: string | undefined;
      falseLabel?: string | undefined;
    }
  | { kind: "link"; hrefKey?: string | undefined }
  | {
      kind: "badge";
      tones?:
        | Readonly<Record<string, "neutral" | "success" | "warning" | "danger">>
        | undefined;
    }
  | { kind: "list"; max?: number | undefined };

export interface DataTableColumn {
  key: string;
  label: string;
  format?: DataTableFormat | undefined;
  align?: "start" | "end" | undefined;
  sortable?: boolean | undefined;
  priority?: "primary" | "secondary" | undefined;
  width?: string | undefined;
}

export interface DataTableSort {
  key: string;
  direction: "asc" | "desc";
}

export interface DataTableProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  columns: readonly DataTableColumn[];
  rows: readonly DataTableRow[];
  rowKey?: string | undefined;
  caption?: string | undefined;
  defaultSort?: DataTableSort | undefined;
  sort?: DataTableSort | null | undefined;
  onSortChange?: ((sort: DataTableSort | null) => void) | undefined;
  locale?: string | undefined;
  emptyMessage?: string | undefined;
  relativeTo?: number | undefined;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const isEmpty = (value: DataTableValue) =>
  value === null || value === undefined;

const textValue = (value: Exclude<DataTableValue, null | undefined>) =>
  Array.isArray(value) ? value.join(", ") : String(value);

const asDate = (value: DataTableValue) => {
  const timestamp =
    typeof value === "number"
      ? value
      : typeof value === "string" && ISO_DATE.test(value)
        ? Date.parse(value)
        : Number.NaN;
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
};

const fractionDigits = (decimals: number | undefined) =>
  decimals === undefined || !Number.isFinite(decimals)
    ? {}
    : {
        minimumFractionDigits: Math.floor(clamp(decimals, 0, 20)),
        maximumFractionDigits: Math.floor(clamp(decimals, 0, 20)),
      };

const numberOptions = (decimals: number | undefined, compact: boolean) => ({
  notation: compact ? ("compact" as const) : ("standard" as const),
  ...fractionDigits(decimals),
});

/**
 * Formats with Intl, falling back to the raw value: a model can send a
 * currency code or locale that Intl rejects by throwing.
 */
const formatted = (
  value: Exclude<DataTableValue, null | undefined>,
  format: () => string,
) => {
  try {
    return format();
  } catch {
    return textValue(value);
  }
};

const numericValue = (value: DataTableValue) =>
  typeof value === "number" && !Number.isNaN(value) ? value : undefined;

const relativeDate = (date: Date, locale: string, relativeTo: number) => {
  const seconds = Math.round((date.getTime() - relativeTo) / 1000);
  const units: readonly [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  const [unit, amount] = units.find(
    ([, size]) => Math.abs(seconds) >= size,
  ) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round(seconds / amount),
    unit,
  );
};

const withUnit = (text: string, unit: string | undefined) =>
  unit === undefined || unit === ""
    ? text
    : /^[%‰°]/.test(unit)
      ? `${text}${unit}`
      : `${text} ${unit}`;

const EmptyValue = () => <span className="text-foreground/35">none</span>;

function Value({
  column,
  row,
  locale,
  relativeTo,
}: {
  column: DataTableColumn;
  row: DataTableRow;
  locale: string;
  relativeTo: number;
}) {
  const value = row[column.key];
  if (isEmpty(value)) return <EmptyValue />;

  const format = column.format ?? { kind: "text" as const };
  if (format.kind === "number") {
    const number = numericValue(value);
    if (number === undefined) return <>{textValue(value)}</>;
    const content = formatted(value, () =>
      new Intl.NumberFormat(
        locale,
        numberOptions(format.decimals, format.compact === true),
      ).format(number),
    );
    return <>{withUnit(content, format.unit)}</>;
  }

  if (format.kind === "currency") {
    const number = numericValue(value);
    if (number === undefined) return <>{textValue(value)}</>;
    return (
      <>
        {formatted(value, () =>
          new Intl.NumberFormat(locale, {
            style: "currency",
            currency: format.currency,
            ...numberOptions(format.decimals, format.compact === true),
          }).format(number),
        )}
      </>
    );
  }

  if (format.kind === "percent") {
    const number = numericValue(value);
    if (number === undefined) return <>{textValue(value)}</>;
    return (
      <>
        {formatted(value, () =>
          new Intl.NumberFormat(locale, {
            style: "percent",
            ...fractionDigits(format.decimals),
          }).format(format.basis === "unit" ? number / 100 : number),
        )}
      </>
    );
  }

  if (format.kind === "delta") {
    const number = numericValue(value);
    if (number === undefined) return <>{textValue(value)}</>;
    const direction = number > 0 ? "↑" : number < 0 ? "↓" : "→";
    const good = number === 0 || number > 0 === (format.upIsGood ?? true);
    const content = formatted(value, () =>
      new Intl.NumberFormat(locale, {
        signDisplay: "never",
        ...fractionDigits(format.decimals),
      }).format(number),
    );
    return (
      <span
        className={cn(
          number === 0
            ? "text-foreground/55"
            : good
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400",
        )}
      >
        {direction} {withUnit(content, format.unit)}
      </span>
    );
  }

  if (format.kind === "date") {
    const date = asDate(value);
    if (!date) return <>{textValue(value)}</>;
    const style = format.style ?? "date";
    const content = formatted(value, () =>
      style === "relative"
        ? relativeDate(date, locale, relativeTo)
        : new Intl.DateTimeFormat(
            locale,
            style === "datetime"
              ? { dateStyle: "medium", timeStyle: "short" }
              : {
                  dateStyle: "medium",
                  ...(typeof value === "string" && DATE_ONLY.test(value)
                    ? { timeZone: "UTC" }
                    : {}),
                },
          ).format(date),
    );
    return <span title={date.toISOString()}>{content}</span>;
  }

  if (format.kind === "boolean") {
    if (typeof value !== "boolean") return <>{textValue(value)}</>;
    return (
      <>{value ? (format.trueLabel ?? "Yes") : (format.falseLabel ?? "No")}</>
    );
  }

  if (format.kind === "link") {
    const hrefValue = format.hrefKey ? row[format.hrefKey] : value;
    const href = safeHref(
      typeof hrefValue === "string" ? hrefValue : undefined,
    );
    if (!href) return <>{textValue(value)}</>;
    const external = /^https?:/.test(href);
    return external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="underline underline-offset-2"
      >
        {textValue(value)}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <a href={href} className="underline underline-offset-2">
        {textValue(value)}
      </a>
    );
  }

  if (format.kind === "badge") {
    const tone = format.tones?.[textValue(value)] ?? "neutral";
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
          tone === "neutral" && cn(field, "text-foreground/60"),
          tone === "success" &&
            "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
          tone === "warning" &&
            "bg-amber-500/12 text-amber-700 dark:text-amber-300",
          tone === "danger" && "bg-red-500/12 text-red-700 dark:text-red-300",
        )}
      >
        {textValue(value)}
      </span>
    );
  }

  if (format.kind === "list" && Array.isArray(value)) {
    const max = Math.max(0, Math.floor(format.max ?? value.length));
    const shown = value.slice(0, max);
    return (
      <span className="flex flex-wrap gap-1">
        {shown.map((item, index) => (
          <span
            key={index}
            className={cn(
              field,
              "text-foreground/60 rounded-md px-1.5 py-0.5 text-xs",
            )}
          >
            {item}
          </span>
        ))}
        {value.length > shown.length ? (
          <span className="text-foreground/45 px-1.5 py-0.5 text-xs">
            +{value.length - shown.length}
          </span>
        ) : null}
      </span>
    );
  }

  return <>{textValue(value)}</>;
}

const isNumeric = (format: DataTableFormat | undefined) =>
  format?.kind === "number" ||
  format?.kind === "currency" ||
  format?.kind === "percent" ||
  format?.kind === "delta";

const compareValues = (
  a: DataTableValue,
  b: DataTableValue,
  column: DataTableColumn,
  collator: Intl.Collator,
) => {
  if (isEmpty(a)) return isEmpty(b) ? 0 : 1;
  if (isEmpty(b)) return -1;
  if (column.format?.kind === "date") {
    const first = asDate(a);
    const second = asDate(b);
    if (first && second) return first.getTime() - second.getTime();
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.length - b.length;
  return collator.compare(textValue(a), textValue(b));
};

const collatorFor = (locale: string) => {
  try {
    return new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  } catch {
    return new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });
  }
};

const rowIdentifier = (
  row: DataTableRow,
  key: string | undefined,
  index: number,
) => {
  const value = key === undefined ? undefined : row[key];
  return value === null || value === undefined ? index : textValue(value);
};

export function DataTable({
  columns,
  rows,
  rowKey,
  caption,
  defaultSort,
  sort,
  onSortChange,
  locale = "en-US",
  emptyMessage = "No rows",
  relativeTo,
  className,
  ...props
}: DataTableProps) {
  const [internalSort, setInternalSort] = useState<DataTableSort | null>(
    defaultSort ?? null,
  );
  const [announcement, setAnnouncement] = useState("");
  const activeSort = sort === undefined ? internalSort : sort;
  const relativeTime = relativeTo ?? Date.now();
  const sortColumn = columns.find((column) => column.key === activeSort?.key);
  const collator = collatorFor(locale);
  const sortedRows =
    activeSort && sortColumn
      ? rows
          .map((row, index) => ({ row, index }))
          .sort((a, b) => {
            const result = compareValues(
              a.row[sortColumn.key],
              b.row[sortColumn.key],
              sortColumn,
              collator,
            );
            if (result === 0) return a.index - b.index;
            if (
              isEmpty(a.row[sortColumn.key]) ||
              isEmpty(b.row[sortColumn.key])
            ) {
              return result;
            }
            return activeSort.direction === "asc" ? result : -result;
          })
          .map(({ row }) => row)
      : rows;
  const primaryColumn =
    columns.find((column) => column.priority === "primary") ?? columns[0];

  const changeSort = (column: DataTableColumn) => {
    const next =
      activeSort?.key !== column.key
        ? { key: column.key, direction: "asc" as const }
        : activeSort.direction === "asc"
          ? { key: column.key, direction: "desc" as const }
          : null;
    if (sort === undefined) setInternalSort(next);
    setAnnouncement(
      next
        ? `Sorted by ${column.label}, ${next.direction === "asc" ? "ascending" : "descending"}`
        : "Sorting cleared",
    );
    onSortChange?.(next);
  };

  const cellClass = (column: DataTableColumn) =>
    cn(
      "text-foreground/80 px-4 py-2.5 align-top text-[13px] leading-5",
      (column.align ?? (isNumeric(column.format) ? "end" : "start")) ===
        "end" && "text-end tabular-nums",
    );

  return (
    <div
      data-slot="data-table"
      className={cn(
        paper,
        "@container w-full overflow-hidden rounded-2xl",
        className,
      )}
      {...props}
    >
      <table className="hidden w-full border-collapse @md:table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="border-foreground/10 border-b">
          <tr>
            {columns.map((column) => {
              const direction =
                activeSort?.key === column.key
                  ? activeSort.direction
                  : undefined;
              const sortable = column.sortable !== false;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    direction === "asc"
                      ? "ascending"
                      : direction === "desc"
                        ? "descending"
                        : "none"
                  }
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    mono,
                    "text-foreground/35 px-4 py-3 font-medium",
                    (column.align ??
                      (isNumeric(column.format) ? "end" : "start")) === "end"
                      ? "text-end"
                      : "text-start",
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => changeSort(column)}
                      aria-label={`Sort by ${column.label}${direction ? `, ${direction}` : ""}`}
                      className="focus-visible:ring-foreground/20 -mx-1 rounded px-1 outline-none focus-visible:ring-1"
                    >
                      {column.label}
                      {direction ? (
                        <span aria-hidden className="ms-1">
                          {direction === "asc" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(columns.length, 1)}
                role="status"
                className="text-foreground/45 px-4 py-6 text-center text-[13px]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => (
              <tr
                key={rowIdentifier(row, rowKey, index)}
                className="hover:bg-foreground/[0.025] transition-colors motion-reduce:transition-none"
              >
                {columns.map((column) => (
                  <td key={column.key} className={cellClass(column)}>
                    <Value
                      column={column}
                      row={row}
                      locale={locale}
                      relativeTo={relativeTime}
                    />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div role="list" className="space-y-2 p-2.5 @md:hidden">
        {sortedRows.length === 0 ? (
          <div
            role="status"
            className="text-foreground/45 px-2 py-3 text-center text-[13px]"
          >
            {emptyMessage}
          </div>
        ) : (
          sortedRows.map((row, index) => (
            <div
              key={rowIdentifier(row, rowKey, index)}
              role="listitem"
              className="bg-foreground/[0.025] hover:bg-foreground/[0.04] rounded-xl px-3 py-2 transition-colors motion-reduce:transition-none"
            >
              {primaryColumn ? (
                <div className="text-foreground/90 text-[13px] leading-5 font-medium">
                  <Value
                    column={primaryColumn}
                    row={row}
                    locale={locale}
                    relativeTo={relativeTime}
                  />
                </div>
              ) : null}
              {columns.length > 1 ? (
                <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] leading-4">
                  {columns
                    .filter((column) => column.key !== primaryColumn?.key)
                    .map((column) => (
                      <div
                        key={column.key}
                        className="flex min-w-0 items-baseline justify-between gap-2"
                      >
                        <dt className="text-foreground/45 truncate">
                          {column.label}
                        </dt>
                        <dd className="text-foreground/75 shrink-0 text-end tabular-nums">
                          <Value
                            column={column}
                            row={row}
                            locale={locale}
                            relativeTo={relativeTime}
                          />
                        </dd>
                      </div>
                    ))}
                </dl>
              ) : null}
            </div>
          ))
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
