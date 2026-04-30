"use client";

import { useState } from "react";
import { ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { formatCompact } from "@/lib/format";

type Mode = { value: number; caption: string };

export function WeeklyDownloadsStat({
  flagship,
  total,
}: {
  flagship: Mode;
  total: Mode;
}) {
  const [showTotal, setShowTotal] = useState(false);
  const current = showTotal ? total : flagship;
  return (
    <div className="flex flex-col gap-3 bg-background p-6">
      <ArrowUpRight className="size-4 text-muted-foreground" />
      <div className="font-medium text-3xl tabular-nums tracking-tight md:text-4xl">
        {current.value > 0 ? formatCompact(current.value) : "—"}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">Weekly downloads</span>
        <button
          type="button"
          onClick={() => setShowTotal((v) => !v)}
          className="flex w-fit cursor-pointer items-center gap-1 rounded-sm text-left text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Toggle between flagship package and ecosystem total"
        >
          <span>{current.caption}</span>
          <ArrowLeftRight className="size-3 opacity-60" />
        </button>
      </div>
    </div>
  );
}
