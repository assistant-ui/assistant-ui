"use client";

import type { ReactNode } from "react";
import { ListFilterIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/library/ui/menu";
import { usePanels } from "@/components/library/ui/panels";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import {
  LIBRARY_SHOWS,
  LIBRARY_SORTS,
  useLibrary,
  type LibraryShow,
  type LibrarySort,
} from "./library-context";

const NO_SECTIONS: readonly string[] = [];

/** A row that opens one filter's choices, with the current choice beside it. */
function FilterSub({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <MenuSub>
      <MenuSubTrigger>
        <span className="flex-1">{label}</span>
        <span className="text-muted-foreground ps-4">{value}</span>
      </MenuSubTrigger>
      <MenuSubContent className="min-w-48">{children}</MenuSubContent>
    </MenuSub>
  );
}

function FilterMenu({ sections }: { sections: readonly string[] }) {
  const {
    show,
    setShow,
    sort,
    setSort,
    hiddenSections,
    toggleSection,
    showSections,
    resetFilters,
  } = useLibrary();
  const shown = sections.filter((section) => !hiddenSections.has(section));
  const allSections = shown.length === sections.length;
  const filtering = show !== "all" || sort !== "category" || !allSections;

  return (
    <Menu>
      <MenuTrigger
        aria-pressed={filtering}
        className={cn(
          "size-6 justify-center p-0",
          filtering && "bg-accent [&_svg]:text-foreground",
        )}
        render={<TooltipIconButton tooltip="Filter" />}
      >
        <HugeiconsIcon icon={ListFilterIcon} strokeWidth={1.5} aria-hidden />
      </MenuTrigger>
      <MenuContent align="end" className="min-w-56">
        {sections.length > 1 ? (
          <FilterSub
            label="Sections"
            value={
              allSections ? "All" : `${shown.length} of ${sections.length}`
            }
          >
            {sections.map((section) => (
              <MenuCheckboxItem
                key={section}
                checked={!hiddenSections.has(section)}
                onCheckedChange={() => toggleSection(section)}
              >
                {section}
              </MenuCheckboxItem>
            ))}
            <MenuSeparator />
            <MenuItem
              disabled={allSections}
              closeOnClick={false}
              onClick={() => showSections(sections)}
            >
              Show all
            </MenuItem>
          </FilterSub>
        ) : null}
        <FilterSub
          label="Show"
          value={LIBRARY_SHOWS.find((item) => item.value === show)!.label}
        >
          <MenuRadioGroup
            value={show}
            onValueChange={(next) => setShow(next as LibraryShow)}
          >
            {LIBRARY_SHOWS.map((item) => (
              <MenuRadioItem key={item.value} value={item.value}>
                {item.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </FilterSub>
        <FilterSub
          label="Sort"
          value={LIBRARY_SORTS.find((item) => item.value === sort)!.label}
        >
          <MenuRadioGroup
            value={sort}
            onValueChange={(next) => setSort(next as LibrarySort)}
          >
            {LIBRARY_SORTS.map((item) => (
              <MenuRadioItem key={item.value} value={item.value}>
                {item.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </FilterSub>
        <MenuSeparator />
        <MenuItem disabled={!filtering} onClick={resetFilters}>
          Reset filters
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/**
 * The frame of every library page: a centered column with the page's title
 * and description, and the search and filter on the title's line where the
 * column has room for them.
 */
export function LibraryPage({
  title,
  count,
  description,
  search = true,
  sections = NO_SECTIONS,
  action,
  children,
}: {
  title: string;
  /** Shown after the title. */
  count?: number;
  description: ReactNode;
  /** Off on a page that is not the catalog. */
  search?: boolean;
  /** The sections the filter can turn on and off, on a page that has several. */
  sections?: readonly string[];
  /** A control beside the search, for what the page can make. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const { query, setQuery } = useLibrary();
  const sidebarOpen = usePanels().isOpen("left");

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div
        className={cn(
          "@container flex w-full flex-col gap-6 transition-[max-width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          sidebarOpen ? "max-w-4xl" : "max-w-6xl",
        )}
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 @lg:grid-cols-[minmax(0,1fr)_auto]">
          <h1 className="font-strong text-foreground flex items-baseline gap-2.5 text-xl leading-8 tracking-tight">
            {title}
            {count === undefined ? null : (
              <span className="text-muted-foreground font-mono text-xs">
                {count}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm leading-5 @lg:col-span-2">
            {description}
          </p>
          {search ? (
            <div className="mt-3 flex items-center gap-2 @lg:col-start-2 @lg:row-start-1 @lg:mt-0">
              {action}
              <InputGroup className="h-8 min-w-0 flex-1 @lg:w-64 @lg:flex-none pointer-coarse:h-10">
                <InputGroupAddon>
                  <HugeiconsIcon
                    icon={Search01Icon}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the library"
                  aria-label="Search the library"
                  className="[&::-webkit-search-cancel-button]:hidden"
                />
                <InputGroupAddon align="inline-end">
                  <FilterMenu sections={sections} />
                </InputGroupAddon>
              </InputGroup>
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
