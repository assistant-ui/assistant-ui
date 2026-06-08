import { eventScope, isRecord } from "../common";
import type {
  RunEventEntry,
  RunGrouping,
  RunLogEntry,
  RunPreview,
} from "./types";

// thread.runStart/runEnd are @deprecated in core but kept for backward
// compatibility; they are the only run-boundary signal in the event log.
const RUN_START = "thread.runStart";
const RUN_END = "thread.runEnd";

const threadIdOf = (data: unknown): string | undefined =>
  isRecord(data) && typeof data.threadId === "string"
    ? data.threadId
    : undefined;

interface RunBuilder {
  id: string;
  threadId?: string;
  index: number;
  startTime: Date;
  endTime?: Date;
  events: RunEventEntry[];
}

const entryFor = (log: RunLogEntry, offsetMs: number): RunEventEntry => ({
  time: log.time,
  event: log.event,
  scope: eventScope(log.event),
  offsetMs: Math.max(0, offsetMs),
  data: log.data,
});

export const groupRuns = (logs: readonly RunLogEntry[]): RunGrouping => {
  const sorted = [...logs].sort((a, b) => a.time.getTime() - b.time.getTime());
  const builders: RunBuilder[] = [];
  const openByThread = new Map<string | undefined, RunBuilder>();
  const orphans: RunEventEntry[] = [];

  const targetRun = (tid: string | undefined): RunBuilder | undefined => {
    const exact = openByThread.get(tid);
    if (exact) return exact;
    if (tid === undefined && openByThread.size === 1) {
      return [...openByThread.values()][0];
    }
    return undefined;
  };

  for (const log of sorted) {
    const tid = threadIdOf(log.data);

    if (log.event === RUN_START) {
      const stale = openByThread.get(tid);
      if (stale) {
        stale.endTime = log.time;
        openByThread.delete(tid);
      }
      const builder: RunBuilder = {
        id: `run-${builders.length}`,
        ...(tid !== undefined ? { threadId: tid } : {}),
        index: builders.length,
        startTime: log.time,
        events: [entryFor(log, 0)],
      };
      builders.push(builder);
      openByThread.set(tid, builder);
      continue;
    }

    if (log.event === RUN_END) {
      const run = targetRun(tid);
      if (run && run.endTime === undefined) {
        run.endTime = log.time;
        run.events.push(
          entryFor(log, log.time.getTime() - run.startTime.getTime()),
        );
        openByThread.delete(run.threadId);
        continue;
      }
      orphans.push(entryFor(log, 0));
      continue;
    }

    const run = targetRun(tid);
    if (run) {
      run.events.push(
        entryFor(log, log.time.getTime() - run.startTime.getTime()),
      );
    } else {
      orphans.push(entryFor(log, 0));
    }
  }

  const runs: RunPreview[] = builders.map((b) => {
    const maxOffset = b.events.reduce((max, e) => Math.max(max, e.offsetMs), 0);
    const durationMs = b.endTime
      ? b.endTime.getTime() - b.startTime.getTime()
      : undefined;
    return {
      id: b.id,
      ...(b.threadId !== undefined ? { threadId: b.threadId } : {}),
      index: b.index,
      startTime: b.startTime,
      ...(b.endTime !== undefined ? { endTime: b.endTime } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      running: b.endTime === undefined,
      spanMs: Math.max(durationMs ?? 0, maxOffset),
      events: b.events,
    };
  });

  return { runs, orphans };
};
