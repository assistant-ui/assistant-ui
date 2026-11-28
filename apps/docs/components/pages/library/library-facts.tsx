"use client";

import { useState, type ReactNode } from "react";
import {
  AppWindowIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CodeIcon,
  GlobeIcon,
  LinkIcon,
  PackageIcon,
} from "lucide-react";
import { GitHubIcon } from "@/components/icons/github";
import { libraryCommands } from "@/lib/library/commands";
import {
  LIBRARY_LINK_LABEL,
  directNeeds,
  directUsedBy,
  libraryFact,
  libraryOther,
  totalNeeds,
  totalUsedBy,
  type LibraryLinkKind,
} from "@/lib/library/facts";
import { LIBRARY_KIND_LABEL } from "@/lib/library/saved-items";
import { libraryItem, libraryTableRecord } from "@/lib/library/table-data";
import { formatLibraryDay } from "@/lib/library/updated-data";
import { LibraryAvailabilityMark } from "./library-availability";
import { LibraryCopyButton } from "./library-copy-button";
import { GroupRow, RowGroup } from "./library-row-group";
import { SheetLinkRow } from "./library-sheet";

const REPOSITORY = "https://github.com/assistant-ui/assistant-ui/blob/main/";
const LIST_CAP = 8;

const LINK_ICON: Record<LibraryLinkKind, ReactNode> = {
  docs: <BookOpenIcon aria-hidden />,
  demo: <GlobeIcon aria-hidden />,
  site: <GlobeIcon aria-hidden />,
  source: <GitHubIcon />,
  npm: <PackageIcon aria-hidden />,
  pypi: <PackageIcon aria-hidden />,
  registry: <CodeIcon aria-hidden />,
  repo: <GitHubIcon />,
};

/** What a need or a user is called and what kind of thing it is; a library item also opens. */
const named = (ref: string) => {
  const item = libraryItem(ref);
  if (item) {
    const record = libraryTableRecord(item);
    return { name: record.name, kind: LIBRARY_KIND_LABEL[record.kind], item };
  }
  const other = libraryOther(ref);
  return { name: other?.name ?? ref, kind: other?.kind ?? "", item: undefined };
};

const count = (direct: number, total: number) => (
  <span className="tabular-nums">
    {direct} direct · {total} in total
  </span>
);

/** A row that names something related; one in the library opens that item's details. */
function RelatedRow({
  to,
  via,
  onGo,
}: {
  to: string;
  via?: string | undefined;
  onGo: (factId: string) => void;
}) {
  const { name, kind, item } = named(to);
  const tag = [kind, via].filter(Boolean).join(" · ");
  if (!item) {
    return <GroupRow label={name} value={tag} mono />;
  }
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onGo(to)}
        className="group/related focus-visible:ring-ring -mx-3 flex min-h-9 w-[calc(100%+1.5rem)] cursor-pointer items-center gap-2.5 px-3 py-0.5 text-left outline-none focus-visible:ring-2"
      >
        <span className="min-w-0 flex-1 truncate text-sm underline-offset-4 group-hover/related:underline">
          {name}
        </span>
        <span className="text-muted-foreground shrink-0 text-sm">{tag}</span>
        <ArrowRightIcon
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0"
        />
      </button>
    </li>
  );
}

/** A list that shows its first rows and offers the rest. */
function Capped({ children }: { children: readonly ReactNode[] }) {
  const [all, setAll] = useState(false);
  if (children.length <= LIST_CAP) return children;
  return (
    <>
      {all ? children : children.slice(0, LIST_CAP)}
      <li>
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-9 w-full cursor-pointer items-center rounded-sm text-sm outline-none focus-visible:ring-2"
        >
          {all ? "Show fewer" : `Show all ${children.length}`}
        </button>
      </li>
    </>
  );
}

/** What an item needs, drawn as a tree down to what those need in turn. */
function InstallTree({
  id,
  name,
  onGo,
}: {
  id: string;
  name: string;
  onGo: (factId: string) => void;
}) {
  const lines: ReactNode[] = [];
  const seen = new Set<string>();
  const walk = (current: string, prefix: string, depth: number) => {
    const needs = directNeeds(current);
    needs.forEach((need, index) => {
      const last = index === needs.length - 1;
      const { name: label, item } = named(need.ref);
      const repeat = seen.has(need.ref) && directNeeds(need.ref).length > 0;
      lines.push(
        <div key={lines.length}>
          {prefix}
          {last ? "└─ " : "├─ "}
          {item ? (
            <button
              type="button"
              onClick={() => onGo(need.ref)}
              className="text-foreground focus-visible:ring-ring cursor-pointer rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2"
            >
              {label}
            </button>
          ) : (
            label
          )}
          {repeat ? "  (above)" : null}
        </div>,
      );
      if (!repeat && depth < 8) {
        seen.add(need.ref);
        walk(need.ref, prefix + (last ? "   " : "│  "), depth + 1);
      }
    });
  };
  walk(id, "", 0);
  return (
    <pre className="border-foreground/10 text-muted-foreground overflow-x-auto rounded-(--library-thumb) border p-3 font-mono text-xs leading-5 [font-variant-ligatures:none]">
      <div className="text-foreground">{name}</div>
      {lines}
    </pre>
  );
}

/**
 * Everything the library knows about an item beyond its description: where it
 * stands, every way to get it, its links, what it needs and what needs it, and
 * what it writes into a project. `onGo` opens another library item.
 */
export function LibraryFacts({
  id,
  name,
  command,
  prompt,
  docs,
  page,
  onGo,
}: {
  /** The id the item's facts are kept under. */
  id: string;
  name: string;
  command: string | undefined;
  prompt: string;
  /** The item's docs page, for an item with no links of its own. */
  docs: string;
  /** The item's own page on the site, when that is not its docs page. */
  page: string | undefined;
  onGo: (factId: string) => void;
}) {
  const fact = libraryFact(id);
  const commands = libraryCommands({ command, prompt, fact });
  const needs = fact?.needs ?? [];
  const usedBy = directUsedBy(id);
  const links = fact?.links ?? [];

  return (
    <>
      {fact ? (
        <RowGroup title="About">
          <GroupRow
            label="Status"
            value={
              <>
                <span className="truncate" title={fact.statusDetail}>
                  {fact.statusDetail}
                </span>
                <LibraryAvailabilityMark
                  status={fact.status}
                  className="text-foreground shrink-0"
                />
              </>
            }
          />
          <GroupRow label="Platform" value={fact.platforms.join(", ")} />
          {fact.version ? (
            <GroupRow
              label="Version"
              value={<span className="font-mono text-xs">{fact.version}</span>}
            />
          ) : null}
          {fact.updated ? (
            <GroupRow
              label="Last updated"
              value={
                <time dateTime={fact.updated}>
                  {formatLibraryDay(fact.updated)}
                </time>
              }
            />
          ) : null}
          {fact.directory ? (
            <GroupRow
              label="Skills folder"
              value={
                <span className="font-mono text-xs">{fact.directory}</span>
              }
            />
          ) : null}
          {fact.config ? (
            <GroupRow
              label="Writes to"
              value={
                <span className="truncate font-mono text-xs">
                  {fact.config}
                </span>
              }
            />
          ) : null}
        </RowGroup>
      ) : null}
      <RowGroup
        title="Commands"
        aside={<span className="tabular-nums">{commands.length}</span>}
      >
        {commands.map((entry) => (
          <GroupRow
            key={entry.command}
            label={entry.label}
            value={
              <span
                title={entry.command}
                className="truncate font-mono text-xs [font-variant-ligatures:none]"
              >
                {entry.command}
              </span>
            }
            action={
              <LibraryCopyButton
                text={entry.command}
                label={`Copy: ${entry.label}`}
                className="-me-1.5"
              />
            }
          />
        ))}
      </RowGroup>
      <RowGroup
        title="Links"
        aside={<span className="tabular-nums">{links.length || 1}</span>}
      >
        {links.length > 0 ? (
          links.map((link) => (
            <SheetLinkRow
              key={`${link.kind}:${link.href}`}
              icon={LINK_ICON[link.kind] ?? <LinkIcon aria-hidden />}
              label={link.label ?? LIBRARY_LINK_LABEL[link.kind]}
              href={link.href}
              text={link.href
                .replace(/^https:\/\//, "")
                .replace(
                  /^github\.com\/assistant-ui\/assistant-ui\/(tree|blob)\/main\//,
                  "",
                )}
              tooltip={`Open ${LIBRARY_LINK_LABEL[link.kind].toLowerCase()}`}
            />
          ))
        ) : (
          <SheetLinkRow
            icon={<BookOpenIcon aria-hidden />}
            label="Docs"
            href={docs}
            tooltip="Open the docs"
          />
        )}
        {page ? (
          <SheetLinkRow
            icon={<AppWindowIcon aria-hidden />}
            label="Page"
            href={page}
            tooltip="Open its page"
          />
        ) : null}
      </RowGroup>
      {needs.length > 0 ? (
        <RowGroup title="Needs" aside={count(needs.length, totalNeeds(id))}>
          <Capped>
            {needs.map((need) => (
              <RelatedRow
                key={need.ref}
                to={need.ref}
                via={need.via}
                onGo={onGo}
              />
            ))}
          </Capped>
        </RowGroup>
      ) : null}
      {usedBy.length > 0 ? (
        <RowGroup title="Used by" aside={count(usedBy.length, totalUsedBy(id))}>
          <Capped>
            {usedBy.map((ref) => (
              <RelatedRow key={ref} to={ref} onGo={onGo} />
            ))}
          </Capped>
        </RowGroup>
      ) : null}
      {needs.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="text-muted-foreground flex items-baseline justify-between gap-4 text-sm">
            <div className="text-foreground">Install tree</div>
            <span className="tabular-nums">{totalNeeds(id) + 1} items</span>
          </div>
          <InstallTree id={id} name={name} onGo={onGo} />
        </section>
      ) : null}
      {fact && fact.packages.length > 0 ? (
        <RowGroup
          title="npm packages"
          aside={<span className="tabular-nums">{fact.packages.length}</span>}
        >
          <Capped>
            {fact.packages.map((entry) => (
              <SheetLinkRow
                key={`${entry.name}:${entry.tag}`}
                icon={<PackageIcon aria-hidden />}
                label={entry.name}
                href={`https://www.npmjs.com/package/${entry.name}`}
                text={entry.tag ?? "dependency"}
                tooltip="Open on npm"
              />
            ))}
          </Capped>
        </RowGroup>
      ) : null}
      {fact && fact.files.length > 0 ? (
        <RowGroup
          title="Files"
          aside={<span className="tabular-nums">{fact.files.length}</span>}
        >
          {fact.files.map((file) =>
            file.source ? (
              <SheetLinkRow
                key={file.path}
                icon={<CodeIcon aria-hidden />}
                label={file.path}
                href={`${REPOSITORY}${file.source}`}
                text=""
                tooltip="Open its source"
              />
            ) : (
              <GroupRow
                key={file.path}
                icon={<CodeIcon aria-hidden />}
                label={file.path}
                mono
              />
            ),
          )}
        </RowGroup>
      ) : null}
    </>
  );
}
