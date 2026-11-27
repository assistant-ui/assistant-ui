"use client";

import { RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import {
  LibraryMenu,
  LibraryMenuCheckboxItem,
  LibraryMenuContent,
  LibraryMenuGroup,
  LibraryMenuItem,
  LibraryMenuLabel,
  LibraryMenuRadioGroup,
  LibraryMenuRadioItem,
  LibraryMenuSeparator,
  LibraryMenuSub,
  LibraryMenuSubTrigger,
  LibraryMenuTrigger,
} from "./library-menu";
import {
  STARTER_BACKENDS,
  STARTER_FRAMEWORKS,
  type StarterBackend,
  type StarterFramework,
} from "@/lib/library/starters-data";
import { LibraryTooltip } from "./library-tooltip";

export type StarterSort = "default" | "name-asc" | "name-desc";
export type StarterView = "grid" | "list";

export type StartersViewOptions = {
  frameworks: readonly StarterFramework[];
  backends: readonly StarterBackend[];
  withScreenshot: boolean;
  sort: StarterSort;
  view: StarterView;
};

export const DEFAULT_VIEW_OPTIONS: StartersViewOptions = {
  frameworks: [],
  backends: [],
  withScreenshot: false,
  sort: "default",
  view: "grid",
};

const SORTS: readonly { value: StarterSort; label: string }[] = [
  { value: "default", label: "Recommended" },
  { value: "name-asc", label: "Name, A to Z" },
  { value: "name-desc", label: "Name, Z to A" },
];

const VIEWS: readonly { value: StarterView; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
];

const toggle = <T,>(list: readonly T[], value: T, on: boolean): T[] =>
  on ? [...list, value] : list.filter((entry) => entry !== value);

function SelectedCount({ count }: { count: number }) {
  return count > 0 ? (
    <span className="text-muted-foreground ms-auto text-xs tabular-nums">
      {count}
    </span>
  ) : null;
}

export function StartersViewMenu({
  options,
  onOptionsChange,
}: {
  options: StartersViewOptions;
  onOptionsChange: (options: StartersViewOptions) => void;
}) {
  const filtered =
    options.frameworks.length > 0 ||
    options.backends.length > 0 ||
    options.withScreenshot ||
    options.sort !== DEFAULT_VIEW_OPTIONS.sort;

  return (
    <LibraryMenu>
      <LibraryTooltip label="Filter, sort, and view">
        <LibraryMenuTrigger
          aria-label={`Filter, sort, and view${filtered ? ", filters on" : ""}`}
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] data-popup-open:bg-foreground/[0.06] data-popup-open:text-foreground relative size-9 shrink-0 rounded-full"
        >
          <SlidersHorizontalIcon aria-hidden />
          {filtered ? (
            <span
              aria-hidden
              className="bg-foreground absolute top-1.5 right-1.5 size-1.5 rounded-full"
            />
          ) : null}
        </LibraryMenuTrigger>
      </LibraryTooltip>
      <LibraryMenuContent align="end">
        <LibraryMenuGroup>
          <LibraryMenuLabel>Filter</LibraryMenuLabel>
          <LibraryMenuSub>
            <LibraryMenuSubTrigger>
              Framework
              <SelectedCount count={options.frameworks.length} />
            </LibraryMenuSubTrigger>
            <LibraryMenuContent side="right" align="start" sideOffset={4}>
              {STARTER_FRAMEWORKS.map((framework) => (
                <LibraryMenuCheckboxItem
                  key={framework}
                  checked={options.frameworks.includes(framework)}
                  onCheckedChange={(checked) =>
                    onOptionsChange({
                      ...options,
                      frameworks: toggle(
                        options.frameworks,
                        framework,
                        checked,
                      ),
                    })
                  }
                >
                  {framework}
                </LibraryMenuCheckboxItem>
              ))}
            </LibraryMenuContent>
          </LibraryMenuSub>
          <LibraryMenuSub>
            <LibraryMenuSubTrigger>
              Backend
              <SelectedCount count={options.backends.length} />
            </LibraryMenuSubTrigger>
            <LibraryMenuContent side="right" align="start" sideOffset={4}>
              {STARTER_BACKENDS.map((backend) => (
                <LibraryMenuCheckboxItem
                  key={backend}
                  checked={options.backends.includes(backend)}
                  onCheckedChange={(checked) =>
                    onOptionsChange({
                      ...options,
                      backends: toggle(options.backends, backend, checked),
                    })
                  }
                >
                  {backend}
                </LibraryMenuCheckboxItem>
              ))}
            </LibraryMenuContent>
          </LibraryMenuSub>
          <LibraryMenuCheckboxItem
            checked={options.withScreenshot}
            onCheckedChange={(withScreenshot) =>
              onOptionsChange({ ...options, withScreenshot })
            }
          >
            Has a screenshot
          </LibraryMenuCheckboxItem>
        </LibraryMenuGroup>
        <LibraryMenuSeparator />
        <LibraryMenuGroup>
          <LibraryMenuLabel>Sort</LibraryMenuLabel>
          <LibraryMenuRadioGroup
            value={options.sort}
            onValueChange={(sort: StarterSort) =>
              onOptionsChange({ ...options, sort })
            }
          >
            {SORTS.map((sort) => (
              <LibraryMenuRadioItem key={sort.value} value={sort.value}>
                {sort.label}
              </LibraryMenuRadioItem>
            ))}
          </LibraryMenuRadioGroup>
        </LibraryMenuGroup>
        <LibraryMenuSeparator />
        <LibraryMenuGroup>
          <LibraryMenuLabel>View</LibraryMenuLabel>
          <LibraryMenuRadioGroup
            value={options.view}
            onValueChange={(view: StarterView) =>
              onOptionsChange({ ...options, view })
            }
          >
            {VIEWS.map((view) => (
              <LibraryMenuRadioItem key={view.value} value={view.value}>
                {view.label}
              </LibraryMenuRadioItem>
            ))}
          </LibraryMenuRadioGroup>
        </LibraryMenuGroup>
        {filtered ? (
          <>
            <LibraryMenuSeparator />
            <LibraryMenuItem
              onClick={() =>
                onOptionsChange({ ...DEFAULT_VIEW_OPTIONS, view: options.view })
              }
            >
              <RotateCcwIcon aria-hidden />
              Reset filters and sort
            </LibraryMenuItem>
          </>
        ) : null}
      </LibraryMenuContent>
    </LibraryMenu>
  );
}
