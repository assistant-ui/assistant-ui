"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import {
  TYPE_LABELS,
  type ChangeType,
  type ParsedBullet,
} from "@/lib/changelog-parse";
import type { ChangelogDay, ChangelogRelease } from "@/lib/changelog-pages";
import { cn } from "@/lib/utils";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const inlineMarkdownComponents: Components = {
  p: ({ children }) => <>{children}</>,
  code: ({ children }) => (
    <code className="bg-foreground/[0.06] rounded-[0.375rem] px-1 py-px font-mono text-[0.85em]">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground/90 decoration-foreground/30 hover:decoration-foreground underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),
};

const bodyMarkdownComponents: Components = {
  ...inlineMarkdownComponents,
  p: ({ children }) => (
    <p className="mt-2 leading-relaxed first:mt-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 first:mt-0">{children}</ul>
  ),
  li: ({ children }) => <li>{children}</li>,
};

function MetaLine({ item }: { item: ParsedBullet }) {
  const parts: React.ReactNode[] = [];
  if (item.pr) {
    parts.push(
      <a
        key="pr"
        href={item.pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >
        #{item.pr.number}
      </a>,
    );
  }
  if (item.hash) {
    parts.push(
      <a
        key="hash"
        href={item.hash.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >
        {item.hash.value}
      </a>,
    );
  }
  if (item.author) {
    parts.push(
      <a
        key="author"
        href={item.author.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >
        @{item.author.handle}
      </a>,
    );
  }
  if (parts.length === 0) return null;
  const interleaved: React.ReactNode[] = [];
  parts.forEach((node, i) => {
    if (i > 0) {
      interleaved.push(
        <span key={`sep-${i}`} className="opacity-40 select-none">
          ·
        </span>,
      );
    }
    interleaved.push(node);
  });
  return (
    <div className="text-muted-foreground/70 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-xs">
      {interleaved}
    </div>
  );
}

function BulletItem({
  item,
  withScopeColumn,
}: {
  item: ParsedBullet;
  withScopeColumn: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = item.body.length > 0;

  return (
    <div
      className={cn(
        "gap-x-6 gap-y-1.5",
        withScopeColumn && "md:grid md:grid-cols-[7rem_minmax(0,1fr)]",
      )}
    >
      {withScopeColumn ? (
        <span className="text-muted-foreground/70 block truncate pt-px font-mono text-xs leading-relaxed">
          {item.scope ?? ""}
        </span>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <span className="text-foreground text-sm leading-relaxed">
          <ReactMarkdown components={inlineMarkdownComponents}>
            {item.description || "(no description)"}
          </ReactMarkdown>
        </span>
        <MetaLine item={item} />
        {hasBody ? (
          <div className="text-muted-foreground text-sm">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-muted-foreground/70 hover:text-foreground text-xs transition-colors"
            >
              {expanded ? "hide notes" : "show notes"}
            </button>
            {expanded ? (
              <div className="mt-2">
                <ReactMarkdown components={bodyMarkdownComponents}>
                  {item.body}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypeGroup({
  type,
  items,
}: {
  type: ChangeType;
  items: ParsedBullet[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4
        className={cn(
          "text-xs font-medium",
          type === "breaking" ? "text-destructive" : "text-muted-foreground/70",
        )}
      >
        {TYPE_LABELS[type]}
        <span className="ms-2 font-normal tabular-nums opacity-60">
          {items.length}
        </span>
      </h4>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <BulletItem
            key={i}
            item={item}
            withScopeColumn={items.some((entry) => entry.scope)}
          />
        ))}
      </div>
    </div>
  );
}

function ReleaseEntry({ release }: { release: ChangelogRelease }) {
  return (
    <details className="group/release">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground/50 inline-block w-3 shrink-0 font-mono text-[11px] transition-transform group-open/release:rotate-90">
          &gt;
        </span>
        <span className="shrink-0 font-mono text-[13px]">
          <span className="text-foreground/70">{release.pkg}</span>
          <span className="font-medium">@{release.version}</span>
        </span>
        {release.semver === "major" ? (
          <span className="text-destructive shrink-0 text-xs font-medium">
            Major
          </span>
        ) : release.semver === "minor" ? (
          <span className="shrink-0 text-xs font-medium">Minor</span>
        ) : null}
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm group-open/release:opacity-0">
          {release.headline}
        </span>
        {release.count > 0 ? (
          <span className="text-muted-foreground/50 shrink-0 text-xs tabular-nums max-md:hidden">
            {release.count} {release.count === 1 ? "change" : "changes"}
          </span>
        ) : null}
      </summary>
      <div className="mt-3 mb-6 ml-6 flex flex-col gap-6">
        {release.preamble ? (
          <div className="text-muted-foreground text-sm">
            <ReactMarkdown components={bodyMarkdownComponents}>
              {release.preamble}
            </ReactMarkdown>
          </div>
        ) : null}
        {release.groups.map(({ type, items }) => (
          <TypeGroup key={type} type={type} items={items} />
        ))}
        {release.groups.length === 0 && !release.preamble ? (
          <p className="text-muted-foreground text-sm">No notes.</p>
        ) : null}
        <a
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/gh text-muted-foreground/70 hover:text-foreground self-start text-xs transition-colors"
        >
          view on github
          <ArrowUpRight className="ms-1 mb-0.5 inline size-3 opacity-0 transition-opacity group-hover/gh:opacity-70" />
        </a>
      </div>
    </details>
  );
}

function QuietGroup({ releases }: { releases: ChangelogRelease[] }) {
  return (
    <details className="group/quiet">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground/50 inline-block w-3 shrink-0 font-mono text-[11px] transition-transform group-open/quiet:rotate-90">
          &gt;
        </span>
        <span className="text-muted-foreground/70 text-[13px]">
          {releases.length} maintenance{" "}
          {releases.length === 1 ? "release" : "releases"}
        </span>
        <span className="text-muted-foreground/50 min-w-0 flex-1 truncate text-sm">
          dependency updates and chores
        </span>
      </summary>
      <div className="mt-1 mb-4 ml-6 flex flex-col">
        {releases.map((release) => (
          <ReleaseEntry
            key={`${release.pkg}@${release.version}`}
            release={release}
          />
        ))}
      </div>
    </details>
  );
}

function DateSection({ day }: { day: ChangelogDay }) {
  const loud = day.releases.filter((release) => !release.quiet);
  const quiet = day.releases.filter((release) => release.quiet);

  return (
    <section className="border-foreground/10 border-b py-8 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12 md:py-10">
      <div className="mb-5 md:sticky md:top-24 md:mb-0 md:self-start">
        <h2 className="text-[15px] font-medium tracking-tight">
          {formatDate(day.date)}
        </h2>
        <p className="text-muted-foreground/70 mt-1.5 text-xs tabular-nums">
          {day.releases.length}{" "}
          {day.releases.length === 1 ? "release" : "releases"}
        </p>
      </div>

      <div className="-my-2 flex flex-col">
        {loud.map((release) => (
          <ReleaseEntry
            key={`${release.pkg}@${release.version}`}
            release={release}
          />
        ))}
        {quiet.length > 0 ? <QuietGroup releases={quiet} /> : null}
      </div>
    </section>
  );
}

export function ChangelogList({ days }: { days: ChangelogDay[] }) {
  return (
    <div className="border-foreground/10 border-t">
      {days.map((day) => (
        <DateSection key={day.date} day={day} />
      ))}
    </div>
  );
}
