"use client";

import { useDeferredValue, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  entryKey,
  entryName,
  LIBRARY_SECTIONS,
  matchesEntry,
  sectionCount,
  type LibraryEntry,
  type LibrarySectionId,
} from "@/lib/library/library-data";
import type { LibrarySkill } from "@/lib/library/skills-data";
import type { Starter } from "@/lib/library/starters-data";
import { LibraryHero } from "./library-hero";
import { LibraryItemDialog, type LibraryDetails } from "./library-item-dialog";
import { LibraryEmpty } from "./library-empty";
import { BlockCard, LinkRow, SectionTile } from "./library-entry";
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
import { PillTabs, type PillTab } from "./pill-tabs";
import { LibrarySavedButton } from "./saved-sheet";
import { SearchBar } from "./search-bar";
import { SkillCard, SkillRow } from "./skill-card";
import { SkillDialog } from "./skill-dialog";
import { StarterCard, StarterRow } from "./starter-card";
import { StarterSheet } from "./starter-sheet";
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
  const [filters, setFilters] = useState<
    Partial<Record<LibrarySectionId, TabFilter>>
  >({});
  const [starterOptions, setStarterOptions] = useState(DEFAULT_VIEW_OPTIONS);
  const [skillView, setSkillView] = useState<LibraryView>("list");
  const [starter, setStarter] = useState<Starter | null>(null);
  const [starterOpen, setStarterOpen] = useState(false);
  const [skill, setSkill] = useState<LibrarySkill | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [details, setDetails] = useState<LibraryDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = (next: LibraryDetails) => {
    setDetails(next);
    setDetailsOpen(true);
  };
  const normalized = useDeferredValue(query).trim().toLowerCase();

  const all = LIBRARY_SECTIONS;
  const current = all.find((section) => section.id === tab);
  const home = !current && !normalized;
  const GroupLabel = current ? "h2" : "p";

  const filter = (current && filters[current.id]) ?? NO_FILTER;
  const setFilter = (next: TabFilter) => {
    if (current) setFilters({ ...filters, [current.id]: next });
  };
  const onStarters = current?.id === "starters";
  const sort = onStarters ? starterOptions.sort : filter.sort;
  const starterRows = onStarters && starterOptions.view === "list";
  const skillTiles = current?.id === "skills" && skillView === "grid";

  const sections = all
    .filter((section) => !current || section === current)
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
                (!current ||
                  filter.traits.every(
                    (trait) =>
                      entry.kind === "link" &&
                      entry.link.traits?.includes(trait),
                  )) &&
                (!onStarters ||
                  entry.kind !== "starter" ||
                  matchesStarterOptions(entry.starter, starterOptions)),
            ),
            current ? sort : "default",
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

  const resultCount = sections.reduce((total, { count }) => total + count, 0);

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
            onSelect={(selected) => {
              setStarter(selected);
              setStarterOpen(true);
            }}
          />
        );
      }
      case "skill": {
        const Item = skillTiles ? SkillCard : SkillRow;
        return (
          <Item
            key={entryKey(entry)}
            skill={entry.skill}
            onSelect={() => {
              setSkill(entry.skill);
              setSkillOpen(true);
            }}
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

  const menu = !current ? null : onStarters ? (
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
    filter.groups.length > 0 ||
    filter.traits.length > 0 ||
    (onStarters &&
      (starterOptions.frameworks.length > 0 ||
        starterOptions.runtimes.length > 0 ||
        starterOptions.integrations.length > 0 ||
        starterOptions.withScreenshot));

  return (
    <>
      <PillTabs
        tabs={tabs}
        value={tab}
        onValueChange={setTab}
        label="Show library items"
        className="mb-10"
      />
      <LibraryHero
        section={current}
        onSkill={(selected) => {
          setSkill(selected);
          setSkillOpen(true);
        }}
      />
      <div className="mb-10 flex items-center gap-2">
        <SearchBar
          value={query}
          onValueChange={setQuery}
          label={current ? `Search ${current.noun}` : "Search the library"}
          className="min-w-0 flex-1"
        />
        {menu}
        <LibrarySavedButton />
      </div>
      <StarterSheet
        starter={starter}
        open={starterOpen}
        onOpenChange={setStarterOpen}
      />
      <SkillDialog skill={skill} open={skillOpen} onOpenChange={setSkillOpen} />
      <LibraryItemDialog
        item={details}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <p role="status" className="sr-only">
        {normalized ? `${resultCount} items found` : ""}
      </p>
      {home ? (
        <ul
          aria-label="Kinds of library item"
          className="grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 xl:grid-cols-5"
        >
          {all.map((section) => (
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
              ? `Nothing in the library matches “${query.trim()}”`
              : query.trim()
                ? `No ${current.noun} match “${query.trim()}”`
                : `No ${current.noun} match these filters`
          }
          description={
            !current
              ? "Try a different word, like a component or a framework."
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
      ) : (
        <div className="flex flex-col">
          {sections.map(({ section, count, groups }, index) => (
            <section
              key={section.id}
              aria-label={section.title}
              className={index > 0 ? "border-t py-12" : "pb-12"}
            >
              {current ? null : (
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-base font-medium">
                    <Link
                      href={section.href}
                      className="decoration-foreground/30 underline-offset-4 hover:underline"
                    >
                      {section.title}
                    </Link>
                  </h2>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {count}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-8">
                {groups.map((group) => (
                  <div key={group.label} className="flex flex-col gap-2">
                    {current || groups.length > 1 ? (
                      <GroupLabel className="text-muted-foreground text-sm tabular-nums">
                        {group.label} · {group.entries.length}
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
            </section>
          ))}
        </div>
      )}
    </>
  );
}
