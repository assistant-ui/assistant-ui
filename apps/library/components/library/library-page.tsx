"use client";

import type { ReactNode } from "react";
import { ListFilterIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
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

function FilterMenu() {
  const { show, setShow, sort, setSort } = useLibrary();
  const filtering = show !== "all" || sort !== "category";

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
      <MenuContent align="end" className="min-w-52">
        <MenuGroup>
          <MenuLabel>Show</MenuLabel>
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
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuLabel>Sort</MenuLabel>
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
        </MenuGroup>
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
  children,
}: {
  title: string;
  /** Shown after the title. */
  count?: number;
  description: ReactNode;
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
          <div className="mt-3 @lg:col-start-2 @lg:row-start-1 @lg:mt-0">
            <InputGroup className="h-8 @lg:w-64 pointer-coarse:h-10">
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
                <FilterMenu />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
