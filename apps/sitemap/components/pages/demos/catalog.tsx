"use client";

import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, SearchIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { DemoWindow } from "@/components/pages/demos/demo-window";
import { InstallButton } from "@/components/shared/install-button";
import { LIFT_SHADOW } from "@/components/shared/demo-frame";
import { cn } from "@/lib/utils";

export const DEMO_KINDS = ["Feature", "Clone", "Block", "Platform"] as const;
export type DemoKind = (typeof DEMO_KINDS)[number];

/** One demo on the page: its live preview, and its file when it has one. */
export type CatalogDemo = {
  id: string;
  title: string;
  kind: DemoKind;
  tags: readonly string[];
  description: string;
  preview: ReactNode;
  /** The demo's one file, highlighted, for the Code tab. */
  file?: { name: string; html: string };
  /** What starts a project from it. */
  start?: string;
  docs: { href: string; label: string };
  /** Opens the demo on its own page. */
  full?: string;
};

const KIND_PLURAL: Record<DemoKind | "All", string> = {
  All: "All",
  Feature: "Features",
  Clone: "Clones",
  Block: "Blocks",
  Platform: "Platforms",
};

function useCatalog(demos: readonly CatalogDemo[]) {
  const [kind, setKind] = useState<DemoKind | "All">("All");
  const [tags, setTags] = useState<readonly string[]>([]);
  const [query, setQuery] = useState("");
  const allTags = useMemo(
    () => [...new Set(demos.flatMap((demo) => demo.tags))].sort(),
    [demos],
  );
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return demos.filter(
      (demo) =>
        (kind === "All" || demo.kind === kind) &&
        tags.every((tag) => demo.tags.includes(tag)) &&
        (!needle ||
          `${demo.title} ${demo.description} ${demo.tags.join(" ")}`
            .toLowerCase()
            .includes(needle)),
    );
  }, [demos, kind, tags, query]);
  const toggleTag = (tag: string) =>
    setTags((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag],
    );
  return { kind, setKind, tags, toggleTag, allTags, query, setQuery, shown };
}

type Catalog = ReturnType<typeof useCatalog>;

function Filters({
  catalog,
  demos,
  className,
}: {
  catalog: Catalog;
  demos: readonly CatalogDemo[];
  className?: string;
}) {
  const count = (kind: DemoKind | "All") =>
    kind === "All"
      ? demos.length
      : demos.filter((demo) => demo.kind === kind).length;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-control focus-within:ring-ring flex h-9 items-center gap-2 px-3 focus-within:ring-2">
        <SearchIcon aria-hidden className="text-muted-foreground size-4" />
        <input
          value={catalog.query}
          onChange={(event) => catalog.setQuery(event.target.value)}
          placeholder="Search demos"
          aria-label="Search demos"
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <div role="radiogroup" aria-label="Kind" className="flex flex-wrap gap-1">
        {(["All", ...DEMO_KINDS] as const).map((kind) => {
          const active = catalog.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => catalog.setKind(kind)}
              className={cn(
                "focus-visible:ring-ring rounded-md px-2.5 py-1 text-[13px] transition-colors outline-none focus-visible:ring-2",
                active
                  ? "bg-foreground/[0.07] text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {KIND_PLURAL[kind]}
              <span className="text-muted-foreground ms-1.5 tabular-nums">
                {count(kind)}
              </span>
            </button>
          );
        })}
      </div>
      <div aria-label="Features" className="flex flex-wrap gap-1.5">
        {catalog.allTags.map((tag) => {
          const active = catalog.tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => catalog.toggleTag(tag)}
              className={cn(
                "focus-visible:ring-ring rounded-md border px-2 py-0.5 text-xs transition-colors outline-none focus-visible:ring-2",
                active
                  ? "border-foreground/40 text-foreground"
                  : "border-foreground/10 text-muted-foreground hover:text-foreground",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-muted-foreground py-8 text-sm">
      No demos match these filters.
    </p>
  );
}

/** The selected demo: DemoWindow when it has a file, a live frame otherwise, then its start command and links. */
function Viewer({ demo, tall }: { demo: CatalogDemo; tall?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {demo.file ? (
        <DemoWindow
          key={demo.id}
          name={demo.file.name}
          html={demo.file.html}
          preview={demo.preview}
        />
      ) : (
        <div
          key={demo.id}
          className={cn(
            "border-foreground/10 rounded-document bg-background overflow-hidden border",
            tall ? "h-[min(44rem,80svh)]" : "h-[36rem]",
          )}
          style={LIFT_SHADOW}
        >
          {demo.preview}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        {demo.start ? <InstallButton command={demo.start} /> : <span />}
        <span className="flex items-center gap-4 text-[13px]">
          {demo.full ? (
            <a
              href={demo.full}
              target="_blank"
              rel="noreferrer"
              className="group/link text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              Full screen
              <ArrowUpRightIcon
                aria-hidden
                className="size-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none"
              />
            </a>
          ) : null}
          <Link
            href={demo.docs.href}
            className="group/link text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            {demo.docs.label}
            <ArrowRightIcon
              aria-hidden
              className="size-3.5 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </span>
      </div>
    </div>
  );
}

function Meta({ demo }: { demo: CatalogDemo }) {
  return (
    <span className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
      <span>{demo.kind}</span>
      {demo.tags.map((tag) => (
        <span key={tag}>· {tag}</span>
      ))}
    </span>
  );
}

/** A filterable list on the left, the selected demo live on the right. */
export function CatalogBrowser({ demos }: { demos: readonly CatalogDemo[] }) {
  const catalog = useCatalog(demos);
  const [id, setId] = useState(demos[0]?.id);
  const selected =
    catalog.shown.find((demo) => demo.id === id) ?? catalog.shown[0];

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-12">
      <div className="flex flex-col gap-6">
        <Filters catalog={catalog} demos={demos} />
        {catalog.shown.length === 0 ? (
          <Empty />
        ) : (
          <ul className="-mx-2 flex flex-col gap-0.5">
            {catalog.shown.map((demo) => {
              const active = demo.id === selected?.id;
              return (
                <li key={demo.id}>
                  <button
                    type="button"
                    aria-current={active || undefined}
                    onClick={() => setId(demo.id)}
                    className={cn(
                      "focus-visible:ring-ring flex w-full flex-col gap-0.5 rounded-md px-2 py-2.5 text-start transition-colors outline-none focus-visible:ring-2",
                      active
                        ? "bg-foreground/[0.05]"
                        : "hover:bg-foreground/[0.025]",
                    )}
                  >
                    <span className="text-sm font-medium">{demo.title}</span>
                    <span className="text-muted-foreground line-clamp-1 text-[13px]">
                      {demo.description}
                    </span>
                    <Meta demo={demo} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="min-w-0 lg:sticky lg:top-20">
        {selected ? <Viewer demo={selected} /> : null}
      </div>
    </div>
  );
}
