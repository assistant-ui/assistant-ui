import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { failureLines, flattenBenchmarks, pkgRoot } from "./suite.mjs";

describe("flattenBenchmarks", () => {
  it("maps a vitest 5 JSON report to rows", () => {
    const rows = flattenBenchmarks({
      testResults: [
        {
          name: join(pkgRoot, "bench/x.bench.ts"),
          assertionResults: [
            {
              title: "case",
              ancestorTitles: ["group"],
              benchmarks: [
                {
                  name: "group > case",
                  tasks: [
                    {
                      name: "case",
                      rank: 1,
                      period: 1,
                      totalTime: 1000,
                      latency: {
                        mean: 0.5,
                        rme: 1.5,
                        p99: 0.9,
                        samplesCount: 2000,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(rows).toEqual([
      {
        id: "bench/x.bench.ts > group > case",
        name: "case",
        mean: 0.5,
        hz: 2000,
        rme: 1.5,
        p99: 0.9,
        samples: 2000,
      },
    ]);
  });
});

describe("failureLines", () => {
  it("lists file-level errors and every failed bench with its message", () => {
    const lines = failureLines({
      testResults: [
        {
          name: join(pkgRoot, "bench/x.bench.ts"),
          message: "",
          assertionResults: [
            { fullName: "group ok", failureMessages: [] },
            {
              fullName: "group broken",
              failureMessages: ["TypeError: x is not a function"],
            },
          ],
        },
        {
          name: join(pkgRoot, "bench/y.bench.ts"),
          message: "Failed to load url @assistant-ui/core",
          assertionResults: [],
        },
      ],
    });

    expect(lines).toEqual([
      "bench/x.bench.ts > group broken: TypeError: x is not a function",
      "bench/y.bench.ts: Failed to load url @assistant-ui/core",
    ]);
  });
});
