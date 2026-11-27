"use client";

import { useDeferredValue, useState } from "react";
import { StarterCard } from "./starter-card";
import { LibraryCartButton, LibraryCartSheet } from "./cart-sheet";
import { PillTabs, type PillTab } from "./pill-tabs";
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
  [starter.label, starter.name, starter.description].some((text) =>
    text.toLowerCase().includes(query),
  );

export function StartersBrowser() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<StarterTab>("all");
  const normalized = useDeferredValue(query).trim().toLowerCase();

  const sections = SECTIONS.filter(
    (section) => tab === "all" || section.id === tab,
  )
    .map((section) => ({
      ...section,
      starters: normalized
        ? section.starters.filter((starter) => matches(starter, normalized))
        : section.starters,
    }))
    .filter((section) => section.starters.length > 0);

  const resultCount = sections.reduce(
    (total, section) => total + section.starters.length,
    0,
  );

  return (
    <>
      <SearchBar
        value={query}
        onValueChange={setQuery}
        label="Search starters"
        className="mb-4"
      />
      <div className="mb-12 flex items-center justify-between gap-4">
        <PillTabs
          tabs={TABS}
          value={tab}
          onValueChange={setTab}
          label="Show starters"
        />
        <LibraryCartButton />
      </div>
      <LibraryCartSheet />
      <p role="status" className="sr-only">
        {normalized ? `${resultCount} starters found` : ""}
      </p>
      {sections.length === 0 ? (
        <p className="text-muted-foreground pb-12">
          No starters match “{query.trim()}”.
        </p>
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
              <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {section.starters.map((starter) => (
                  <StarterCard key={starter.name} starter={starter} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
