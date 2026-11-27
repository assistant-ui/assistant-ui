"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowUpRightIcon,
  BookmarkIcon,
  BookmarkXIcon,
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
import {
  LibraryDialog,
  LibraryDialogClose,
  LibraryDialogContent,
  LibraryDialogDescription,
  LibraryDialogTitle,
} from "./library-dialog";
import { iconMenuTrigger } from "./library-item";
import { toggleLibrarySavedWithToast } from "./library-item-menu";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import { LibraryTooltip } from "./library-tooltip";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "./menu";
import { useLibrarySaved } from "./saved-store";
import { SkillGlyph } from "./skill-glyphs";
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

const iconButton =
  "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

const button =
  "focus-visible:ring-ring inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

const tab =
  "text-muted-foreground hover:text-foreground data-active:bg-foreground/[0.06] data-active:text-foreground dark:data-active:bg-foreground/[0.09] focus-visible:ring-ring h-8 shrink-0 cursor-pointer rounded-full px-3 font-mono text-[13px] whitespace-nowrap transition-colors outline-none [font-variant-ligatures:none] focus-visible:ring-2 focus-visible:ring-inset";

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
      <LibraryTooltip label="More">
        <MenuTrigger
          aria-label={`More for ${skill.title}`}
          className={iconMenuTrigger}
        >
          <EllipsisIcon aria-hidden />
        </MenuTrigger>
      </LibraryTooltip>
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
      <LibraryTooltip label="Search files">
        <button
          ref={buttonRef}
          type="button"
          aria-label="Search files"
          onClick={() => onQueryChange("")}
          className={iconButton}
        >
          <SearchIcon aria-hidden />
        </button>
      </LibraryTooltip>
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
        className="bg-foreground/[0.04] placeholder:text-muted-foreground focus-visible:ring-ring h-8 w-full rounded-full ps-8 pe-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset [&::-webkit-search-cancel-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Close search"
        onClick={() => onQueryChange(null)}
        className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring absolute end-1 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
      >
        <XIcon aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}

const RESULTS = "search-results";

type Target = { hit: SkillSearchHit; done: boolean };

function SkillDialogBody({ skill }: { skill: LibrarySkill }) {
  const isSaved = useLibrarySaved().includes(skillSavedId(skill.name));
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
      className="flex min-h-0 flex-1 flex-col p-4"
    >
      <style>{SKILL_SEARCH_STYLES}</style>
      <div className="flex items-start gap-3">
        <span
          data-nav-glyph-motion
          className="group/navlink bg-foreground/[0.04] dark:bg-foreground/[0.06] grid h-11 w-14 shrink-0 place-items-center rounded-xl"
        >
          <SkillGlyph name={skill.name} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <LibraryDialogTitle className="text-lg leading-6 font-medium">
            {skill.title}
          </LibraryDialogTitle>
          <LibraryDialogDescription className="text-muted-foreground text-sm text-pretty">
            {skill.summary}
          </LibraryDialogDescription>
        </div>
        <div className="-me-1 -mt-1 flex items-center">
          <SkillMenu skill={skill} file={file} />
          <LibraryDialogClose aria-label="Close" className={iconButton}>
            <XIcon aria-hidden />
          </LibraryDialogClose>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1">
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
            <Tabs.Tab value={RESULTS} className={cn(tab, "font-sans text-sm")}>
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
          className="bg-foreground/[0.04] flex shrink-0 rounded-full p-0.5"
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
                "focus-visible:ring-ring h-7 cursor-pointer rounded-full px-2.5 text-[13px] transition-colors outline-none focus-visible:ring-2",
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
        className="border-foreground/10 mt-2 min-h-0 flex-1 overflow-y-auto rounded-2xl border p-4"
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

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-pressed={isSaved}
          onClick={() =>
            toggleLibrarySavedWithToast(skillSavedId(skill.name), skill.title)
          }
          className={cn(
            button,
            isSaved
              ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
              : "bg-foreground/[0.06] hover:bg-foreground/[0.1]",
          )}
        >
          {isSaved ? (
            <BookmarkXIcon aria-hidden />
          ) : (
            <BookmarkIcon aria-hidden />
          )}
          {isSaved ? "Unsave" : "Save"}
        </button>
        <button
          type="button"
          aria-label={`Install ${skill.title}: copy its install command`}
          onClick={() =>
            copyWithLibraryToast(skill.command, "Install command copied.")
          }
          className={cn(
            button,
            "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          <TerminalIcon aria-hidden />
          Install
        </button>
      </div>
    </Tabs.Root>
  );
}

/** `skill` stays set while the dialog closes, so its content holds through the exit animation. */
export function SkillDialog({
  skill,
  open,
  onOpenChange,
}: {
  skill: LibrarySkill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <LibraryDialog open={open} onOpenChange={onOpenChange}>
      <LibraryDialogContent
        ref={popupRef}
        tabIndex={-1}
        initialFocus={popupRef}
        className="h-[40rem] sm:w-[36rem]"
      >
        {skill ? <SkillDialogBody key={skill.name} skill={skill} /> : null}
      </LibraryDialogContent>
    </LibraryDialog>
  );
}
