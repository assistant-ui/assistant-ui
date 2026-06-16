import clsx from "clsx";
import { useMemo } from "react";
import { formatClockTime } from "../common";
import type { EventLogEntry } from "../common";
import { Chip, EmptyState, SectionLabel, SummaryItem, ToneBadge } from "../ui";
import { groupRuns } from "./parse";
import type { RunEventEntry, RunPreview } from "./types";

const SCOPE_TONE: Record<string, { dot: string; text: string }> = {
  thread: {
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-300",
  },
  composer: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  threadListItem: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-300",
  },
};

const toneFor = (scope: string) =>
  SCOPE_TONE[scope] ?? {
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
  };

const formatMs = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;

const clampPercent = (offset: number, span: number) =>
  span > 0 ? Math.min(100, Math.max(0, (offset / span) * 100)) : 0;

const EventRow = ({ entry }: { entry: RunEventEntry }) => {
  const tone = toneFor(entry.scope);
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className="text-muted-foreground w-14 shrink-0 text-right font-mono text-[10px]">
        +{formatMs(entry.offsetMs)}
      </span>
      <span className={clsx("shrink-0 text-[10px] font-semibold", tone.text)}>
        {entry.scope}
      </span>
      <span className="text-foreground truncate text-[11px]">
        {entry.event.slice(entry.scope.length + 1) || entry.event}
      </span>
    </div>
  );
};

const RunCard = ({ run }: { run: RunPreview }) => (
  <div className="bg-card overflow-hidden rounded-lg border">
    <div className="bg-muted flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <span className="text-foreground text-[11px] font-semibold">
        Run #{run.index}
      </span>
      <span className="text-muted-foreground font-mono text-[10px]">
        {formatClockTime(run.startTime)}
      </span>
      {run.endTime === undefined ? (
        <ToneBadge tone="blue">running</ToneBadge>
      ) : (
        <Chip>{formatMs(run.durationMs ?? 0)}</Chip>
      )}
      <span className="text-muted-foreground text-[10px]">
        {run.events.length} event{run.events.length === 1 ? "" : "s"}
      </span>
      {run.threadId ? (
        <span className="text-muted-foreground ml-auto truncate font-mono text-[10px]">
          {run.threadId}
        </span>
      ) : null}
    </div>

    <div className="px-3 pt-3">
      <div className="bg-muted relative h-5 rounded">
        {run.events.map((entry, index) => {
          const tone = toneFor(entry.scope);
          return (
            <span
              key={index}
              title={`${entry.event} +${formatMs(entry.offsetMs)}`}
              className={clsx("absolute top-0 h-full w-0.5 rounded", tone.dot)}
              style={{ left: `${clampPercent(entry.offsetMs, run.spanMs)}%` }}
            />
          );
        })}
      </div>
    </div>

    <div className="divide-border mt-1 divide-y">
      {run.events.map((entry, index) => (
        <EventRow key={index} entry={entry} />
      ))}
    </div>
  </div>
);

export const RunTimeline = ({ logs }: { logs: readonly EventLogEntry[] }) => {
  const { runs, orphans } = useMemo(() => groupRuns(logs), [logs]);

  if (runs.length === 0 && orphans.length === 0) {
    return (
      <EmptyState>
        No runs recorded yet. Send a message to start one.
      </EmptyState>
    );
  }

  const eventCount =
    runs.reduce((sum, run) => sum + run.events.length, 0) + orphans.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <SummaryItem label="Runs" value={String(runs.length)} />
        <SummaryItem label="Events" value={String(eventCount)} />
      </div>

      <div className="flex flex-col gap-2">
        {[...runs].reverse().map((run) => (
          <RunCard key={run.id} run={run} />
        ))}
      </div>

      {orphans.length ? (
        <div className="bg-card overflow-hidden rounded-lg border border-dashed">
          <div className="bg-muted border-b px-3 py-2">
            <SectionLabel>Outside runs ({orphans.length})</SectionLabel>
          </div>
          <div className="divide-border divide-y">
            {orphans.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 text-[11px]"
              >
                <span className="text-muted-foreground w-20 shrink-0 font-mono text-[10px]">
                  {formatClockTime(entry.time)}
                </span>
                <span
                  className={clsx(
                    "shrink-0 text-[10px] font-semibold",
                    toneFor(entry.scope).text,
                  )}
                >
                  {entry.scope}
                </span>
                <span className="text-foreground truncate">{entry.event}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
