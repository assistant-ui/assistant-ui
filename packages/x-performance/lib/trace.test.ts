import { describe, expect, it } from "vitest";
import { analyzeTrace } from "./trace.mjs";

const PID = 42;
const MAIN = 1;
const COMPOSITOR = 2;

const meta = [
  { name: "aui-perf-target", pid: PID, tid: MAIN, ph: "R", ts: 1_000_000 },
  {
    name: "thread_name",
    pid: PID,
    tid: MAIN,
    ph: "M",
    args: { name: "CrRendererMain" },
  },
  {
    name: "thread_name",
    pid: PID,
    tid: COMPOSITOR,
    ph: "M",
    args: { name: "Compositor" },
  },
];

describe("analyzeTrace", () => {
  it("attributes counts and thread busy time to the marked process only", () => {
    const events = [
      ...meta,
      { name: "Paint", pid: PID, tid: MAIN, ph: "X", ts: 1_000_000, dur: 10 },
      {
        name: "PaintImage",
        pid: PID,
        tid: MAIN,
        ph: "X",
        ts: 1_100_000,
        dur: 50,
      },
      {
        name: "PaintImage",
        pid: 999,
        tid: MAIN,
        ph: "X",
        ts: 1_100_000,
        dur: 50,
      },
      { name: "Commit", pid: PID, tid: MAIN, ph: "X", ts: 1_200_000, dur: 20 },
      {
        name: "RunTask",
        pid: PID,
        tid: MAIN,
        ph: "X",
        ts: 1_000_000,
        dur: 200_000,
      },
      {
        name: "RunTask",
        pid: PID,
        tid: COMPOSITOR,
        ph: "X",
        ts: 1_000_000,
        dur: 100_000,
      },
      {
        name: "RunTask",
        pid: 999,
        tid: MAIN,
        ph: "X",
        ts: 1_000_000,
        dur: 900_000,
      },
      { name: "anything", pid: 7, tid: 7, ph: "X", ts: 900_000, dur: 0 },
      { name: "anything", pid: 7, tid: 7, ph: "X", ts: 2_900_000, dur: 0 },
    ];
    const s = analyzeTrace(events, "irrelevant-hint");
    expect(s.counts).toEqual({ PaintImage: 1, Commit: 1 });
    expect(s.mainBusyMs).toBe(200);
    expect(s.compositorBusyMs).toBe(100);
    expect(s.wallSeconds).toBe(2);
    expect(s.mainBusyPct).toBe(10);

    const floored = analyzeTrace(events, "irrelevant-hint", 4_000_000);
    expect(floored.wallSeconds).toBe(4);
    expect(floored.mainBusyPct).toBe(5);
  });

  it("counts async PipelineReporter begins once, not begin+end", () => {
    const events = [
      ...meta,
      { name: "PipelineReporter", pid: PID, tid: COMPOSITOR, ph: "b", ts: 1 },
      { name: "PipelineReporter", pid: PID, tid: COMPOSITOR, ph: "e", ts: 2 },
      { name: "PipelineReporter", pid: PID, tid: COMPOSITOR, ph: "b", ts: 3 },
      { name: "PipelineReporter", pid: PID, tid: COMPOSITOR, ph: "e", ts: 4 },
    ];
    expect(analyzeTrace(events, "x").counts).toEqual({ PipelineReporter: 2 });
  });

  it("throws loudly when no marked process exists", () => {
    expect(() => analyzeTrace([], "page.html")).toThrow(
      /could not locate a process/,
    );
  });
});
