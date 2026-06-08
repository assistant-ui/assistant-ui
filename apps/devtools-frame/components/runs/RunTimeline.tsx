import clsx from "clsx";
import { useMemo } from "react";
import { formatClockTime } from "../common";
import { SummaryItem } from "../ui";
import { groupRuns } from "./parse";
import type { RunEventEntry, RunLogEntry, RunPreview } from "./types";

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
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
  };

const formatMs = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;

const clampPercent = (offset: number, span: number) =>
  span > 0 ? Math.min(100, Math.max(0, (offset / span) * 100)) : 0;

const EventRow = ({ entry }: { entry: RunEventEntry }) => {
  const tone = toneFor(entry.scope);
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className="w-14 shrink-0 text-right font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
        +{formatMs(entry.offsetMs)}
      </span>
      <span className={clsx("shrink-0 text-[10px] font-semibold", tone.text)}>
        {entry.scope}
      </span>
      <span className="truncate text-[11px] text-zinc-700 dark:text-zinc-200">
        {entry.event.slice(entry.scope.length + 1) || entry.event}
      </span>
    </div>
  );
};

const RunCard = ({ run }: { run: RunPreview }) => (
  <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">
        Run #{run.index}
      </span>
      <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
        {formatClockTime(run.startTime)}
      </span>
      {run.running ? (
        <span className="rounded border border-blue-300 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700 uppercase dark:border-blue-500/40 dark:text-blue-300">
          running
        </span>
      ) : (
        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {formatMs(run.durationMs ?? 0)}
        </span>
      )}
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
        {run.events.length} event{run.events.length === 1 ? "" : "s"}
      </span>
      {run.threadId ? (
        <span className="ml-auto truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          {run.threadId}
        </span>
      ) : null}
    </div>

    <div className="px-3 pt-3">
      <div className="relative h-5 rounded bg-zinc-100 dark:bg-zinc-900">
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

    <div className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-900">
      {run.events.map((entry, index) => (
        <EventRow key={index} entry={entry} />
      ))}
    </div>
  </div>
);

export const RunTimeline = ({ logs }: { logs: readonly RunLogEntry[] }) => {
  const { runs, orphans } = useMemo(() => groupRuns(logs), [logs]);

  if (runs.length === 0 && orphans.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No runs recorded yet. Send a message to start one.
        </div>
      </div>
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
        <div className="overflow-hidden rounded-md border border-dashed border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900/30">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Outside runs ({orphans.length})
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {orphans.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 text-[11px]"
              >
                <span className="w-20 shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
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
                <span className="truncate text-zinc-700 dark:text-zinc-200">
                  {entry.event}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
