"use client";

import {
  MenuCheckboxItem,
  MenuSubContent,
  MenuSub,
  MenuSubTrigger,
} from "./menu";
import {
  STARTER_FRAMEWORKS,
  STARTER_INTEGRATIONS,
  STARTER_RUNTIMES,
  type Starter,
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
  /** Only what `create` installs by command. */
  installable: boolean;
  sort: StarterSort;
  view: StarterView;
};

export const DEFAULT_VIEW_OPTIONS: StartersViewOptions = {
  frameworks: [],
  runtimes: [],
  integrations: [],
  withScreenshot: false,
  installable: false,
  sort: "default",
  view: "grid",
};

/** Whether a starter passes the filters picked in the menu. */
export const matchesStarterOptions = (
  starter: Pick<
    Starter,
    | "framework"
    | "runtime"
    | "integrations"
    | "image"
    | "screenshots"
    | "repoOnly"
    | "hosted"
  >,
  options: StartersViewOptions,
): boolean =>
  (!options.installable || (!starter.repoOnly && !starter.hosted)) &&
  (!options.withScreenshot ||
    starter.image !== undefined ||
    starter.screenshots !== undefined) &&
  (options.frameworks.length === 0 ||
    options.frameworks.includes(starter.framework)) &&
  (options.runtimes.length === 0 ||
    (starter.runtime !== undefined &&
      options.runtimes.includes(starter.runtime))) &&
  (options.integrations.length === 0 ||
    (starter.integrations ?? []).some((integration) =>
      options.integrations.includes(integration),
    ));

const STARTER_VIEWS: readonly StarterView[] = ["grid", "list", "table"];

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
    options.withScreenshot ||
    options.installable;

  return (
    <LibraryViewMenu
      sort={options.sort}
      view={options.view}
      views={STARTER_VIEWS}
      onSortChange={(sort) => onOptionsChange({ ...options, sort })}
      onViewChange={(view) => onOptionsChange({ ...options, view })}
      onReset={() =>
        onOptionsChange({ ...DEFAULT_VIEW_OPTIONS, view: options.view })
      }
      filtersOn={filtersOn}
      filters={
        <>
          <MenuSub>
            <MenuSubTrigger>
              <span className="flex flex-1 items-center gap-2">
                Framework
                <SelectedCount count={options.frameworks.length} />
              </span>
            </MenuSubTrigger>
            <MenuSubContent>
              {STARTER_FRAMEWORKS.map((framework) => (
                <MenuCheckboxItem
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
                </MenuCheckboxItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          <MenuSub>
            <MenuSubTrigger>
              <span className="flex flex-1 items-center gap-2">
                Runtime
                <SelectedCount count={options.runtimes.length} />
              </span>
            </MenuSubTrigger>
            <MenuSubContent>
              {STARTER_RUNTIMES.map((runtime) => (
                <MenuCheckboxItem
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
                </MenuCheckboxItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          <MenuSub>
            <MenuSubTrigger>
              <span className="flex flex-1 items-center gap-2">
                Integrations
                <SelectedCount count={options.integrations.length} />
              </span>
            </MenuSubTrigger>
            <MenuSubContent>
              {STARTER_INTEGRATIONS.map((integration) => (
                <MenuCheckboxItem
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
                </MenuCheckboxItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          <MenuCheckboxItem
            checked={options.installable}
            onCheckedChange={(installable) =>
              onOptionsChange({ ...options, installable })
            }
          >
            Installs by command
          </MenuCheckboxItem>
          <MenuCheckboxItem
            checked={options.withScreenshot}
            onCheckedChange={(withScreenshot) =>
              onOptionsChange({ ...options, withScreenshot })
            }
          >
            Has a screenshot
          </MenuCheckboxItem>
        </>
      }
    />
  );
}
