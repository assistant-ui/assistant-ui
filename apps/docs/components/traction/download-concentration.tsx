"use client";

import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ConcentrationSegment = {
  name: string;
  weekly: number;
};

export const TAIL_KEY = "__tail__";

/** Descending weight inside one hue, so the leaders read as a family, not a category scale. */
const SEGMENT_TONES = [
  "bg-amber-500",
  "bg-amber-500/75",
  "bg-amber-500/55",
  "bg-amber-500/40",
];

const TAIL_TONE = "bg-amber-500/15";

export function DownloadConcentration({
  leaders,
  tailCount,
  tailWeekly,
  total,
  hovered,
  onHover,
}: {
  leaders: ConcentrationSegment[];
  tailCount: number;
  tailWeekly: number;
  total: number;
  hovered: string | null;
  onHover: (key: string | null) => void;
}) {
  if (total <= 0 || leaders.length === 0) return null;

  const share = (weekly: number) => (weekly / total) * 100;
  const segments = [
    ...leaders.map((leader, index) => ({
      key: leader.name,
      label: leader.name,
      weekly: leader.weekly,
      tone: SEGMENT_TONES[index] ?? TAIL_TONE,
    })),
    ...(tailCount > 0
      ? [
          {
            key: TAIL_KEY,
            label: `${tailCount} more`,
            weekly: tailWeekly,
            tone: TAIL_TONE,
          },
        ]
      : []),
  ];

  return (
    <div
      className="flex flex-col gap-4"
      onMouseLeave={() => onHover(null)}
      onBlur={() => onHover(null)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-sm font-medium">Share of weekly downloads</h2>
        <p className="text-muted-foreground text-xs tabular-nums">
          {formatCompact(total)} / week across {leaders.length + tailCount}{" "}
          packages
        </p>
      </div>

      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((segment) => (
          <button
            key={segment.key}
            type="button"
            onMouseEnter={() => onHover(segment.key)}
            onFocus={() => onHover(segment.key)}
            aria-label={`${segment.label}, ${Math.round(share(segment.weekly))}% of weekly downloads`}
            className={cn(
              "cursor-pointer transition-opacity duration-150",
              segment.tone,
              hovered !== null && hovered !== segment.key && "opacity-25",
            )}
            style={{ width: `${share(segment.weekly)}%` }}
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {segments.map((segment) => (
          <li
            key={segment.key}
            onMouseEnter={() => onHover(segment.key)}
            className={cn(
              "flex cursor-default items-center gap-2 text-xs transition-opacity duration-150",
              hovered !== null && hovered !== segment.key && "opacity-30",
            )}
          >
            <span className={cn("size-1.5 rounded-full", segment.tone)} />
            <span className="font-mono">{segment.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round(share(segment.weekly))}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
