"use client";

import {
  LibraryMenuCheckboxItem,
  LibraryMenuContent,
  LibraryMenuSub,
  LibraryMenuSubTrigger,
} from "./library-menu";
import {
  STARTER_FRAMEWORKS,
  STARTER_INTEGRATIONS,
  STARTER_RUNTIMES,
  type StarterFramework,
  type StarterIntegration,
  type StarterRuntime,
} from "@/lib/library/starters-data";
import { FilterIcon } from "./filter-icons";
import {
  LibraryViewMenu,
  type LibrarySort,
  type LibraryView,
} from "./library-view-menu";

export type StarterSort = LibrarySort;
export type StarterView = LibraryView;

export type StartersViewOptions = {
  frameworks: readonly StarterFramework[];
  runtimes: readonly StarterRuntime[];
  integrations: readonly StarterIntegration[];
  withScreenshot: boolean;
  sort: StarterSort;
  view: StarterView;
};

export const DEFAULT_VIEW_OPTIONS: StartersViewOptions = {
  frameworks: [],
  runtimes: [],
  integrations: [],
  withScreenshot: false,
  sort: "default",
  view: "grid",
};

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
  const filtersOn =
    options.frameworks.length > 0 ||
    options.runtimes.length > 0 ||
    options.integrations.length > 0 ||
    options.withScreenshot;

  return (
    <LibraryViewMenu
      sort={options.sort}
      view={options.view}
      onSortChange={(sort) => onOptionsChange({ ...options, sort })}
      onViewChange={(view) => onOptionsChange({ ...options, view })}
      onReset={() =>
        onOptionsChange({ ...DEFAULT_VIEW_OPTIONS, view: options.view })
      }
      filtersOn={filtersOn}
      filters={
        <>
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
                  <FilterIcon name={framework} />
                  {framework}
                </LibraryMenuCheckboxItem>
              ))}
            </LibraryMenuContent>
          </LibraryMenuSub>
          <LibraryMenuSub>
            <LibraryMenuSubTrigger>
              Runtime
              <SelectedCount count={options.runtimes.length} />
            </LibraryMenuSubTrigger>
            <LibraryMenuContent side="right" align="start" sideOffset={4}>
              {STARTER_RUNTIMES.map((runtime) => (
                <LibraryMenuCheckboxItem
                  key={runtime}
                  checked={options.runtimes.includes(runtime)}
                  onCheckedChange={(checked) =>
                    onOptionsChange({
                      ...options,
                      runtimes: toggle(options.runtimes, runtime, checked),
                    })
                  }
                >
                  <FilterIcon name={runtime} />
                  {runtime}
                </LibraryMenuCheckboxItem>
              ))}
            </LibraryMenuContent>
          </LibraryMenuSub>
          <LibraryMenuSub>
            <LibraryMenuSubTrigger>
              Integrations
              <SelectedCount count={options.integrations.length} />
            </LibraryMenuSubTrigger>
            <LibraryMenuContent side="right" align="start" sideOffset={4}>
              {STARTER_INTEGRATIONS.map((integration) => (
                <LibraryMenuCheckboxItem
                  key={integration}
                  checked={options.integrations.includes(integration)}
                  onCheckedChange={(checked) =>
                    onOptionsChange({
                      ...options,
                      integrations: toggle(
                        options.integrations,
                        integration,
                        checked,
                      ),
                    })
                  }
                >
                  <FilterIcon name={integration} />
                  {integration}
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
        </>
      }
    />
  );
}
