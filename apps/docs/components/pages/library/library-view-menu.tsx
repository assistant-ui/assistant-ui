"use client";

import type { ReactNode } from "react";
import { RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "./menu";
import { cn } from "@/lib/utils";
import { iconMenuTrigger } from "./library-item";
import { LibraryTooltip } from "./library-tooltip";

export type LibrarySort = "default" | "name-asc" | "name-desc";
export type LibraryView = "grid" | "list";

const SORTS: readonly { value: LibrarySort; label: string }[] = [
  { value: "default", label: "Recommended" },
  { value: "name-asc", label: "Name, A to Z" },
  { value: "name-desc", label: "Name, Z to A" },
];

const VIEWS: readonly { value: LibraryView; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
];

/** `items` in the picked order; "default" keeps the order they came in. */
export const sortLibraryItems = <T,>(
  items: readonly T[],
  sort: LibrarySort,
  label: (item: T) => string,
): readonly T[] =>
  sort === "default"
    ? items
    : [...items].sort((a, b) =>
        sort === "name-asc"
          ? label(a).localeCompare(label(b))
          : label(b).localeCompare(label(a)),
      );

/**
 * The button beside a library search bar: sort, grid or list, and a reset.
 * A page with filters passes them as `filters` and says when one is on.
 */
export function LibraryViewMenu({
  sort,
  view,
  onSortChange,
  onViewChange,
  onReset,
  filters,
  filtersOn = false,
}: {
  sort: LibrarySort;
  view: LibraryView;
  onSortChange: (sort: LibrarySort) => void;
  onViewChange: (view: LibraryView) => void;
  /** Puts the sort, and any filters, back; the view stays. */
  onReset: () => void;
  filters?: ReactNode;
  filtersOn?: boolean;
}) {
  const changed = filtersOn || sort !== "default";
  const label = filters ? "Filter, sort, and view" : "Sort and view";

  return (
    <Menu>
      <LibraryTooltip label={label}>
        <MenuTrigger
          aria-label={
            changed ? `${label}, ${filters ? "filters" : "sort"} on` : label
          }
          className={cn(iconMenuTrigger, "relative size-9")}
        >
          <SlidersHorizontalIcon aria-hidden />
          {changed ? (
            <span
              aria-hidden
              className="bg-foreground absolute top-1.5 right-1.5 size-1.5 rounded-full"
            />
          ) : null}
        </MenuTrigger>
      </LibraryTooltip>
      <MenuContent align="end">
        {filters ? (
          <>
            <MenuGroup>
              <MenuLabel>Filter</MenuLabel>
              {filters}
            </MenuGroup>
            <MenuSeparator />
          </>
        ) : null}
        <MenuGroup>
          <MenuLabel>Sort</MenuLabel>
          <MenuRadioGroup
            value={sort}
            onValueChange={(value: LibrarySort) => onSortChange(value)}
          >
            {SORTS.map((option) => (
              <MenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
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
        {changed ? (
          <>
            <MenuSeparator />
            <MenuItem onClick={onReset}>
              <RotateCcwIcon aria-hidden />
              {filters ? "Reset filters and sort" : "Reset sort"}
            </MenuItem>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}
