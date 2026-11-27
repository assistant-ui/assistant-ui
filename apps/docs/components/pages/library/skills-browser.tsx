"use client";

import { useDeferredValue, useState } from "react";
import {
  SKILL_GROUPS,
  matchesSkill,
  type LibrarySkill,
  type SkillGroupId,
} from "@/lib/library/skills-data";
import { LibraryEmpty } from "./library-empty";
import {
  LibraryViewMenu,
  sortLibraryItems,
  type LibrarySort,
  type LibraryView,
} from "./library-view-menu";
import { PillTabs, type PillTab } from "./pill-tabs";
import { LibrarySavedButton } from "./saved-sheet";
import { SearchBar } from "./search-bar";
import { SkillCard, SkillRow } from "./skill-card";
import { SkillDialog } from "./skill-dialog";

type SkillTab = "all" | SkillGroupId;

const TABS: readonly PillTab<SkillTab>[] = [
  { id: "all", label: "All" },
  ...SKILL_GROUPS.map(({ id, title }) => ({ id, label: title })),
];

export function SkillsBrowser({ skills }: { skills: readonly LibrarySkill[] }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SkillTab>("all");
  const [sort, setSort] = useState<LibrarySort>("default");
  const [view, setView] = useState<LibraryView>("list");
  const [selected, setSelected] = useState<LibrarySkill | null>(null);
  const [open, setOpen] = useState(false);
  const normalized = useDeferredValue(query).trim().toLowerCase();

  const select = (name: string) => {
    const skill = skills.find((candidate) => candidate.name === name);
    if (!skill) return;
    setSelected(skill);
    setOpen(true);
  };

  const shown = sortLibraryItems(
    skills.filter(
      (skill) =>
        (tab === "all" || skill.group === tab) &&
        (!normalized || matchesSkill(skill, normalized)),
    ),
    sort,
    (skill) => skill.title,
  );
  const Item = view === "list" ? SkillRow : SkillCard;

  return (
    <>
      <div className="mb-12 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <PillTabs
          tabs={TABS}
          value={tab}
          onValueChange={setTab}
          label="Show skills"
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <SearchBar
            value={query}
            onValueChange={setQuery}
            label="Search skills"
            className="min-w-0 flex-1 sm:w-80 sm:flex-none"
          />
          <LibraryViewMenu
            sort={sort}
            view={view}
            onSortChange={setSort}
            onViewChange={setView}
            onReset={() => setSort("default")}
          />
          <LibrarySavedButton />
        </div>
      </div>
      <SkillDialog skill={selected} open={open} onOpenChange={setOpen} />
      <p role="status" className="sr-only">
        {normalized ? `${shown.length} skills found` : ""}
      </p>
      {shown.length === 0 ? (
        <LibraryEmpty
          title={`No skills match “${query.trim()}”`}
          description={
            tab === "all"
              ? "Try a different word, like a package or a hook."
              : "Try a different word, or search all skills."
          }
          action={{
            label: "Clear search",
            onClick: () => {
              setQuery("");
              setTab("all");
            },
          }}
          className="mb-12"
        />
      ) : (
        <ul
          className={
            view === "list"
              ? "grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-1 pb-12 lg:grid-cols-2"
              : "grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }
        >
          {shown.map((skill) => (
            <Item key={skill.name} skill={skill} onSelect={select} />
          ))}
        </ul>
      )}
    </>
  );
}
