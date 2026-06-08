import { describe, expect, it } from "vitest";
import { groupRuns } from "./parse";
import type { RunLogEntry } from "./types";

const base = 2_000_000_000_000;
const t = (ms: number) => new Date(base + ms);

describe("groupRuns", () => {
  it("pairs runStart/runEnd and computes durations and offsets", () => {
    const logs: RunLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      {
        time: t(150),
        event: "composer.send",
        data: { threadId: "T1", messageId: "m1" },
      },
      { time: t(900), event: "thread.runEnd", data: { threadId: "T1" } },
    ];

    const { runs, orphans } = groupRuns(logs);
    expect(orphans).toEqual([]);
    expect(runs).toHaveLength(1);
    const run = runs[0]!;
    expect(run.index).toBe(0);
    expect(run.threadId).toBe("T1");
    expect(run.running).toBe(false);
    expect(run.durationMs).toBe(900);
    expect(run.spanMs).toBe(900);
    expect(run.events.map((e) => e.offsetMs)).toEqual([0, 150, 900]);
    expect(run.events.map((e) => e.scope)).toEqual([
      "thread",
      "composer",
      "thread",
    ]);
  });

  it("marks a run with no runEnd as running, with span from last event", () => {
    const logs: RunLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(100), event: "composer.send", data: { threadId: "T1" } },
    ];
    const { runs } = groupRuns(logs);
    expect(runs[0]!.running).toBe(true);
    expect(runs[0]!.durationMs).toBeUndefined();
    expect(runs[0]!.spanMs).toBe(100);
  });

  it("buckets events outside any run as orphans", () => {
    const logs: RunLogEntry[] = [
      {
        time: t(0),
        event: "thread.modelContextUpdate",
        data: { threadId: "T1" },
      },
      { time: t(50), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(200), event: "thread.runEnd", data: { threadId: "T1" } },
    ];
    const { runs, orphans } = groupRuns(logs);
    expect(runs).toHaveLength(1);
    expect(orphans).toHaveLength(1);
    expect(orphans[0]!.event).toBe("thread.modelContextUpdate");
  });

  it("sorts out-of-order logs before pairing", () => {
    const logs: RunLogEntry[] = [
      { time: t(100), event: "thread.runEnd", data: { threadId: "T1" } },
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
    ];
    const { runs, orphans } = groupRuns(logs);
    expect(orphans).toEqual([]);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.durationMs).toBe(100);
  });

  it("routes events to the matching thread when runs interleave", () => {
    const logs: RunLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(50), event: "thread.runStart", data: { threadId: "T2" } },
      { time: t(60), event: "composer.send", data: { threadId: "T2" } },
      { time: t(100), event: "thread.runEnd", data: { threadId: "T2" } },
      { time: t(200), event: "thread.runEnd", data: { threadId: "T1" } },
    ];
    const { runs } = groupRuns(logs);
    expect(runs).toHaveLength(2);
    const t2 = runs.find((r) => r.threadId === "T2")!;
    expect(t2.events.map((e) => e.event)).toEqual([
      "thread.runStart",
      "composer.send",
      "thread.runEnd",
    ]);
    expect(runs.find((r) => r.threadId === "T1")!.durationMs).toBe(200);
  });

  it("closes a prior open run on the same thread when a new run starts", () => {
    const logs: RunLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(50), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(100), event: "thread.runEnd", data: { threadId: "T1" } },
    ];
    const { runs } = groupRuns(logs);
    expect(runs).toHaveLength(2);
    expect(runs[0]!.running).toBe(false);
    expect(runs[0]!.durationMs).toBe(50);
    expect(runs[1]!.running).toBe(false);
    expect(runs[1]!.durationMs).toBe(50);
  });

  it("orphans an event whose explicit threadId matches no open run", () => {
    const logs: RunLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(50), event: "composer.send", data: { threadId: "T2" } },
      { time: t(100), event: "thread.runEnd", data: { threadId: "T1" } },
    ];
    const { runs, orphans } = groupRuns(logs);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.events.map((e) => e.event)).toEqual([
      "thread.runStart",
      "thread.runEnd",
    ]);
    expect(orphans.map((o) => o.event)).toEqual(["composer.send"]);
  });

  it("attaches a thread-less event to the single open run", () => {
    const logs: RunLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "T1" } },
      { time: t(50), event: "custom.event", data: {} },
      { time: t(100), event: "thread.runEnd", data: { threadId: "T1" } },
    ];
    const { runs, orphans } = groupRuns(logs);
    expect(orphans).toEqual([]);
    expect(runs[0]!.events.map((e) => e.event)).toContain("custom.event");
  });

  it("keeps an empty-string threadId distinct from a thread-less run", () => {
    const logs: RunLogEntry[] = [
      { time: t(0), event: "thread.runStart", data: { threadId: "" } },
      { time: t(50), event: "thread.runStart", data: {} },
      { time: t(100), event: "thread.runEnd", data: { threadId: "" } },
    ];
    const { runs } = groupRuns(logs);
    expect(runs).toHaveLength(2);
    expect(runs[0]!.threadId).toBe("");
    expect(runs[0]!.running).toBe(false);
    expect(runs[0]!.durationMs).toBe(100);
    expect(runs[1]!.threadId).toBeUndefined();
    expect(runs[1]!.running).toBe(true);
  });

  it("returns nothing for an empty log", () => {
    expect(groupRuns([])).toEqual({ runs: [], orphans: [] });
  });
});
