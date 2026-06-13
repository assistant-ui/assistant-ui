"use client";

import { useState } from "react";
import { ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { NumberRoll } from "@/components/assistant-ui/number-roll";

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
    <div className="bg-background flex flex-col gap-3 p-6">
      <ArrowUpRight className="text-muted-foreground size-4" />
      <div className="text-3xl font-medium tracking-tight tabular-nums md:text-4xl">
        {current.value > 0 ? (
          <NumberRoll
            value={current.value}
            locales="en-US"
            format={{ notation: "compact", maximumFractionDigits: 1 }}
          />
        ) : (
          "—"
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">Weekly downloads</span>
        <button
          type="button"
          onClick={() => setShowTotal((v) => !v)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-fit cursor-pointer items-center gap-1 rounded-sm text-left text-xs transition-colors outline-none focus-visible:ring-2"
          aria-label="Toggle between flagship package and ecosystem total"
        >
          <span>{current.caption}</span>
          <ArrowLeftRight className="size-3 opacity-60" />
        </button>
      </div>
    </div>
  );
}
