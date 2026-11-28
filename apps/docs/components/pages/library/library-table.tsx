"use client";

import { Fragment, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookOpenIcon,
  BookmarkIcon,
  BookmarkMinusIcon,
  BotIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleXIcon,
  DownloadIcon,
  EllipsisIcon,
  GlobeIcon,
  TerminalIcon,
} from "lucide-react";
import { GitHubIcon } from "@/components/icons/github";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { libraryCommands } from "@/lib/library/commands";
import {
  LIBRARY_LINK_LABEL,
  directUsedBy,
  totalNeeds,
  totalUsedBy,
  type LibraryFactLink,
  type LibraryLinkKind,
} from "@/lib/library/facts";
import type { LibraryPreset } from "@/lib/library/presets-data";
import {
  getLibrarySavedItems,
  librarySavedPrompt,
} from "@/lib/library/saved-items";
import type { LibrarySkill } from "@/lib/library/skills-data";
import type { Starter } from "@/lib/library/starters-data";
import {
  TABLE_EXPORTS,
  exportTableRecords,
  libraryTableRecord,
  type LibraryTableItem,
  type LibraryTableRecord,
  type TableExportFormat,
  type TableSort,
  type TableSortColumn,
} from "@/lib/library/table-data";
import { formatLibraryDay } from "@/lib/library/updated-data";
import { cn } from "@/lib/utils";
import { LibraryAvailabilityMark } from "./library-availability";
import { LibraryCheckbox } from "./library-checkbox";
import { LibraryCommandsMenu } from "./library-commands-menu";
import { LibraryIconButton } from "./library-icon-button";
import { LibraryItemMenu } from "./library-item-menu";
import { libraryDetails, type LibraryDetails } from "./library-item-sheet";
import { LibraryKindLabel } from "./library-kind";
import { LibraryThumb } from "./library-thumb";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "./menu";
import { PresetMenu } from "./preset-card";
import {
  removeLibrarySavedItems,
  saveLibraryItems,
  setLibrarySavedOpen,
  useLibrarySaved,
} from "./saved-store";
import { SkillMenu } from "./skill-card";
import { StarterMenu } from "./starter-menu";
import { tableCell, tableHead } from "./starter-table";

/** The columns that can be hidden, each with its width in rem; the name always shows and takes the room left. */
export const TABLE_COLUMNS = [
  { id: "type", label: "Type", width: 8.5 },
  { id: "status", label: "Status", width: 8 },
  { id: "platform", label: "Platform", width: 8 },
  { id: "needs", label: "Needs", width: 5 },
  { id: "usedBy", label: "Used by", width: 5.5 },
  { id: "commands", label: "Commands", width: 5.5 },
  { id: "install", label: "Install command", width: 21 },
  { id: "links", label: "Links", width: 6 },
  { id: "updated", label: "Updated", width: 7.5 },
] as const;

export type TableColumnId = (typeof TABLE_COLUMNS)[number]["id"];

/** The columns a table starts without: the counts and the full command, which the menu and the details also give. */
export const TABLE_HIDDEN: readonly TableColumnId[] = [
  "needs",
  "usedBy",
  "install",
];

const NAME_WIDTH = 14;
const EDGE_WIDTH = 2.25 + 2.5;

type LinkMark = ComponentType<{ className?: string }>;

const ROW_LINKS: readonly { kind: LibraryLinkKind; icon: LinkMark }[] = [
  { kind: "docs", icon: BookOpenIcon },
  { kind: "demo", icon: GlobeIcon },
  { kind: "source", icon: GitHubIcon },
];

export const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Saves the rows as a file named for the library. */
export const downloadTableRecords = (
  format: TableExportFormat,
  records: readonly LibraryTableRecord[],
) => {
  const type =
    TABLE_EXPORTS.find((entry) => entry.format === format)?.type ??
    "text/plain";
  const url = URL.createObjectURL(
    new Blob([exportTableRecords(format, records)], { type }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `assistant-ui-library.${format}`;
  link.click();
  URL.revokeObjectURL(url);
  libraryToast.success(`${plural(records.length, "item")} exported.`);
};

const menuClass = "relative shrink-0";

const nameTarget =
  "focus-visible:ring-ring max-w-full truncate rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2";

const COLUMN_SORT: Partial<Record<TableColumnId, TableSortColumn>> = {
  type: "type",
  status: "status",
  platform: "platform",
  needs: "needs",
  usedBy: "usedBy",
  updated: "updated",
};

const none = (label: string) => (
  <span className="text-muted-foreground">
    <span aria-hidden>–</span>
    <span className="sr-only">{label}</span>
  </span>
);

const footButton =
  "border-foreground/15 h-8 rounded-(--library-control) border px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/** A command that wraps between its words and never inside a package or item name. */
function CommandText({ command }: { command: string }) {
  return (
    <code className="text-muted-foreground block overflow-hidden font-mono text-xs leading-relaxed [font-variant-ligatures:none]">
      {command.split(" ").map((word, index) => (
        <Fragment key={index}>
          {index > 0 ? " " : null}
          <span className="whitespace-nowrap">{word}</span>
        </Fragment>
      ))}
    </code>
  );
}

/** A link as an icon that says where it goes on hover; a site path stays in the tab. */
function LinkIcon({
  link,
  name,
  icon: Icon,
}: {
  link: LibraryFactLink;
  name: string;
  icon: LinkMark;
}) {
  const label = `${LIBRARY_LINK_LABEL[link.kind]} for ${name}`;
  const className =
    "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-(--library-icon) outline-none focus-visible:ring-2 [&_svg]:size-4";
  const inside = link.href.startsWith("/");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          inside ? (
            <Link href={link.href} aria-label={label} className={className} />
          ) : (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${label} (opens in a new tab)`}
              className={className}
            />
          )
        }
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent>
        {link.label ?? LIBRARY_LINK_LABEL[link.kind]}
      </TooltipContent>
    </Tooltip>
  );
}

/** How many things, with the count once everything behind them is included. */
function Count({ direct, total }: { direct: number; total: number }) {
  return (
    <span className="tabular-nums">
      <span className={direct === 0 ? "text-muted-foreground" : undefined}>
        {direct}
      </span>
      <span className="text-muted-foreground"> / {total}</span>
    </span>
  );
}

/** A column's name as the button that sorts by it: up, then down, then off. */
function SortHead({
  column,
  sort,
  onSortChange,
  children,
}: {
  column: TableSortColumn;
  sort: TableSort | null;
  onSortChange: (sort: TableSort | null) => void;
  children: ReactNode;
}) {
  const dir = sort?.column === column ? sort.dir : undefined;
  const Arrow = dir === "desc" ? ArrowDownIcon : ArrowUpIcon;
  return (
    <th
      scope="col"
      aria-sort={
        dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"
      }
      className={tableHead}
    >
      <button
        type="button"
        onClick={() =>
          onSortChange(
            dir === undefined
              ? { column, dir: "asc" }
              : dir === "asc"
                ? { column, dir: "desc" }
                : null,
          )
        }
        className="hover:text-foreground focus-visible:ring-ring -mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1.5 py-0.5 transition-colors outline-none focus-visible:ring-2"
      >
        {children}
        {dir ? <Arrow aria-hidden className="size-3" /> : null}
      </button>
    </th>
  );
}

/**
 * Every library item as a data table: a picture, a name, what it is, and what
 * installs it, with rows that can be picked and acted on together, a page at a
 * time. `items` come filtered and in order; `resetKey` changes when they do,
 * which returns to the first page.
 */
export function LibraryTable({
  items,
  total,
  resetKey,
  sort,
  onSortChange,
  hidden,
  onStarter,
  onPreset,
  onSkill,
  onDetails,
}: {
  items: readonly LibraryTableItem[];
  /** How many items the library holds before a search or a filter. */
  total: number;
  resetKey: string;
  sort: TableSort | null;
  onSortChange: (sort: TableSort | null) => void;
  hidden: readonly TableColumnId[];
  /** Opens a starter's details. */
  onStarter: (starter: Starter) => void;
  /** Opens a preset's details. */
  onPreset: (preset: LibraryPreset) => void;
  /** Opens a skill's details. */
  onSkill: (skill: LibrarySkill) => void;
  /** Opens the details of an item with no drawer of its own. */
  onDetails: (details: LibraryDetails) => void;
}) {
  const saved = useLibrarySaved();
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [pageSize, setPageSize] = useState<number>(25);
  const [paging, setPaging] = useState({ key: resetKey, page: 0 });

  const rows = items.map((item) => ({
    item,
    record: libraryTableRecord(item),
  }));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(paging.key === resetKey ? paging.page : 0, pages - 1);
  const setPage = (next: number) => setPaging({ key: resetKey, page: next });
  const visible = rows.slice(page * pageSize, (page + 1) * pageSize);

  const pickedRecords = rows
    .filter(({ record }) => picked.has(record.key))
    .map(({ record }) => record);
  const allOnPage =
    visible.length > 0 && visible.every(({ record }) => picked.has(record.key));
  const someOnPage = visible.some(({ record }) => picked.has(record.key));
  const togglePage = (on: boolean) => {
    const next = new Set(picked);
    for (const { record } of visible) {
      if (on) next.add(record.key);
      else next.delete(record.key);
    }
    setPicked(next);
  };
  const toggleRow = (key: string, on: boolean) => {
    const next = new Set(picked);
    if (on) next.add(key);
    else next.delete(key);
    setPicked(next);
  };

  const pickedIds = pickedRecords.flatMap((record) =>
    record.savedId ? [record.savedId] : [],
  );
  const pickedCommands = pickedRecords.flatMap((record) =>
    record.command ? [record.command] : [],
  );
  const allSaved =
    pickedIds.length > 0 && pickedIds.every((id) => saved.includes(id));

  const columns = TABLE_COLUMNS.filter((column) => !hidden.includes(column.id));
  const minWidth = `${
    EDGE_WIDTH +
    NAME_WIDTH +
    columns.reduce((sum, column) => sum + column.width, 0)
  }rem`;

  const cell = (column: TableColumnId, record: LibraryTableRecord) => {
    const { fact } = record;
    switch (column) {
      case "type":
        return (
          <>
            <LibraryKindLabel
              kind={record.tone}
              label={record.type}
              className="text-[13px]"
            />
            {record.group ? (
              <span className="text-muted-foreground mt-0.5 block ps-3 text-xs text-pretty">
                {record.group}
              </span>
            ) : null}
          </>
        );
      case "status":
        return fact ? (
          <LibraryAvailabilityMark
            status={fact.status}
            detail={fact.statusDetail}
          />
        ) : (
          none("No status")
        );
      case "platform":
        return fact ? (
          <span className="text-muted-foreground text-pretty">
            {fact.platforms.join(", ")}
          </span>
        ) : (
          none("No platform")
        );
      case "needs":
        return (
          <Count
            direct={fact?.needs.length ?? 0}
            total={totalNeeds(record.factId)}
          />
        );
      case "usedBy":
        return (
          <Count
            direct={directUsedBy(record.factId).length}
            total={totalUsedBy(record.factId)}
          />
        );
      case "commands":
        return (
          <LibraryCommandsMenu
            name={record.name}
            commands={libraryCommands(record)}
          />
        );
      case "install":
        return record.command ? (
          <CommandText command={record.command} />
        ) : (
          <span className="text-muted-foreground whitespace-nowrap">
            {record.instead}
          </span>
        );
      case "links": {
        const links = ROW_LINKS.flatMap(({ kind, icon }) => {
          const link = fact?.links.find((entry) => entry.kind === kind);
          return link ? [{ link, icon }] : [];
        });
        return links.length > 0 ? (
          <span className="-mx-1 flex items-center">
            {links.map(({ link, icon }) => (
              <LinkIcon
                key={link.kind}
                link={link}
                name={record.name}
                icon={icon}
              />
            ))}
          </span>
        ) : (
          none("No links")
        );
      }
      case "updated":
        return fact?.updated ? (
          <time
            dateTime={fact.updated}
            className="text-muted-foreground whitespace-nowrap"
          >
            {formatLibraryDay(fact.updated)}
          </time>
        ) : (
          none("Unknown")
        );
    }
  };

  const open = ({ entry }: LibraryTableItem): (() => void) | undefined => {
    switch (entry.kind) {
      case "starter":
        return () => onStarter(entry.starter);
      case "preset":
        return () => onPreset(entry.preset);
      case "skill":
        return () => onSkill(entry.skill);
      default: {
        const details = libraryDetails(entry);
        return details ? () => onDetails(details) : undefined;
      }
    }
  };

  const rowMenu = ({ entry }: LibraryTableItem, onOpen: () => void) => {
    switch (entry.kind) {
      case "starter":
        return (
          <StarterMenu
            starter={entry.starter}
            onDetails={onOpen}
            tooltipSide="top"
            className={menuClass}
          />
        );
      case "preset":
        return (
          <PresetMenu
            preset={entry.preset}
            onSelect={onPreset}
            tooltipSide="top"
            className={menuClass}
          />
        );
      case "skill":
        return (
          <SkillMenu
            skill={entry.skill}
            onDetails={onOpen}
            tooltipSide="top"
            className={menuClass}
          />
        );
      default: {
        const details = libraryDetails(entry);
        return details ? (
          <LibraryItemMenu
            id={details.id}
            label={details.name}
            prompt={details.prompt}
            docs={details.docs}
            onDetails={onOpen}
            tooltipSide="top"
            className={menuClass}
            {...(details.command && { command: details.command })}
          />
        ) : null;
      }
    }
  };

  const first = rows.length === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(rows.length, (page + 1) * pageSize);

  return (
    <div className="flex flex-col">
      <div className="border-foreground/10 overflow-x-auto rounded-(--library-thumb) border">
        <table
          style={{ minWidth }}
          className="w-full table-fixed border-collapse"
        >
          <caption className="sr-only">Everything in the library</caption>
          <colgroup>
            <col className="w-9" />
            <col />
            {columns.map((column) => (
              <col key={column.id} style={{ width: `${column.width}rem` }} />
            ))}
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr className="border-foreground/10 border-b">
              <th scope="col" className={cn(tableHead, "pe-0")}>
                <LibraryCheckbox
                  checked={allOnPage}
                  indeterminate={someOnPage && !allOnPage}
                  disabled={visible.length === 0}
                  onCheckedChange={togglePage}
                  label={
                    allOnPage
                      ? "Unselect every item on this page"
                      : "Select every item on this page"
                  }
                />
              </th>
              <SortHead column="name" sort={sort} onSortChange={onSortChange}>
                Name
              </SortHead>
              {columns.map((column) => {
                const sorts = COLUMN_SORT[column.id];
                return sorts ? (
                  <SortHead
                    key={column.id}
                    column={sorts}
                    sort={sort}
                    onSortChange={onSortChange}
                  >
                    {column.label}
                  </SortHead>
                ) : (
                  <th key={column.id} scope="col" className={tableHead}>
                    {column.label}
                  </th>
                );
              })}
              <th scope="col" className={tableHead}>
                <span className="sr-only">Options</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-foreground/10 divide-y">
            {visible.map(({ item, record }) => {
              const onOpen = open(item);
              const isPicked = picked.has(record.key);
              return (
                <tr
                  key={record.key}
                  data-state={isPicked ? "selected" : undefined}
                  className="hover:bg-foreground/[0.025] data-[state=selected]:bg-foreground/[0.045] dark:hover:bg-foreground/[0.04] dark:data-[state=selected]:bg-foreground/[0.07] transition-colors"
                >
                  <td className={cn(tableCell, "pe-0")}>
                    <LibraryCheckbox
                      checked={isPicked}
                      onCheckedChange={(on) => toggleRow(record.key, on)}
                      label={`Select ${record.name}`}
                    />
                  </td>
                  <th scope="row" className={cn(tableCell, "font-normal")}>
                    <span className="flex min-w-0 items-center gap-3">
                      <LibraryThumb entry={item.entry} />
                      <span className="flex min-w-0 flex-col">
                        {onOpen ? (
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={onOpen}
                            className={cn(nameTarget, "cursor-pointer")}
                          >
                            {record.name}
                          </button>
                        ) : (
                          <Link
                            href={
                              item.entry.kind === "link"
                                ? item.entry.link.href
                                : item.section.href
                            }
                            className={nameTarget}
                          >
                            {record.name}
                          </Link>
                        )}
                        {record.description ? (
                          <span
                            title={record.description}
                            className={cn(
                              "text-muted-foreground truncate text-xs",
                              record.code &&
                                "font-mono [font-variant-ligatures:none]",
                            )}
                          >
                            {record.description}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </th>
                  {columns.map((column) => (
                    <td key={column.id} className={tableCell}>
                      {cell(column.id, record)}
                    </td>
                  ))}
                  <td className={cn(tableCell, "px-1")}>
                    {onOpen ? rowMenu(item, onOpen) : null}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 3}
                  className="text-muted-foreground px-3 py-10 text-center text-[13px]"
                >
                  Nothing matches. Clear the search or a filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="bg-background sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 max-xl:pe-12">
        <div className="flex min-w-0 items-center gap-3">
          <Menu>
            <MenuTrigger
              disabled={pickedRecords.length === 0}
              aria-label={`Actions for ${plural(pickedRecords.length, "selected item")}`}
              className={footButton}
            >
              <EllipsisIcon aria-hidden />
              Actions
            </MenuTrigger>
            <MenuContent side="top" align="start">
              <MenuGroup>
                <MenuLabel>
                  {plural(pickedRecords.length, "item")} selected
                </MenuLabel>
                {allSaved ? (
                  <MenuItem
                    onClick={() => {
                      removeLibrarySavedItems(pickedIds);
                      libraryToast.success(
                        `${plural(pickedIds.length, "item")} removed from saved.`,
                        { group: "saved" },
                      );
                    }}
                  >
                    <BookmarkMinusIcon aria-hidden />
                    Remove from saved
                  </MenuItem>
                ) : (
                  <MenuItem
                    disabled={pickedIds.length === 0}
                    onClick={() => {
                      const added = saveLibraryItems(pickedIds);
                      libraryToast.success(`${plural(added, "item")} saved.`, {
                        group: "saved",
                        action: {
                          label: "View saved",
                          onClick: () => setLibrarySavedOpen(true),
                        },
                      });
                    }}
                  >
                    <BookmarkIcon aria-hidden />
                    Save
                  </MenuItem>
                )}
                <MenuItem
                  disabled={pickedCommands.length === 0}
                  onClick={() =>
                    copyWithLibraryToast(
                      pickedCommands.join("\n"),
                      `${plural(pickedCommands.length, "install command")} copied.`,
                    )
                  }
                >
                  <TerminalIcon aria-hidden />
                  Copy install commands
                </MenuItem>
                <MenuItem
                  disabled={pickedIds.length === 0}
                  onClick={() =>
                    copyWithLibraryToast(
                      librarySavedPrompt(getLibrarySavedItems(pickedIds)),
                      "Agent prompt copied.",
                    )
                  }
                >
                  <BotIcon aria-hidden />
                  Copy agent prompt
                </MenuItem>
                <MenuSub>
                  <MenuSubTrigger>
                    <DownloadIcon aria-hidden />
                    Export
                  </MenuSubTrigger>
                  <MenuSubContent>
                    {TABLE_EXPORTS.map((entry) => (
                      <MenuItem
                        key={entry.format}
                        onClick={() =>
                          downloadTableRecords(entry.format, pickedRecords)
                        }
                      >
                        {entry.label}
                      </MenuItem>
                    ))}
                  </MenuSubContent>
                </MenuSub>
              </MenuGroup>
              <MenuSeparator />
              <MenuItem onClick={() => setPicked(new Set())}>
                <CircleXIcon aria-hidden />
                Clear selection
              </MenuItem>
            </MenuContent>
          </Menu>
          <p
            aria-live="polite"
            className="text-muted-foreground truncate text-[13px] tabular-nums"
          >
            {pickedRecords.length > 0
              ? `${pickedRecords.length} of ${plural(rows.length, "item")} selected`
              : `${plural(rows.length, "item")}${rows.length === total ? "" : ` of ${total}`}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Menu>
            <MenuTrigger aria-label="Items per page" className={footButton}>
              {pageSize} per page
              <ChevronDownIcon aria-hidden className="text-muted-foreground" />
            </MenuTrigger>
            <MenuContent side="top" align="end">
              <MenuRadioGroup
                value={pageSize}
                onValueChange={(value: number) => {
                  setPageSize(value);
                  setPage(0);
                }}
              >
                {TABLE_PAGE_SIZES.map((size) => (
                  <MenuRadioItem key={size} value={size}>
                    {size} per page
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuContent>
          </Menu>
          <p className="text-muted-foreground text-[13px] whitespace-nowrap tabular-nums">
            {first}–{last} of {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <LibraryIconButton
              tooltip="Previous page"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="border-foreground/15 border disabled:opacity-40"
            >
              <ChevronLeftIcon aria-hidden />
            </LibraryIconButton>
            <LibraryIconButton
              tooltip="Next page"
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
              className="border-foreground/15 border disabled:opacity-40"
            >
              <ChevronRightIcon aria-hidden />
            </LibraryIconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
