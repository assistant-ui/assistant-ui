"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { NumberRoll } from "@/components/ui/number-roll";

type Mode = { value: number; caption: string };

export function WeeklyDownloadsStat({
  flagship,
  total,
}: {
  flagship: Mode | null;
  total: Mode | null;
}) {
  const [showTotal, setShowTotal] = useState(false);
  const current = (showTotal ? total : flagship) ?? flagship ?? total;
  if (!current) return null;
  const canToggle = flagship !== null && total !== null;
  return (
    <div className="flex flex-col">
      <div className="text-3xl font-medium tracking-tight tabular-nums md:text-4xl">
        <NumberRoll
          value={current.value}
          locales="en-US"
          format={{ notation: "compact", maximumFractionDigits: 1 }}
        />
      </div>
      <div className="mt-2 text-sm">Weekly downloads</div>
      <div className="text-muted-foreground/70 mt-1 font-mono text-[11px] tracking-wide">
        {canToggle ? (
          <button
            type="button"
            onClick={() => setShowTotal((v) => !v)}
            className="hover:text-foreground focus-visible:ring-ring/50 flex w-fit cursor-pointer items-center gap-1 rounded-sm text-left transition-colors outline-none focus-visible:ring-1"
            aria-label="Toggle between flagship package and ecosystem total"
          >
            <span>{current.caption}</span>
            <ArrowLeftRight className="size-3 opacity-60" />
          </button>
        ) : (
          current.caption
        )}
      </div>
    </div>
  );
}
