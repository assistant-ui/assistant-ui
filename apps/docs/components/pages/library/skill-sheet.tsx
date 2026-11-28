"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowUpRightIcon,
  BotIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  SearchIcon,
  TerminalIcon,
  XIcon,
} from "lucide-react";
import { skillSavedId } from "@/lib/library/saved-items";
import type { LibrarySkill } from "@/lib/library/skills-data";
import { cn } from "@/lib/utils";
import { LibraryDrawer, LibraryDrawerContent } from "./library-drawer";
import {
  LibraryIconButton,
  LibraryMenuIconButton,
} from "./library-icon-button";
import {
  SheetFooter,
  SheetHeader,
  sheetButton,
  sheetPrimary,
} from "./library-sheet";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
} from "./menu";
import { SkillThumbnail } from "./skill-card";
import { SkillMarkdown, loadSkillDocument } from "./skill-markdown";
import {
  SKILL_SEARCH_MIN,
  SKILL_SEARCH_STYLES,
  SkillSearchResults,
  clearSkillHighlights,
  highlightSkillMatches,
  searchSkillFiles,
  type SkillSearchHit,
} from "./skill-search";

const tab =
  "text-muted-foreground hover:text-foreground data-active:bg-foreground/[0.06] data-active:text-foreground dark:data-active:bg-foreground/[0.09] focus-visible:ring-ring h-8 shrink-0 cursor-pointer rounded-(--library-control) px-3 font-mono text-[13px] whitespace-nowrap transition-colors outline-none [font-variant-ligatures:none] focus-visible:ring-2 focus-visible:ring-inset";

type SkillFile = { name: string; href: string; base?: string };

/** SKILL.md first, then the reference files in the order the skill lists them. */
const filesOf = (skill: LibrarySkill): SkillFile[] => [
  { name: "SKILL.md", href: skill.rawHref },
  ...skill.references.map(({ file, href }) => ({
    name: file,
    href,
    base: href,
  })),
];

/** Fetches the skill's files as the skills repo holds them and saves them as one zip of the skill's folder. */
const downloadSkill = async (skill: LibrarySkill) => {
  const files = [
    { path: "SKILL.md", href: skill.sourceFileHref },
    ...skill.references.map(({ path, href }) => ({ path, href })),
  ];
  try {
    const [{ strToU8, zipSync }, texts] = await Promise.all([
      import("fflate"),
      Promise.all(
        files.map(async ({ href }) => {
          const response = await fetch(href);
          if (!response.ok) throw new Error(`${href} ${response.status}`);
          return response.text();
        }),
      ),
    ]);
    const zip = zipSync(
      Object.fromEntries(
        files.map(({ path }, index) => [
          `${skill.name}/${path}`,
          strToU8(texts[index] ?? ""),
        ]),
      ),
    );
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(zip)], { type: "application/zip" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${skill.name}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    libraryToast.success(`${skill.name}.zip downloaded.`);
  } catch {
    libraryToast.error("The skill did not download.");
  }
};

function SkillMenu({ skill, file }: { skill: LibrarySkill; file: SkillFile }) {
  return (
    <Menu>
      <LibraryMenuIconButton
        tooltip="More"
        side="bottom"
        aria-label={`More for ${skill.title}`}
      >
        <EllipsisIcon aria-hidden />
      </LibraryMenuIconButton>
      <MenuContent align="end">
        <MenuItem
          onClick={async () => {
            try {
              await copyWithLibraryToast(
                await loadSkillDocument(file.href),
                `${file.name} copied.`,
              );
            } catch {
              libraryToast.error(`${file.name} did not load.`);
            }
          }}
        >
          <CopyIcon aria-hidden />
          Copy Markdown
        </MenuItem>
        <MenuLinkItem href={file.href} target="_blank" rel="noreferrer">
          <ArrowUpRightIcon aria-hidden />
          Open {file.name}
        </MenuLinkItem>
        <MenuSeparator />
        <MenuItem
          onClick={() =>
            copyWithLibraryToast(skill.command, "Install command copied.")
          }
        >
          <TerminalIcon aria-hidden />
          Copy install command
        </MenuItem>
        <MenuItem
          onClick={() =>
            copyWithLibraryToast(skill.prompt, "Agent prompt copied.")
          }
        >
          <BotIcon aria-hidden />
          Copy agent prompt
        </MenuItem>
        <MenuItem onClick={() => downloadSkill(skill)}>
          <DownloadIcon aria-hidden />
          Download skill
        </MenuItem>
        <MenuSeparator />
        <MenuLinkItem href={skill.sourceHref} target="_blank" rel="noreferrer">
          <ArrowUpRightIcon aria-hidden />
          View on GitHub
        </MenuLinkItem>
      </MenuContent>
    </Menu>
  );
}

/** A search button that opens into a field. */
function FileSearch({
  query,
  onQueryChange,
}: {
  query: string | null;
  onQueryChange: (query: string | null) => void;
}) {
  const open = query !== null;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);

  // Focus follows the control as it swaps between the button and the field.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (!open) {
    return (
      <LibraryIconButton
        ref={buttonRef}
        tooltip="Search files"
        onClick={() => onQueryChange("")}
      >
        <SearchIcon aria-hidden />
      </LibraryIconButton>
    );
  }

  return (
    <div className="relative w-44 shrink-0">
      <SearchIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          onQueryChange(null);
        }}
        placeholder="Search in files"
        aria-label="Search in files"
        autoComplete="off"
        spellCheck={false}
        className="bg-foreground/[0.04] placeholder:text-muted-foreground focus-visible:ring-ring h-8 w-full rounded-(--library-control) ps-8 pe-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset [&::-webkit-search-cancel-button]:appearance-none"
      />
      <span className="absolute inset-y-0 end-1 flex items-center">
        <LibraryIconButton
          tooltip="Close search"
          onClick={() => onQueryChange(null)}
          className="size-6"
        >
          <XIcon aria-hidden className="size-3.5" />
        </LibraryIconButton>
      </span>
    </div>
  );
}

const RESULTS = "search-results";

type Target = { hit: SkillSearchHit; done: boolean };

function SkillSheetBody({
  skill,
  previous,
  next,
  stepped,
  onSkillChange,
}: {
  skill: LibrarySkill;
  previous: LibrarySkill | undefined;
  next: LibrarySkill | undefined;
  /** The arrow that brought this skill up, which takes focus so stepping can go on from the keyboard. */
  stepped: "previous" | "next" | null;
  onSkillChange: (skill: LibrarySkill, by: "previous" | "next") => void;
}) {
  const files = filesOf(skill);
  const [name, setName] = useState("SKILL.md");
  const [query, setQuery] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [raw, setRaw] = useState(false);
  const [texts, setTexts] = useState<Record<string, string>>();
  const target = useRef<Target>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const searching = query !== null;
  const file = files.find((entry) => entry.name === name) ?? files[0]!;
  const value = searching && showResults ? RESULTS : file.name;

  // Focus moves to a tab picked with the keyboard, but the strip follows it only if asked.
  useEffect(() => {
    listRef.current
      ?.querySelector('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value]);

  // A search reads every file, so the first one fetches those not opened yet.
  useEffect(() => {
    if (!searching) return;
    let current = true;
    Promise.all(
      filesOf(skill).map(async (entry) => {
        const text = await loadSkillDocument(entry.href).catch(() => "");
        return [entry.name, text] as const;
      }),
    ).then((loaded) => current && setTexts(Object.fromEntries(loaded)));
    return () => {
      current = false;
    };
  }, [searching, skill]);

  const groups = searchSkillFiles(
    texts
      ? files.map((entry) => ({ ...entry, text: texts[entry.name] ?? "" }))
      : [],
    query ?? "",
  );
  const hitCount = groups.reduce(
    (total, group) => total + group.hits.length,
    0,
  );

  // While a search is on, the open file shows its matches; a result that was
  // clicked is scrolled to once, as soon as the file has rendered.
  const highlight = searching && !showResults ? (query ?? "") : null;
  useEffect(() => {
    const container = scrollRef.current;
    if (highlight === null || !container) {
      clearSkillHighlights();
      return;
    }
    const run = () => {
      const root = container.querySelector<HTMLElement>(
        "[data-skill-markdown]",
      );
      if (!root) return;
      const picked = target.current;
      const range = highlightSkillMatches(root, highlight, picked?.hit.context);
      if (range === undefined || !picked || picked.done) return;
      picked.done = true;
      if (!range) return;
      const top =
        range.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      container.scrollTo({
        top: Math.max(0, top - container.clientHeight / 3),
      });
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(container, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      clearSkillHighlights();
    };
  }, [highlight, file.name, raw]);

  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => {
        target.current = null;
        if (next === RESULTS) {
          setShowResults(true);
          return;
        }
        setShowResults(false);
        setName(String(next));
        scrollRef.current?.scrollTo({ top: 0 });
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <style>{SKILL_SEARCH_STYLES}</style>
      <div className="flex min-h-0 flex-1 flex-col gap-5 p-6">
        <SheetHeader
          thumbnail={<SkillThumbnail name={skill.name} />}
          title={skill.title}
          kind="skill"
          description={skill.summary}
          previous={
            previous && {
              label: previous.title,
              go: () => onSkillChange(previous, "previous"),
            }
          }
          next={
            next && {
              label: next.title,
              go: () => onSkillChange(next, "next"),
            }
          }
          actions={<SkillMenu skill={skill} file={file} />}
          focused={stepped}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-1">
            <FileSearch
              query={query}
              onQueryChange={(next) => {
                setQuery(next);
                setShowResults(next !== null);
                target.current = null;
              }}
            />
            <Tabs.List
              ref={listRef}
              aria-label={`${skill.title} files`}
              className="flex min-w-0 flex-1 [scrollbar-width:none] gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] pe-6 [&::-webkit-scrollbar]:hidden"
            >
              {searching ? (
                <Tabs.Tab
                  value={RESULTS}
                  className={cn(tab, "font-sans text-sm")}
                >
                  Results
                  {hitCount > 0 ? (
                    <span className="text-muted-foreground ms-1.5 tabular-nums">
                      {hitCount}
                    </span>
                  ) : null}
                </Tabs.Tab>
              ) : null}
              {files.map((entry) => (
                <Tabs.Tab key={entry.name} value={entry.name} className={tab}>
                  {entry.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <div
              role="group"
              aria-label="File view"
              className="bg-foreground/[0.04] flex shrink-0 rounded-(--library-control) p-0.5"
            >
              {(
                [
                  [false, "Markdown"],
                  [true, "Raw"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={raw === mode}
                  onClick={() => setRaw(mode)}
                  className={cn(
                    "focus-visible:ring-ring h-7 cursor-pointer rounded-(--library-control) px-2.5 text-[13px] transition-colors outline-none focus-visible:ring-2",
                    raw === mode
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="border-foreground/10 min-h-0 flex-1 overflow-y-auto rounded-(--library-thumb) border p-4"
          >
            {searching ? (
              <Tabs.Panel value={RESULTS} className="outline-none">
                <p role="status" className="sr-only">
                  {texts && (query ?? "").trim().length >= SKILL_SEARCH_MIN
                    ? `${hitCount} matches in ${groups.length} files`
                    : ""}
                </p>
                <SkillSearchResults
                  query={query ?? ""}
                  groups={groups}
                  loading={!texts}
                  onOpen={(hit) => {
                    target.current = { hit, done: false };
                    setName(hit.file);
                    setShowResults(false);
                  }}
                />
              </Tabs.Panel>
            ) : null}
            {files.map((entry) => (
              <Tabs.Panel
                key={entry.name}
                value={entry.name}
                className="outline-none"
              >
                <SkillMarkdown
                  href={entry.href}
                  label={entry.name}
                  raw={raw}
                  {...(entry.base && { base: entry.base })}
                />
              </Tabs.Panel>
            ))}
          </div>
        </div>
      </div>
      <SheetFooter id={skillSavedId(skill.name)} label={skill.title}>
        <button
          type="button"
          aria-label={`Install ${skill.title}: copy its install command`}
          onClick={() =>
            copyWithLibraryToast(skill.command, "Install command copied.")
          }
          className={cn(sheetButton, sheetPrimary)}
        >
          <TerminalIcon aria-hidden />
          Install
        </button>
      </SheetFooter>
    </Tabs.Root>
  );
}

/** A skill's drawer: its files to read and search, laid out like every other library drawer. `skill` stays set while it closes, so its content holds through the exit animation. */
export function SkillSheet({
  skill,
  skills,
  onSkillChange,
  open,
  onOpenChange,
}: {
  skill: LibrarySkill | null;
  /** The skills on screen, in order, which the arrows step through. */
  skills: readonly LibrarySkill[];
  onSkillChange: (skill: LibrarySkill) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const index = skill
    ? skills.findIndex((entry) => entry.name === skill.name)
    : -1;
  const previous = index > 0 ? skills[index - 1] : undefined;
  const next = index === -1 ? undefined : skills[index + 1];
  const [stepped, setStepped] = useState<"previous" | "next" | null>(null);
  return (
    <LibraryDrawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setStepped(null);
        onOpenChange(nextOpen);
      }}
    >
      <LibraryDrawerContent
        ref={popupRef}
        tabIndex={-1}
        initialFocus={popupRef}
        className="w-[30rem]"
      >
        {skill ? (
          <SkillSheetBody
            key={skill.name}
            skill={skill}
            previous={previous}
            next={next}
            stepped={stepped}
            onSkillChange={(nextSkill, by) => {
              setStepped(by);
              onSkillChange(nextSkill);
            }}
          />
        ) : null}
      </LibraryDrawerContent>
    </LibraryDrawer>
  );
}
