"use client";

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import {
  entryKey,
  entryName,
  LIBRARY_HOME_SKILLS,
  LIBRARY_SECTIONS,
  matchesEntry,
  libraryTotal,
  sectionCount,
  type LibraryEntry,
  type LibrarySectionId,
  type StarterEntry,
} from "@/lib/library/library-data";
import { LIBRARY_SKILLS, type LibrarySkill } from "@/lib/library/skills-data";
import {
  PRESET_STACK,
  presetId,
  type LibraryPreset,
} from "@/lib/library/presets-data";
import { libraryStatus } from "@/lib/library/status-data";
import {
  LIBRARY_AVAILABILITY,
  LIBRARY_PLATFORMS,
  libraryFact,
  type LibraryAvailability,
  type LibraryPlatform,
} from "@/lib/library/facts";
import {
  entryFactId,
  libraryItem,
  libraryTableRecord,
  sortTableItems,
  type LibraryTableItem,
  type TableSort,
} from "@/lib/library/table-data";
import { starterId, type Starter } from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import { GlyphLibrary, LibraryGlyph } from "./library-glyphs";
import { LibraryDock } from "./library-dock";
import { LibraryHero } from "./library-hero";
import {
  LibraryItemSheet,
  libraryDetails,
  type LibraryDetails,
} from "./library-item-sheet";
import { LibraryEmpty } from "./library-empty";
import { BlockCard, LinkRow, SectionTile } from "./library-entry";
import {
  LibraryTable,
  TABLE_HIDDEN,
  downloadTableRecords,
  type TableColumnId,
} from "./library-table";
import { LibraryTableMenu, type TableFilter } from "./library-table-menu";
import {
  LibraryViewMenu,
  sortLibraryItems,
  type LibrarySort,
  type LibraryView,
} from "./library-view-menu";
import {
  MenuCheckboxItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from "./menu";
import { LibrarySidebar, useLibraryLayout } from "./library-sidebar";
import { LibraryAppearancePanel } from "./library-theme";
import { PillTabs, type PillTab } from "./pill-tabs";
import { PresetCard, PresetRow } from "./preset-card";
import { LibrarySavedButton } from "./saved-sheet";
import { SearchBar } from "./search-bar";
import { SkillCard, SkillRow } from "./skill-card";
import { SkillSheet } from "./skill-sheet";
import { StarterCard, StarterRow } from "./starter-card";
import { StarterSheet } from "./starter-sheet";
import { StarterTable } from "./starter-table";
import {
  DEFAULT_VIEW_OPTIONS,
  StartersViewMenu,
  matchesStarterOptions,
} from "./starters-view-menu";

type LibraryTab = "all" | LibrarySectionId;

/** What one tab's menu has picked: which groups to show, which traits an item must have, and the order. */
type TabFilter = {
  groups: readonly string[];
  traits: readonly string[];
  sort: LibrarySort;
};

const NO_FILTER: TabFilter = { groups: [], traits: [], sort: "default" };

/** The All tab's table sort as the order a grid's groups can take. */
const groupSort = (sort: TableSort | null): LibrarySort =>
  sort?.column !== "name"
    ? "default"
    : sort.dir === "asc"
      ? "name-asc"
      : "name-desc";

const toggle = (list: readonly string[], value: string, on: boolean) =>
  on ? [...list, value] : list.filter((entry) => entry !== value);

const LAYOUT = {
  cards: "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3",
  rows: "flex flex-col gap-1",
  pairs: "grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-1 lg:grid-cols-2",
  tiles: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  links:
    "grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-1 sm:grid-cols-2 lg:grid-cols-3",
};

const subscribeToAddress = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
};

const readHash = () => window.location.hash.slice(1);

/** The open tab, kept in the address after the `#` so a tab can be linked to and Back returns to the last one. */
function useLibraryTab() {
  const hash = useSyncExternalStore(subscribeToAddress, readHash, () => "");
  const tab: LibraryTab =
    LIBRARY_SECTIONS.find((section) => section.id === hash)?.id ?? "all";
  const setTab = (next: LibraryTab) => {
    if (next === tab) return;
    const { pathname, search } = window.location;
    window.history.pushState(
      null,
      "",
      next === "all" ? `${pathname}${search}` : `#${next}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return [tab, setTab] as const;
}

export function LibraryBrowser() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useLibraryTab();
  const [layout, setLayout] = useLibraryLayout();
  const sidebar = layout === "sidebar";
  const contentRef = useRef<HTMLDivElement>(null);
  // In sidebar mode the items scroll in their own box, which a new tab starts at the top of.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [tab]);
  const [filters, setFilters] = useState<
    Partial<Record<LibrarySectionId, TabFilter>>
  >({});
  const [starterOptions, setStarterOptions] = useState(DEFAULT_VIEW_OPTIONS);
  const [skillView, setSkillView] = useState<LibraryView>("list");
  const [allView, setAllView] = useState<LibraryView>("grid");
  const [allTypes, setAllTypes] = useState<readonly string[]>([]);
  const [allGroups, setAllGroups] = useState<readonly string[]>([]);
  const [allSort, setAllSort] = useState<TableSort | null>(null);
  const [allPlatforms, setAllPlatforms] = useState<readonly LibraryPlatform[]>(
    [],
  );
  const [allStatuses, setAllStatuses] = useState<
    readonly LibraryAvailability[]
  >([]);
  const [allHidden, setAllHidden] =
    useState<readonly TableColumnId[]>(TABLE_HIDDEN);
  const [sheet, setSheet] = useState<StarterEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = (entry: StarterEntry) => {
    setSheet(entry);
    setSheetOpen(true);
  };
  const [skill, setSkill] = useState<LibrarySkill | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const openSkill = (next: LibrarySkill) => {
    setSkill(next);
    setSkillOpen(true);
  };
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [details, setDetails] = useState<LibraryDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = (next: LibraryDetails) => {
    setDetails(next);
    setDetailsOpen(true);
  };
  // Opens any library item in the drawer its kind uses, closing the one that asked.
  const openItem = (factId: string) => {
    const entry = libraryItem(factId)?.entry;
    if (!entry) return;
    setSheetOpen(false);
    setSkillOpen(false);
    setDetailsOpen(false);
    switch (entry.kind) {
      case "starter":
      case "preset":
        openSheet(entry);
        break;
      case "skill":
        setSkill(entry.skill);
        setSkillOpen(true);
        break;
      default: {
        const next = libraryDetails(entry);
        if (next) openDetails(next);
        else if (entry.kind === "link") window.location.assign(entry.link.href);
      }
    }
  };
  const normalized = useDeferredValue(query).trim().toLowerCase();

  const all = LIBRARY_SECTIONS;
  const current = all.find((section) => section.id === tab);
  // Under All, every item in one table, or a tile per type that turns into results on a search.
  const allTable = !current && allView === "table";
  const home = !current && !normalized && !allTable;
  const GroupLabel = current ? "h2" : "p";
  const groupLabel = "flex items-baseline gap-2 text-sm font-medium";

  const filter = (current && filters[current.id]) ?? NO_FILTER;
  const setFilter = (next: TabFilter) => {
    if (current) setFilters({ ...filters, [current.id]: next });
  };
  const onStarters = current?.id === "starters";
  const sort = onStarters
    ? starterOptions.sort
    : current
      ? filter.sort
      : groupSort(allSort);
  const starterRows = onStarters && starterOptions.view === "list";
  const starterTable = onStarters && starterOptions.view === "table";
  const openStarter = (starter: Starter) =>
    openSheet({ kind: "starter", starter });
  const openPreset = (preset: LibraryPreset) =>
    openSheet({ kind: "preset", preset });
  const skillTiles = current?.id === "skills" && skillView === "grid";

  // Whether an item passes the All tab's filters; `skip` leaves one out, to count what picking in it would give.
  const allPass = (
    sectionId: string,
    group: string,
    entry: LibraryEntry,
    skip?: "type" | "group" | "platform" | "status",
  ) => {
    if (
      skip !== "group" &&
      allGroups.length > 0 &&
      !allGroups.includes(`${sectionId}/${group}`)
    ) {
      return false;
    }
    if (
      skip !== "type" &&
      allTypes.length > 0 &&
      !allTypes.includes(sectionId)
    ) {
      return false;
    }
    if (allPlatforms.length === 0 && allStatuses.length === 0) return true;
    const fact = libraryFact(entryFactId(entry));
    if (
      skip !== "platform" &&
      allPlatforms.length > 0 &&
      !allPlatforms.some((platform) => fact?.platforms.includes(platform))
    ) {
      return false;
    }
    return (
      skip === "status" ||
      allStatuses.length === 0 ||
      (fact !== undefined && allStatuses.includes(fact.status))
    );
  };

  const listed = all.filter((section) =>
    current
      ? section === current
      : allTypes.length === 0 || allTypes.includes(section.id),
  );

  const sections = listed
    .map((section) => {
      const matched = section.groups
        .filter(
          (group) =>
            !current ||
            filter.groups.length === 0 ||
            filter.groups.includes(group.label),
        )
        .map((group) => ({
          label: group.label,
          entries: sortLibraryItems(
            group.entries.filter(
              (entry) =>
                (!normalized || matchesEntry(entry, normalized)) &&
                (current !== undefined ||
                  allPass(section.id, group.label, entry, "type")) &&
                (!current ||
                  filter.traits.every(
                    (trait) =>
                      entry.kind === "link" &&
                      entry.link.traits?.includes(trait),
                  )) &&
                (!onStarters ||
                  (entry.kind === "starter"
                    ? matchesStarterOptions(
                        entry.starter,
                        starterOptions,
                        libraryStatus(starterId(entry.starter)).status,
                      )
                    : entry.kind !== "preset" ||
                      matchesStarterOptions(
                        PRESET_STACK,
                        starterOptions,
                        libraryStatus(presetId(entry.preset)).status,
                      ))),
            ),
            sort,
            entryName,
          ),
        }))
        .filter((group) => group.entries.length > 0);
      return {
        section,
        count: matched.reduce(
          (total, group) => total + group.entries.length,
          0,
        ),
        groups: matched,
      };
    })
    .filter(({ count }) => count > 0);

  const resultCount = sections.reduce((sum, { count }) => sum + count, 0);
  const total = current ? sectionCount(current) : libraryTotal(all);

  // One sort runs through the whole table, not through each group.
  const tableItems: readonly LibraryTableItem[] = allTable
    ? sortTableItems(
        sections.flatMap(({ section, groups }) =>
          groups.flatMap((group) =>
            group.entries.map((entry) => ({
              section,
              group: group.label,
              entry,
            })),
          ),
        ),
        allSort,
      )
    : [];

  const shown = allTable
    ? tableItems.map((item) => item.entry)
    : sections.flatMap(({ groups }) =>
        groups.flatMap((group) => group.entries),
      );
  // The items on screen that open the shared drawer, which its arrows step through.
  const detailItems = shown.flatMap((entry) => {
    const item = libraryDetails(entry);
    return item ? [item] : [];
  });
  const shownSkills = shown.flatMap((entry) =>
    entry.kind === "skill" ? [entry.skill] : [],
  );

  // The starters and presets on screen, in the order shown, which the drawer's arrows step through.
  const sheetEntries = (
    starterTable ? sortLibraryItems(shown, sort, entryName) : shown
  ).filter(
    (entry): entry is StarterEntry =>
      entry.kind === "starter" || entry.kind === "preset",
  );

  // While a search is on, each tab says how many of its items match.
  const matches = (section: (typeof all)[number]) =>
    section === current
      ? resultCount
      : section.groups.reduce(
          (total, group) =>
            total +
            group.entries.filter((entry) => matchesEntry(entry, normalized))
              .length,
          0,
        );
  const sectionTabs = all.map((section) => ({
    id: section.id,
    label: section.title,
    ...(normalized && { count: matches(section) }),
  }));
  const tabs: readonly PillTab<LibraryTab>[] = [
    {
      id: "all",
      label: "All",
      ...(normalized && {
        count: sectionTabs.reduce((total, { count = 0 }) => total + count, 0),
      }),
    },
    ...sectionTabs,
  ];

  const layoutOf = (entry: LibraryEntry | undefined) => {
    switch (entry?.kind) {
      case "block":
        return LAYOUT.cards;
      case "starter":
      case "preset":
        return starterRows ? LAYOUT.rows : LAYOUT.cards;
      case "skill":
        return skillTiles ? LAYOUT.tiles : LAYOUT.pairs;
      default:
        // Rows that lead with a mark are laid out like the skills.
        return entry?.kind === "link" && entry.link.mark
          ? LAYOUT.pairs
          : LAYOUT.links;
    }
  };

  const renderEntry = (entry: LibraryEntry) => {
    switch (entry.kind) {
      case "block":
        return (
          <BlockCard
            key={entryKey(entry)}
            block={entry.block}
            onDetails={openDetails}
          />
        );
      case "starter": {
        const Item = starterRows ? StarterRow : StarterCard;
        return (
          <Item
            key={entryKey(entry)}
            starter={entry.starter}
            onSelect={openStarter}
          />
        );
      }
      case "preset": {
        const Item = starterRows ? PresetRow : PresetCard;
        return (
          <Item
            key={entryKey(entry)}
            preset={entry.preset}
            onSelect={openPreset}
          />
        );
      }
      case "skill": {
        const Item = skillTiles ? SkillCard : SkillRow;
        return (
          <Item
            key={entryKey(entry)}
            skill={entry.skill}
            onSelect={() => openSkill(entry.skill)}
          />
        );
      }
      case "link":
        return (
          <LinkRow
            key={entryKey(entry)}
            link={entry.link}
            onDetails={openDetails}
          />
        );
    }
  };

  const groupItems =
    current && current.groups.length > 1
      ? current.groups.map((group) => (
          <MenuCheckboxItem
            key={group.label}
            checked={filter.groups.includes(group.label)}
            onCheckedChange={(checked) =>
              setFilter({
                ...filter,
                groups: toggle(filter.groups, group.label, checked),
              })
            }
          >
            {group.label}
          </MenuCheckboxItem>
        ))
      : null;
  const traitItems =
    current?.traits?.map((trait) => (
      <MenuCheckboxItem
        key={trait.id}
        checked={filter.traits.includes(trait.id)}
        onCheckedChange={(checked) =>
          setFilter({
            ...filter,
            traits: toggle(filter.traits, trait.id, checked),
          })
        }
      >
        {trait.label}
      </MenuCheckboxItem>
    )) ?? null;

  // Under All, every item a search leaves, for counting what each filter option would list.
  const searched = current
    ? []
    : all.flatMap((section) =>
        section.groups.flatMap((group) =>
          group.entries
            .filter((entry) => !normalized || matchesEntry(entry, normalized))
            .map((entry) => ({
              sectionId: section.id,
              group: group.label,
              entry,
              fact: libraryFact(entryFactId(entry)),
            })),
        ),
      );
  const countOf = (
    skip: "type" | "group" | "platform" | "status",
    has: (row: (typeof searched)[number]) => boolean,
  ) =>
    searched.filter(
      (row) => allPass(row.sectionId, row.group, row.entry, skip) && has(row),
    ).length;
  const allFilters: readonly TableFilter[] = [
    {
      id: "type",
      label: "Type",
      options: all.map((section) => ({
        id: section.id,
        label: section.type,
        count: countOf("type", (row) => row.sectionId === section.id),
      })),
      picked: allTypes,
      onPickedChange: setAllTypes,
    },
    {
      id: "group",
      label: "Group",
      // A type with one group has nothing to pick between.
      options: all
        .filter((section) => section.groups.length > 1)
        .flatMap((section) =>
          section.groups.map((group) => ({
            id: `${section.id}/${group.label}`,
            label: group.label,
            heading: section.title,
            count: countOf(
              "group",
              (row) =>
                row.sectionId === section.id && row.group === group.label,
            ),
          })),
        ),
      picked: allGroups,
      onPickedChange: setAllGroups,
    },
    {
      id: "platform",
      label: "Platform",
      options: LIBRARY_PLATFORMS.map((platform) => ({
        id: platform,
        label: platform,
        count: countOf(
          "platform",
          (row) => row.fact?.platforms.includes(platform) ?? false,
        ),
      })),
      picked: allPlatforms,
      onPickedChange: (picked) =>
        setAllPlatforms(picked as readonly LibraryPlatform[]),
    },
    {
      id: "status",
      label: "Status",
      options: LIBRARY_AVAILABILITY.map((status) => ({
        id: status,
        label: status,
        count: countOf("status", (row) => row.fact?.status === status),
      })),
      picked: allStatuses,
      onPickedChange: (picked) =>
        setAllStatuses(picked as readonly LibraryAvailability[]),
    },
  ];
  const allFiltersOn = allFilters.some((entry) => entry.picked.length > 0);
  const clearAllFilters = () => {
    setAllTypes([]);
    setAllGroups([]);
    setAllPlatforms([]);
    setAllStatuses([]);
  };

  const menu = !current ? (
    <LibraryTableMenu
      filters={allFilters}
      sort={allSort}
      onSortChange={setAllSort}
      hidden={allHidden}
      onHiddenChange={setAllHidden}
      view={allView}
      onViewChange={setAllView}
      count={tableItems.length}
      onExport={(format) =>
        downloadTableRecords(format, tableItems.map(libraryTableRecord))
      }
      onReset={() => {
        clearAllFilters();
        setAllSort(null);
        setAllHidden(TABLE_HIDDEN);
      }}
    />
  ) : onStarters ? (
    <StartersViewMenu
      options={starterOptions}
      onOptionsChange={setStarterOptions}
    />
  ) : (
    <LibraryViewMenu
      sort={filter.sort}
      onSortChange={(next) => setFilter({ ...filter, sort: next })}
      onReset={() => setFilter(NO_FILTER)}
      {...(current.id === "skills" && {
        view: skillView,
        onViewChange: setSkillView,
      })}
      {...((groupItems || traitItems) && {
        filtersOn: filter.groups.length > 0 || filter.traits.length > 0,
        filters: traitItems ? (
          <>
            <MenuSub>
              <MenuSubTrigger>
                <span className="flex flex-1 items-center gap-2">
                  Group
                  {filter.groups.length > 0 ? (
                    <span className="text-muted-foreground ms-auto text-xs tabular-nums">
                      {filter.groups.length}
                    </span>
                  ) : null}
                </span>
              </MenuSubTrigger>
              <MenuSubContent>{groupItems}</MenuSubContent>
            </MenuSub>
            {traitItems}
          </>
        ) : (
          groupItems
        ),
      })}
    />
  );

  const filtered =
    (!current && allFiltersOn) ||
    filter.groups.length > 0 ||
    filter.traits.length > 0 ||
    (onStarters &&
      (starterOptions.frameworks.length > 0 ||
        starterOptions.runtimes.length > 0 ||
        starterOptions.integrations.length > 0 ||
        starterOptions.statuses.length > 0 ||
        starterOptions.media.length > 0 ||
        starterOptions.installable));

  // The sidebar always says how many items a type holds; a search narrows that to the matches.
  const sidebarItems = tabs.map((entry) => {
    const section = all.find((item) => item.id === entry.id);
    return {
      id: entry.id,
      label: entry.label,
      count:
        entry.count ?? (section ? sectionCount(section) : libraryTotal(all)),
      glyph: section ? <LibraryGlyph id={section.id} /> : <GlyphLibrary />,
    };
  });

  return (
    <div
      {...(sidebar && { "data-library-shell": "" })}
      className={cn(
        // In sidebar mode the library fills the frame its layout holds to one
        // screen, and the sidebar and the items each scroll inside it.
        sidebar &&
          "lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-10",
      )}
    >
      {sidebar ? (
        <LibrarySidebar
          items={sidebarItems}
          value={tab}
          onValueChange={setTab}
          className="hidden lg:block"
        />
      ) : null}
      <div
        ref={contentRef}
        className={cn(
          "min-w-0",
          sidebar &&
            "lg:-mx-2 lg:h-full lg:min-h-0 lg:[scrollbar-width:thin] lg:overflow-y-auto lg:px-2 lg:pb-10",
        )}
      >
        <LibraryHero
          section={current}
          aside={
            <>
              <SearchBar
                value={query}
                onValueChange={setQuery}
                label={
                  current ? `Search ${current.noun}` : "Search the library"
                }
                count={
                  resultCount === total
                    ? `${total}`
                    : `${resultCount} of ${total}`
                }
                className="min-w-0 flex-1 sm:w-72 sm:flex-none"
              />
              {menu}
              <LibrarySavedButton />
            </>
          }
        />
        <PillTabs
          tabs={tabs}
          value={tab}
          onValueChange={setTab}
          label="Show library items"
          className={cn("mb-8", sidebar && "lg:hidden")}
        />
        <StarterSheet
          entry={sheet}
          entries={sheetEntries}
          onEntryChange={setSheet}
          onComponent={(link) => {
            const item = libraryDetails({ kind: "link", link });
            if (!item) return;
            setSheetOpen(false);
            setTab("components");
            openDetails(item);
          }}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
        <SkillSheet
          skill={skill}
          skills={shownSkills}
          onSkillChange={setSkill}
          open={skillOpen}
          onOpenChange={setSkillOpen}
        />
        <LibraryDock
          title={current ? current.title : "the library"}
          skills={(current?.skills ?? LIBRARY_HOME_SKILLS).flatMap((name) => {
            const found = LIBRARY_SKILLS.find((entry) => entry.name === name);
            return found ? [found] : [];
          })}
          onSkill={openSkill}
          onAppearance={() => setAppearanceOpen(true)}
        />
        <LibraryAppearancePanel
          open={appearanceOpen}
          onOpenChange={setAppearanceOpen}
          layout={layout}
          onLayoutChange={setLayout}
        />
        <LibraryItemSheet
          item={details}
          items={detailItems}
          onItemChange={setDetails}
          onGo={openItem}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
        <p role="status" className="sr-only">
          {normalized ? `${resultCount} items found` : ""}
        </p>
        {home ? (
          <ul
            aria-label="Kinds of library item"
            className="grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            {listed.map((section) => (
              <SectionTile
                key={section.id}
                id={section.id}
                title={section.title}
                description={section.description}
                count={sectionCount(section)}
                onSelect={() => setTab(section.id)}
              />
            ))}
          </ul>
        ) : sections.length === 0 ? (
          <LibraryEmpty
            title={
              !current
                ? query.trim()
                  ? `Nothing in the library matches “${query.trim()}”`
                  : "Nothing in the library matches these filters"
                : query.trim()
                  ? `No ${current.noun} match “${query.trim()}”`
                  : `No ${current.noun} match these filters`
            }
            description={
              !current
                ? query.trim()
                  ? "Try a different word, like a component or a framework."
                  : "Turn a filter off to see more."
                : query.trim()
                  ? "Try a different word, or search the whole library under All."
                  : "Turn a filter off to see more."
            }
            action={{
              label: !filtered
                ? "Clear search"
                : query.trim()
                  ? "Clear search and filters"
                  : "Clear filters",
              onClick: () => {
                setQuery("");
                setFilter({ ...filter, groups: [], traits: [] });
                if (!current) clearAllFilters();
                if (onStarters) {
                  setStarterOptions({
                    ...DEFAULT_VIEW_OPTIONS,
                    sort: starterOptions.sort,
                    view: starterOptions.view,
                  });
                }
              },
            }}
            className="mb-12"
          />
        ) : allTable ? (
          <div className="pb-6">
            {allFiltersOn ? (
              <ul
                aria-label="Filters on"
                className="mb-3 flex flex-wrap items-center gap-1.5"
              >
                {allFilters.flatMap((entry) =>
                  entry.picked.map((id) => {
                    const label =
                      entry.options.find((option) => option.id === id)?.label ??
                      id;
                    return (
                      <li key={`${entry.id}:${id}`}>
                        <button
                          type="button"
                          aria-label={`Remove the ${label} filter`}
                          onClick={() =>
                            entry.onPickedChange(
                              entry.picked.filter((picked) => picked !== id),
                            )
                          }
                          className="bg-foreground/[0.06] hover:bg-foreground/[0.1] focus-visible:ring-ring flex h-7 cursor-pointer items-center gap-1.5 rounded-(--library-control) ps-2.5 pe-2 text-xs transition-colors outline-none focus-visible:ring-2"
                        >
                          <span className="text-muted-foreground">
                            {entry.label}
                          </span>
                          {label}
                          <XIcon
                            aria-hidden
                            className="text-muted-foreground size-3"
                          />
                        </button>
                      </li>
                    );
                  }),
                )}
                <li>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring h-7 cursor-pointer rounded-(--library-control) px-2 text-xs transition-colors outline-none focus-visible:ring-2"
                  >
                    Clear
                  </button>
                </li>
              </ul>
            ) : null}
            <LibraryTable
              items={tableItems}
              total={total}
              resetKey={`${normalized}|${allTypes.join()}|${allGroups.join()}|${allPlatforms.join()}|${allStatuses.join()}|${allSort?.column}|${allSort?.dir}`}
              sort={allSort}
              onSortChange={setAllSort}
              hidden={allHidden}
              onStarter={openStarter}
              onPreset={openPreset}
              onSkill={openSkill}
              onDetails={openDetails}
            />
          </div>
        ) : (
          <div className="flex flex-col">
            {sections.map(({ section, count, groups }, index) => (
              <section
                key={section.id}
                aria-label={section.title}
                className={index > 0 ? "border-t py-12" : "pb-12"}
              >
                {current ? null : (
                  <h2 className="mb-4 flex items-baseline gap-2 text-sm font-medium">
                    <Link
                      href={section.href}
                      className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:underline"
                    >
                      {section.title}
                    </Link>
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {count}
                    </span>
                  </h2>
                )}
                {starterTable ? (
                  <div className="flex flex-col gap-2">
                    <GroupLabel className={groupLabel}>
                      {section.title}
                      <span className="text-muted-foreground text-xs font-normal tabular-nums">
                        {count}
                      </span>
                    </GroupLabel>
                    <StarterTable
                      entries={sheetEntries}
                      onStarter={openStarter}
                      onPreset={openPreset}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    {groups.map((group) => (
                      <div key={group.label} className="flex flex-col gap-3">
                        {current || groups.length > 1 ? (
                          <GroupLabel className={groupLabel}>
                            {group.label}
                            <span className="text-muted-foreground text-xs font-normal tabular-nums">
                              {group.entries.length}
                            </span>
                          </GroupLabel>
                        ) : null}
                        <ul
                          aria-label={group.label}
                          className={layoutOf(group.entries[0])}
                        >
                          {group.entries.map(renderEntry)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
