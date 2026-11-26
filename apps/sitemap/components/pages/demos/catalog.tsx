"use client";

import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, SearchIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  DemoWindow,
  type DemoFile,
} from "@/components/pages/demos/demo-window";
import { InstallButton } from "@/components/shared/install-button";
import { LIFT_SHADOW } from "@/components/shared/demo-frame";
import { typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";

export const DEMO_KINDS = ["Feature", "Clone", "Block", "Platform"] as const;
export type DemoKind = (typeof DEMO_KINDS)[number];

/** One demo on the page: its live preview, and its files when it has them. */
export type CatalogDemo = {
  id: string;
  title: string;
  kind: DemoKind;
  tags: readonly string[];
  description: string;
  preview: ReactNode;
  /** The demo's files, highlighted, for the Code tab; the first opens first. */
  files?: readonly [DemoFile, ...DemoFile[]];
  /** What starts a project from it. */
  start?: string;
  docs: { href: string; label: string };
  /** Opens the demo on its own page. */
  full?: string;
};

const linkClass =
  "group/link text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors";
const nudge =
  "size-3.5 transition-transform motion-reduce:transition-none group-hover/link:translate-x-0.5";

/** One demo: its title and line with its links, then the demo itself, live. */
function DemoBlock({ demo }: { demo: CatalogDemo }) {
  const headingId = `demo-${demo.id}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className={typeSection}>
            {demo.title}
          </h2>
          <p className="text-muted-foreground max-w-[60ch] text-sm">
            {demo.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          {demo.start ? <InstallButton command={demo.start} /> : null}
          {demo.full ? (
            <a
              href={demo.full}
              target="_blank"
              rel="noreferrer"
              className={linkClass}
            >
              Open in a new tab
              <ArrowUpRightIcon
                aria-hidden
                className={cn(nudge, "group-hover/link:-translate-y-0.5")}
              />
            </a>
          ) : null}
          <Link href={demo.docs.href} className={linkClass}>
            {demo.docs.label}
            <ArrowRightIcon aria-hidden className={nudge} />
          </Link>
        </div>
      </div>
      {demo.files ? (
        <DemoWindow files={demo.files} preview={demo.preview} />
      ) : (
        <div
          className="border-foreground/10 rounded-document bg-background h-[36rem] overflow-hidden border"
          style={LIFT_SHADOW}
        >
          {demo.preview}
        </div>
      )}
    </section>
  );
}

/** A search over the demos, then every demo that matches as a live block. */
export function CatalogBrowser({ demos }: { demos: readonly CatalogDemo[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return demos;
    return demos.filter((demo) =>
      `${demo.title} ${demo.kind} ${demo.description} ${demo.tags.join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
  }, [demos, query]);

  return (
    <div className="flex flex-col gap-12">
      <label className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-control focus-within:ring-ring flex h-10 max-w-md items-center gap-2 px-3 focus-within:ring-2">
        <SearchIcon aria-hidden className="text-muted-foreground size-4" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search demos"
          aria-label="Search demos"
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No demo matches “{query.trim()}”.
        </p>
      ) : (
        <div className="flex flex-col gap-20">
          {shown.map((demo) => (
            <DemoBlock key={demo.id} demo={demo} />
          ))}
        </div>
      )}
    </div>
  );
}
