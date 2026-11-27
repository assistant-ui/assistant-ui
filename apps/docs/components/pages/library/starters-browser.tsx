"use client";

import { useDeferredValue, useState } from "react";
import { StarterCard, StarterRow } from "./starter-card";
import { StarterDialog } from "./starter-dialog";
import {
  DEFAULT_VIEW_OPTIONS,
  StartersViewMenu,
  type StarterSort,
} from "./starters-view-menu";
import { LibraryCartButton, LibraryCartSheet } from "./cart-sheet";
import { PillTabs, type PillTab } from "./pill-tabs";
import { LibraryEmpty } from "./library-empty";
import { LibraryToaster } from "./library-toast";
import { SearchBar } from "./search-bar";
import { EXAMPLES, TEMPLATES, type Starter } from "@/lib/library/starters-data";

const SECTIONS = [
  {
    id: "templates",
    title: "Templates",
    description: "Complete apps to build on.",
    starters: TEMPLATES,
  },
  {
    id: "examples",
    title: "Examples",
    description: "Apps that each show one integration or feature.",
    starters: EXAMPLES,
  },
] as const;

type StarterTab = "all" | (typeof SECTIONS)[number]["id"];

const TABS: readonly PillTab<StarterTab>[] = [
  { id: "all", label: "All" },
  ...SECTIONS.map(({ id, title }) => ({ id, label: title })),
];

const matches = (starter: Starter, query: string) =>
  [
    starter.label,
    starter.name,
    starter.description,
    starter.framework,
    starter.runtime ?? "",
    ...(starter.integrations ?? []),
  ].some((text) => text.toLowerCase().includes(query));

const sortStarters = (starters: readonly Starter[], sort: StarterSort) =>
  sort === "default"
    ? starters
    : [...starters].sort((a, b) =>
        sort === "name-asc"
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label),
      );

export function StartersBrowser() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<StarterTab>("all");
  const [options, setOptions] = useState(DEFAULT_VIEW_OPTIONS);
  const [selected, setSelected] = useState<Starter | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = (starter: Starter) => {
    setSelected(starter);
    setDetailsOpen(true);
  };
  const normalized = useDeferredValue(query).trim().toLowerCase();

  const sections = SECTIONS.filter(
    (section) => tab === "all" || section.id === tab,
  )
    .map((section) => ({
      ...section,
      starters: sortStarters(
        section.starters.filter(
          (starter) =>
            (!normalized || matches(starter, normalized)) &&
            (!options.withScreenshot || starter.image || starter.screenshots) &&
            (options.frameworks.length === 0 ||
              options.frameworks.includes(starter.framework)) &&
            (options.runtimes.length === 0 ||
              (starter.runtime !== undefined &&
                options.runtimes.includes(starter.runtime))) &&
            (options.integrations.length === 0 ||
              (starter.integrations ?? []).some((integration) =>
                options.integrations.includes(integration),
              )),
        ),
        options.sort,
      ),
    }))
    .filter((section) => section.starters.length > 0);
  const Item = options.view === "list" ? StarterRow : StarterCard;

  const resultCount = sections.reduce(
    (total, section) => total + section.starters.length,
    0,
  );

  return (
    <>
      <div className="mb-12 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <PillTabs
          tabs={TABS}
          value={tab}
          onValueChange={setTab}
          label="Show starters"
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <SearchBar
            value={query}
            onValueChange={setQuery}
            label="Search starters"
            className="min-w-0 flex-1 sm:w-80 sm:flex-none"
          />
          <StartersViewMenu options={options} onOptionsChange={setOptions} />
          <LibraryCartButton />
        </div>
      </div>
      <LibraryCartSheet />
      <LibraryToaster />
      <StarterDialog
        starter={selected}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <p role="status" className="sr-only">
        {normalized ? `${resultCount} starters found` : ""}
      </p>
      {sections.length === 0 ? (
        <LibraryEmpty
          title={
            query.trim()
              ? `No starters match “${query.trim()}”`
              : "No starters match these filters"
          }
          description={
            tab === "all"
              ? "Try a different word, like a framework or a provider."
              : "Try a different word, or search all starters."
          }
          action={{
            label: "Clear search and filters",
            onClick: () => {
              setQuery("");
              setTab("all");
              setOptions({ ...DEFAULT_VIEW_OPTIONS, view: options.view });
            },
          }}
          className="mb-12"
        />
      ) : (
        <div className="flex flex-col">
          {sections.map((section, index) => (
            <section
              key={section.id}
              aria-labelledby={section.id}
              className={index > 0 ? "border-t pt-12" : "pb-12"}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 id={section.id} className="text-base font-medium">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {section.description}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {section.starters.length}
                </span>
              </div>
              <ul
                className={
                  options.view === "list"
                    ? "flex flex-col gap-1"
                    : "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {section.starters.map((starter) => (
                  <Item
                    key={starter.name}
                    starter={starter}
                    onSelect={openDetails}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
