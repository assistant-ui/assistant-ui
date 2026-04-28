"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReleaseGroup, PackageRelease } from "@/lib/releases";
import {
  groupByType,
  parseRelease,
  TYPE_LABELS,
  type ChangeType,
  type ParsedBullet,
} from "@/lib/changelog-parse";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const COLLAPSE_BODY_THRESHOLD = 240;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractChangeType(
  markdown: string,
): "major" | "minor" | "patch" | null {
  const match = markdown.match(/^#{1,6}\s+(Major|Minor|Patch)\s+Changes/im);
  if (!match) return null;
  return match[1]!.toLowerCase() as "major" | "minor" | "patch";
}

const semverBadge = {
  major: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  minor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  patch: "bg-muted text-muted-foreground",
} as const;

const TYPE_BADGE: Record<ChangeType, string> = {
  breaking: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400",
  feat: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  fix: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-400",
  perf: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  refactor:
    "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-400",
  revert: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  docs: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  style: "bg-pink-500/10 text-pink-700 ring-pink-500/20 dark:text-pink-400",
  test: "bg-teal-500/10 text-teal-700 ring-teal-500/20 dark:text-teal-400",
  build:
    "bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-400",
  ci: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/20 dark:text-cyan-400",
  chore: "bg-muted text-muted-foreground ring-border",
  other: "bg-muted text-muted-foreground ring-border",
};

const TYPE_SHORT_LABEL: Record<ChangeType, string> = {
  breaking: "BREAKING",
  feat: "feat",
  fix: "fix",
  perf: "perf",
  refactor: "refactor",
  revert: "revert",
  docs: "docs",
  style: "style",
  test: "test",
  build: "build",
  ci: "ci",
  chore: "chore",
  other: "misc",
};

function TypeBadge({
  type,
  scope,
}: {
  type: ChangeType;
  scope?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1 rounded-md px-1.5 py-0.5 font-medium font-mono text-[10px] uppercase leading-none tracking-wide ring-1 ring-inset",
        TYPE_BADGE[type],
      )}
    >
      <span>{TYPE_SHORT_LABEL[type]}</span>
      {scope ? (
        <span className="font-normal normal-case opacity-70">· {scope}</span>
      ) : null}
    </span>
  );
}

const inlineMarkdownComponents: Components = {
  p: ({ children }) => <>{children}</>,
  code: ({ children }) => (
    <code className="rounded bg-foreground/[0.07] px-1 py-0.5 font-mono text-[0.85em] text-foreground ring-1 ring-foreground/10">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground/90 underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground"
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
        className="font-mono transition-colors hover:text-foreground"
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
        className="font-mono transition-colors hover:text-foreground"
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
        className="transition-colors hover:text-foreground"
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
        <span key={`sep-${i}`} className="select-none opacity-40">
          ·
        </span>,
      );
    }
    interleaved.push(node);
  });
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground/80 text-xs">
      {interleaved}
    </div>
  );
}

function BulletItem({ item }: { item: ParsedBullet }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = item.body.length > 0;
  const isLong = hasBody && item.body.length > COLLAPSE_BODY_THRESHOLD;
  const showFull = expanded || !isLong;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <TypeBadge type={item.type} scope={item.scope} />
        <span className="text-foreground text-sm leading-relaxed">
          <ReactMarkdown components={inlineMarkdownComponents}>
            {item.description || "(no description)"}
          </ReactMarkdown>
        </span>
      </div>
      <MetaLine item={item} />
      {hasBody ? (
        <div className="text-muted-foreground text-sm">
          <div className={cn(!showFull && "line-clamp-2")}>
            <ReactMarkdown components={bodyMarkdownComponents}>
              {item.body}
            </ReactMarkdown>
          </div>
          {isLong ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-muted-foreground/70 text-xs transition-colors hover:text-foreground"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}
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
      <div className="flex items-baseline gap-2 border-border/60 border-b pb-1.5">
        <h4 className="font-medium text-foreground/70 text-xs uppercase tracking-wide">
          {TYPE_LABELS[type]}
        </h4>
        <span className="text-muted-foreground text-xs tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <BulletItem key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function ReleaseEntry({ release }: { release: PackageRelease }) {
  const semver = extractChangeType(release.body);
  const parsed = useMemo(() => parseRelease(release.body), [release.body]);
  const groups = useMemo(() => groupByType(parsed.bullets), [parsed.bullets]);

  return (
    <details className="group/release">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/release:rotate-90" />
        <span className="font-medium font-mono text-foreground/80 text-sm transition-colors group-hover/release:text-foreground">
          {release.pkg}@{release.version}
        </span>
        {semver && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 font-medium text-[10px] leading-none ${semverBadge[semver]}`}
          >
            {semver}
          </span>
        )}
        <Link
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-auto shrink-0 text-muted-foreground text-xs transition-colors hover:text-foreground"
        >
          GitHub →
        </Link>
      </summary>
      <div className="mt-3 ml-[1.375rem] flex flex-col gap-6 pb-2">
        {parsed.preamble ? (
          <div className="text-muted-foreground text-sm">
            <ReactMarkdown components={bodyMarkdownComponents}>
              {parsed.preamble}
            </ReactMarkdown>
          </div>
        ) : null}
        {groups.map(({ type, items }) => (
          <TypeGroup key={type} type={type} items={items} />
        ))}
        {groups.length === 0 && !parsed.preamble ? (
          <p className="text-muted-foreground text-sm">No notes.</p>
        ) : null}
      </div>
    </details>
  );
}

function DateSection({ group }: { group: ReleaseGroup }) {
  return (
    <section>
      <h2 className="font-medium text-lg tracking-tight">
        {formatDate(group.date)}
      </h2>
      <p className="mt-1 text-muted-foreground text-sm">
        {group.releases.length}{" "}
        {group.releases.length === 1 ? "package" : "packages"}
      </p>

      <div className="mt-4 space-y-1">
        {group.releases.map((r) => (
          <ReleaseEntry key={`${r.pkg}@${r.version}`} release={r} />
        ))}
      </div>
    </section>
  );
}

export function ChangelogList({ groups }: { groups: ReleaseGroup[] }) {
  const [count, setCount] = useState(PAGE_SIZE);

  const visible = groups.slice(0, count);
  const remaining = groups.length - count;

  return (
    <>
      <div className="space-y-10">
        {visible.map((group) => (
          <DateSection key={group.date} group={group} />
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setCount((c) => c + PAGE_SIZE)}
          >
            Load more ({remaining})
          </Button>
        </div>
      )}
    </>
  );
}
