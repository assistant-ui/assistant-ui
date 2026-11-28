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
import {
  LIBRARY_STATUSES_IN_USE,
  LIBRARY_STATUS_LABEL,
  type LibraryStatus,
} from "@/lib/library/status-data";
import { FilterIcon } from "./filter-icons";
import { LibraryStatusDot } from "./library-status";
import {
  LibraryViewMenu,
  type LibrarySort,
  type LibraryView,
} from "./library-view-menu";

export type StarterSort = LibrarySort;
export type StarterView = LibraryView;

/** What a starter's card shows: its recording, else its screenshots, else its drawing. */
export const STARTER_MEDIA = ["video", "screenshots", "drawing"] as const;
export type StarterMedia = (typeof STARTER_MEDIA)[number];

const STARTER_MEDIA_LABEL: Record<StarterMedia, string> = {
  video: "Video",
  screenshots: "Screenshots only",
  drawing: "Drawing only",
};

const starterMedia = ({
  recording,
  screenshots,
  image,
}: Pick<Starter, "recording" | "screenshots" | "image">): StarterMedia =>
  recording ? "video" : screenshots || image ? "screenshots" : "drawing";

export type StartersViewOptions = {
  frameworks: readonly StarterFramework[];
  runtimes: readonly StarterRuntime[];
  integrations: readonly StarterIntegration[];
  statuses: readonly LibraryStatus[];
  media: readonly StarterMedia[];
  /** Only what `create` installs by command. */
  installable: boolean;
  sort: StarterSort;
  view: StarterView;
};

export const DEFAULT_VIEW_OPTIONS: StartersViewOptions = {
  frameworks: [],
  runtimes: [],
  integrations: [],
  statuses: [],
  media: [],
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
    | "recording"
    | "repoOnly"
    | "hosted"
  >,
  options: StartersViewOptions,
  status: LibraryStatus,
): boolean =>
  (options.statuses.length === 0 || options.statuses.includes(status)) &&
  (!options.installable || (!starter.repoOnly && !starter.hosted)) &&
  (options.media.length === 0 ||
    options.media.includes(starterMedia(starter))) &&
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
    options.statuses.length > 0 ||
    options.media.length > 0 ||
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
          <MenuSub>
            <MenuSubTrigger>
              <span className="flex flex-1 items-center gap-2">
                Status
                <SelectedCount count={options.statuses.length} />
              </span>
            </MenuSubTrigger>
            <MenuSubContent>
              {LIBRARY_STATUSES_IN_USE.map((status) => (
                <MenuCheckboxItem
                  key={status}
                  checked={options.statuses.includes(status)}
                  onCheckedChange={(checked) =>
                    onOptionsChange({
                      ...options,
                      statuses: toggle(options.statuses, status, checked),
                    })
                  }
                >
                  <LibraryStatusDot status={status} />
                  {LIBRARY_STATUS_LABEL[status]}
                </MenuCheckboxItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          <MenuSub>
            <MenuSubTrigger>
              <span className="flex flex-1 items-center gap-2">
                Media
                <SelectedCount count={options.media.length} />
              </span>
            </MenuSubTrigger>
            <MenuSubContent>
              {STARTER_MEDIA.map((media) => (
                <MenuCheckboxItem
                  key={media}
                  checked={options.media.includes(media)}
                  onCheckedChange={(checked) =>
                    onOptionsChange({
                      ...options,
                      media: toggle(options.media, media, checked),
                    })
                  }
                >
                  {STARTER_MEDIA_LABEL[media]}
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
        </>
      }
    />
  );
}
