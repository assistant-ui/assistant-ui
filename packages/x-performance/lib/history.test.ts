import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendHistory,
  readHistory,
  renderHistory,
  type HistoryRecording,
} from "./history.mjs";

let dir: string;

const record = (
  sha: string,
  benchmarks: Pick<
    HistoryRecording["benchmarks"][number],
    "id" | "mean" | "rme"
  >[],
): HistoryRecording => ({
  env: {
    date: "2026-09-02T04:00:00.000Z",
    cpu: "AMD EPYC",
    cores: 8,
    arch: "x64",
    platform: "linux",
    node: "v24.0.0",
    sha,
    dirty: false,
    runs: 4,
    estimator: "median",
  },
  benchmarks: benchmarks.map((benchmark) => ({
    ...benchmark,
    name: benchmark.id,
    hz: 1,
    p99: benchmark.mean,
    samples: [],
  })),
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "aui-perf-history-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("appendHistory", () => {
  it("writes a stamped point with sorted rows", async () => {
    const now = new Date("2026-09-02T04:05:06.789Z");
    const path = appendHistory({
      dir,
      now,
      recording: record("deadbeef", [
        { id: "bench/z.bench.ts > group > z", mean: 2, rme: 3 },
        { id: "bench/a.bench.ts > group > a", mean: 1, rme: 2 },
      ]),
    });

    expect(path).toBe(join(dir, "2026-09-02T040506Z-deadbeef.json"));
    await expect(readFile(path, "utf8")).resolves.toBe(
      `${JSON.stringify(
        {
          schema: "aui-perf/history@1",
          date: "2026-09-02T04:05:06.789Z",
          sha: "deadbeef",
          env: {
            cpu: "AMD EPYC",
            cores: 8,
            arch: "x64",
            platform: "linux",
            node: "v24.0.0",
            runs: 4,
            estimator: "median",
          },
          rows: [
            { id: "bench/a.bench.ts > group > a", mean: 1, rme: 2 },
            { id: "bench/z.bench.ts > group > z", mean: 2, rme: 3 },
          ],
        },
        null,
        2,
      )}\n`,
    );
  });
});

describe("renderHistory", () => {
  it("compares the nearest seven and thirty day points and windows its range", () => {
    const now = new Date("2026-09-02T04:00:00.000Z");
    const id = "bench/accumulator.bench.ts > group > drift";
    appendHistory({
      dir,
      now: new Date("2026-08-02T04:00:00.000Z"),
      recording: record("old", [{ id, mean: 100, rme: 1 }]),
    });
    appendHistory({
      dir,
      now: new Date("2026-08-25T04:00:00.000Z"),
      recording: record("middle", [
        { id, mean: 110, rme: 1 },
        {
          id: "bench/accumulator.bench.ts > group > retired",
          mean: 90,
          rme: 1,
        },
      ]),
    });
    appendHistory({
      dir,
      now,
      recording: record("latest", [
        { id, mean: 112, rme: 1 },
        { id: "bench/accumulator.bench.ts > group > new", mean: 50, rme: 1 },
      ]),
    });

    const markdown = renderHistory({ dir, now });

    expect(markdown).toContain(
      "_3 points · 2026-08-02T04:00:00.000Z to 2026-09-02T04:00:00.000Z · latest runner: AMD EPYC · Node v24.0.0_",
    );
    expect(markdown).toContain(
      "| accumulator › group › drift | 112.000ms | +1.8% | +12.0% ⚠︎ | 110.000ms | 112.000ms | 2 |",
    );
    expect(markdown).toContain(
      "| accumulator › group › new | 50.000ms |  |  | 50.000ms | 50.000ms | 1 |",
    );
    expect(markdown).toContain(
      "| accumulator › group › retired |  |  |  | 90.000ms | 90.000ms | 1 |",
    );
  });

  it("leaves deltas blank for a single point", () => {
    const now = new Date("2026-09-02T04:00:00.000Z");
    appendHistory({
      dir,
      now,
      recording: record("latest", [
        { id: "bench/a.bench.ts > group > only", mean: 1, rme: 1 },
      ]),
    });

    expect(renderHistory({ dir, now })).toContain(
      "| a › group › only | 1.000ms |  |  | 1.000ms | 1.000ms | 1 |",
    );
  });
});

describe("readHistory", () => {
  it("returns no points when the directory is missing", () => {
    expect(readHistory(join(dir, "missing"))).toEqual([]);
  });
});
