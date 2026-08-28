"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/pages/packages/sparkline";
import {
  DownloadConcentration,
  TAIL_KEY,
  type ConcentrationSegment,
} from "@/components/pages/packages/download-concentration";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";

export type DirectoryRow = {
  name: string;
  description: string;
  category: string;
  deprecated: boolean;
  weekly: string | null;
  series: number[];
  momLabel: string | null;
  momTone: "up" | "down" | "flat";
};

export type DirectoryCategory = {
  key: string;
  label: string;
  description: string;
  count: number;
};

const MOM_TONE: Record<DirectoryRow["momTone"], string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  flat: "text-muted-foreground",
};

export function PackageDirectory({
  categories,
  rows,
  concentration,
}: {
  categories: DirectoryCategory[];
  rows: DirectoryRow[];
  concentration: {
    leaders: ConcentrationSegment[];
    tailNames: string[];
    tailCount: number;
    tailWeekly: number;
    total: number;
  };
}) {
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const shown = active
    ? categories.filter((c) => c.key === active)
    : categories;

  // The page owns the leader/tail split; re-deriving it here would let the
  // highlight and the segment it belongs to drift apart.
  const tailNames = new Set(concentration.tailNames);
  const isLit = (name: string) =>
    hovered === TAIL_KEY ? tailNames.has(name) : hovered === name;

  return (
    <div className="flex flex-col gap-12 md:gap-14">
      <section>
        <DownloadConcentration
          {...concentration}
          hovered={hovered}
          onHover={setHovered}
        />
      </section>

      <nav
        aria-label="Filter by category"
        className="bg-background/85 sticky top-12 z-10 -mx-4 px-4 py-3 backdrop-blur"
      >
        <ul className="flex flex-wrap gap-1">
          <li>
            <FilterChip
              active={active === null}
              onClick={() => setActive(null)}
              label="All"
              count={rows.length}
            />
          </li>
          {categories.map((category) => (
            <li key={category.key}>
              <FilterChip
                active={active === category.key}
                onClick={() =>
                  setActive(active === category.key ? null : category.key)
                }
                label={category.label}
                count={category.count}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col">
        {shown.map((category) => (
          <section
            key={category.key}
            className="border-foreground/10 border-b py-8 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12 md:py-10"
          >
            <div className="mb-5 md:mb-0">
              <h2 className={typeEyebrow}>{category.label}</h2>
              <p className="text-muted-foreground/70 mt-2 max-w-[22ch] text-[13px] leading-relaxed">
                {category.description}
              </p>
            </div>
            <div className="-my-2 flex min-w-0 flex-col">
              {rows
                .filter((row) => row.category === category.key)
                .map((row) => (
                  <PackageRow
                    key={row.name}
                    row={row}
                    lit={hovered !== null && isLit(row.name)}
                    dimmed={hovered !== null && !isLit(row.name)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring/50 flex cursor-pointer items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] tracking-wide transition-colors outline-none focus-visible:ring-1",
        active
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "tabular-nums",
          active ? "text-muted-foreground" : "text-muted-foreground/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PackageRow({
  row,
  lit,
  dimmed,
}: {
  row: DirectoryRow;
  lit: boolean;
  dimmed: boolean;
}) {
  return (
    <a
      href={`https://www.npmjs.com/package/${row.name}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group hover:bg-foreground/[0.025] -mx-2 flex flex-col gap-1 px-2 py-2 transition-all duration-150 md:flex-row md:items-baseline md:gap-4",
        lit && "bg-amber-500/10",
        dimmed && "opacity-25",
      )}
    >
      <span className="flex min-w-0 items-center gap-2 md:w-88 md:shrink-0">
        <span className="truncate font-mono text-[13px]">{row.name}</span>
        <ArrowUpRight className="hidden size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50 md:block" />
      </span>

      <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
        {row.description}
      </span>

      {row.deprecated ? (
        <span className="text-muted-foreground/60 shrink-0 font-mono text-[10px] tracking-wide">
          deprecated
        </span>
      ) : null}

      {row.weekly ? (
        <span className="flex shrink-0 items-baseline gap-3 font-mono text-[11px] tracking-wide tabular-nums">
          <span className="text-muted-foreground/70 md:w-20 md:text-right">
            {row.weekly} /wk
          </span>
          <span
            className={cn("md:w-12 md:text-right", MOM_TONE[row.momTone])}
            title="Past 30 days vs prior 30 days"
          >
            {row.momLabel}
          </span>
          <span className="hidden w-16 justify-end md:flex">
            <Sparkline values={row.series} className="text-foreground/40" />
          </span>
        </span>
      ) : null}
    </a>
  );
}
