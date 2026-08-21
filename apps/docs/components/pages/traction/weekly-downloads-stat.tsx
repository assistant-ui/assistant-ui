"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { NumberRoll } from "@/components/ui/number-roll";

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
    <div className="flex flex-col">
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
      <div className="mt-2 text-sm">Weekly downloads</div>
      <button
        type="button"
        onClick={() => setShowTotal((v) => !v)}
        className="text-muted-foreground/70 hover:text-foreground focus-visible:ring-ring/50 mt-1 flex w-fit cursor-pointer items-center gap-1 rounded-sm text-left font-mono text-[11px] tracking-wide transition-colors outline-none focus-visible:ring-1"
        aria-label="Toggle between flagship package and ecosystem total"
      >
        <span>{current.caption}</span>
        <ArrowLeftRight className="size-3 opacity-60" />
      </button>
    </div>
  );
}
