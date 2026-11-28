"use client";

import { Fragment } from "react";
import {
  DownloadIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import {
  TABLE_EXPORTS,
  type TableExportFormat,
  type TableSort,
  type TableSortColumn,
} from "@/lib/library/table-data";
import { LibraryMenuIconButton } from "./library-icon-button";
import {
  TABLE_COLUMNS,
  TABLE_HIDDEN,
  type TableColumnId,
} from "./library-table";
import type { LibraryView } from "./library-view-menu";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from "./menu";

const SORTS: readonly { value: TableSortColumn | "default"; label: string }[] =
  [
    { value: "default", label: "Recommended" },
    { value: "name", label: "Name" },
    { value: "type", label: "Type" },
    { value: "group", label: "Group" },
    { value: "status", label: "Status" },
    { value: "platform", label: "Platform" },
    { value: "needs", label: "Needs" },
    { value: "usedBy", label: "Used by" },
    { value: "updated", label: "Updated" },
  ];

const VIEWS: readonly { value: LibraryView; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "table", label: "Table" },
];

/** One thing the table filters by: its options, each with how many items it would leave, and the ones picked. */
export type TableFilter = {
  id: string;
  label: string;
  options: readonly {
    id: string;
    label: string;
    count: number;
    /** What the option belongs to, named once above the options that share it. */
    heading?: string;
  }[];
  picked: readonly string[];
  onPickedChange: (picked: readonly string[]) => void;
};

function Count({ children }: { children: number | string }) {
  return (
    <span className="text-muted-foreground ms-auto ps-3 text-xs tabular-nums">
      {children}
    </span>
  );
}

/**
 * The button beside the All tab's search: what the table lists, its order,
 * its columns, the view, and an export of what is listed.
 */
export function LibraryTableMenu({
  filters,
  sort,
  onSortChange,
  hidden,
  onHiddenChange,
  view,
  onViewChange,
  count,
  onExport,
  onReset,
}: {
  filters: readonly TableFilter[];
  sort: TableSort | null;
  onSortChange: (sort: TableSort | null) => void;
  hidden: readonly TableColumnId[];
  onHiddenChange: (hidden: readonly TableColumnId[]) => void;
  view: LibraryView;
  onViewChange: (view: LibraryView) => void;
  /** How many items are listed, which is what an export holds. */
  count: number;
  onExport: (format: TableExportFormat) => void;
  /** Puts the filters, the order, and the columns back; the view stays. */
  onReset: () => void;
}) {
  const filtersOn = filters.reduce(
    (sum, filter) => sum + filter.picked.length,
    0,
  );
  const columnsChanged =
    hidden.length !== TABLE_HIDDEN.length ||
    hidden.some((id) => !TABLE_HIDDEN.includes(id));
  const changed = filtersOn > 0 || sort !== null || columnsChanged;
  const table = view === "table";

  return (
    <Menu>
      <LibraryMenuIconButton
        tooltip="Filter, sort, and view"
        aria-label={
          filtersOn > 0
            ? `Filter, sort, and view, ${filtersOn} filters on`
            : "Filter, sort, and view"
        }
        className="relative size-9"
      >
        <SlidersHorizontalIcon aria-hidden />
        {filtersOn > 0 ? (
          <span
            aria-hidden
            className="bg-foreground text-background absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-medium tabular-nums"
          >
            {filtersOn}
          </span>
        ) : changed ? (
          <span
            aria-hidden
            className="bg-foreground absolute top-1.5 right-1.5 size-1.5 rounded-full"
          />
        ) : null}
      </LibraryMenuIconButton>
      <MenuContent align="end">
        <MenuGroup>
          <MenuLabel>Filter</MenuLabel>
          {filters.map((filter) => (
            <MenuSub key={filter.id}>
              <MenuSubTrigger>
                <span className="flex flex-1 items-center gap-2">
                  {filter.label}
                  {filter.picked.length > 0 ? (
                    <Count>{filter.picked.length}</Count>
                  ) : null}
                </span>
              </MenuSubTrigger>
              <MenuSubContent className="max-h-[min(28rem,70svh)] overflow-y-auto">
                {filter.options
                  .filter(
                    (option) =>
                      option.count > 0 || filter.picked.includes(option.id),
                  )
                  .map((option, index, shown) => (
                    <Fragment key={option.id}>
                      {option.heading &&
                      option.heading !== shown[index - 1]?.heading ? (
                        <>
                          {index > 0 ? <MenuSeparator /> : null}
                          <MenuLabel>{option.heading}</MenuLabel>
                        </>
                      ) : null}
                      <MenuCheckboxItem
                        checked={filter.picked.includes(option.id)}
                        onCheckedChange={(on) =>
                          filter.onPickedChange(
                            on
                              ? [...filter.picked, option.id]
                              : filter.picked.filter((id) => id !== option.id),
                          )
                        }
                      >
                        <span className="flex flex-1 items-center gap-2">
                          {option.label}
                          <Count>{option.count}</Count>
                        </span>
                      </MenuCheckboxItem>
                    </Fragment>
                  ))}
              </MenuSubContent>
            </MenuSub>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuSub>
          <MenuSubTrigger>
            <span className="flex flex-1 items-center gap-2">
              Sort
              <Count>
                {SORTS.find(
                  (option) => option.value === (sort?.column ?? "default"),
                )?.label ?? ""}
              </Count>
            </span>
          </MenuSubTrigger>
          <MenuSubContent>
            <MenuRadioGroup
              value={sort?.column ?? "default"}
              onValueChange={(value: TableSortColumn | "default") =>
                onSortChange(
                  value === "default"
                    ? null
                    : { column: value, dir: sort?.dir ?? "asc" },
                )
              }
            >
              {SORTS.map((option) => (
                <MenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuCheckboxItem
              checked={sort?.dir === "desc"}
              disabled={!sort}
              onCheckedChange={(on) => {
                if (sort) onSortChange({ ...sort, dir: on ? "desc" : "asc" });
              }}
            >
              Descending
            </MenuCheckboxItem>
          </MenuSubContent>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger disabled={!table}>
            <span className="flex flex-1 items-center gap-2">
              Columns
              {columnsChanged ? <Count>changed</Count> : null}
            </span>
          </MenuSubTrigger>
          <MenuSubContent>
            <MenuCheckboxItem checked disabled>
              Name
            </MenuCheckboxItem>
            {TABLE_COLUMNS.map((column) => (
              <MenuCheckboxItem
                key={column.id}
                checked={!hidden.includes(column.id)}
                onCheckedChange={(on) =>
                  onHiddenChange(
                    on
                      ? hidden.filter((id) => id !== column.id)
                      : [...hidden, column.id],
                  )
                }
              >
                {column.label}
              </MenuCheckboxItem>
            ))}
          </MenuSubContent>
        </MenuSub>
        <MenuSeparator />
        <MenuGroup>
          <MenuLabel>View</MenuLabel>
          <MenuRadioGroup
            value={view}
            onValueChange={(value: LibraryView) => onViewChange(value)}
          >
            {VIEWS.map((option) => (
              <MenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuSub>
          <MenuSubTrigger disabled={count === 0}>
            <DownloadIcon aria-hidden />
            <span className="flex flex-1 items-center gap-2">
              Export
              <Count>{count}</Count>
            </span>
          </MenuSubTrigger>
          <MenuSubContent>
            {TABLE_EXPORTS.map((entry) => (
              <MenuItem
                key={entry.format}
                onClick={() => onExport(entry.format)}
              >
                {entry.label}
              </MenuItem>
            ))}
          </MenuSubContent>
        </MenuSub>
        {changed ? (
          <>
            <MenuSeparator />
            <MenuItem onClick={onReset}>
              <RotateCcwIcon aria-hidden />
              Reset filters, sort, and columns
            </MenuItem>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}
