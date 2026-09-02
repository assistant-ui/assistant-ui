import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MARKER,
  assembleReport,
  buildCompareDoc,
  renderCompareMarkdown,
  renderTraceMarkdown,
  shortId,
  summarize,
  type CompareMeta,
  type CompareRow,
  type TraceDoc,
  type TraceMetrics,
} from "./report.mjs";

const row = (
  id: string,
  delta: number,
  noise = 3,
  measured?: boolean,
): CompareRow => ({
  id,
  a: 1,
  b: 1 + delta / 100,
  delta,
  noise,
  ...(measured === undefined ? {} : { measured }),
});

const meta = (extra: Partial<CompareMeta> = {}): CompareMeta => ({
  base: { label: "base (aaaaaaa)" },
  head: { label: "head (bbbbbbb)" },
  warnings: [],
  footer: ["footer"],
  ...extra,
});

const markdown = (rows: CompareRow[], extra: Partial<CompareMeta> = {}) =>
  renderCompareMarkdown(buildCompareDoc(rows, meta(extra)));

describe("shortId", () => {
  it("drops the bench directory and extension and joins levels with ›", () => {
    expect(shortId("bench/tree.bench.tsx > tree update > react")).toBe(
      "tree › tree update › react",
    );
    expect(shortId("bench/accumulator.bench.ts > group > 100 deltas")).toBe(
      "accumulator › group › 100 deltas",
    );
  });
});

describe("summarize", () => {
  it("treats every row as measured when nothing is attributed", () => {
    const s = summarize([
      row("bench/a.bench.ts > g > x", 5),
      row("bench/a.bench.ts > g > y", -1),
    ]);
    expect(s.attributed).toBe(false);
    expect(s.controls).toEqual([]);
    expect(s.overshoot).toBeUndefined();
    expect(s.scale).toBe(1);
    expect(s.measured.map((r) => r.verdict)).toEqual(["SLOWER", "~same"]);
  });

  it("scales measured floors by the worst control overshoot of its own floor", () => {
    const s = summarize([
      row("bench/m.bench.ts > g > small", 4, 3, true),
      row("bench/m.bench.ts > g > big", 12, 3, true),
      row("bench/c.bench.ts > g > quiet", 1, 3, false),
      row("bench/c.bench.ts > g > loud", -6, 4, false),
    ]);
    expect(s.overshoot).toBe(1.5);
    expect(s.overshootRow?.id).toBe("bench/c.bench.ts > g > loud");
    expect(s.scale).toBe(1.5);
    expect(s.controlsPastFloor).toBe(1);
    expect(s.measured.map((r) => [r.id, r.verdict])).toEqual([
      ["bench/m.bench.ts > g > big", "SLOWER"],
      ["bench/m.bench.ts > g > small", "~same"],
    ]);
    expect(s.slower).toBe(1);
    expect(s.same).toBe(1);
  });

  it("ignores a wild control that stays inside its own wide floor", () => {
    const s = summarize([
      row("bench/m.bench.ts > g > moved", 5, 3, true),
      row("bench/c.bench.ts > g > jittery", -34, 50, false),
    ]);
    expect(s.overshoot).toBeCloseTo(0.68);
    expect(s.scale).toBe(1);
    expect(s.controlsPastFloor).toBe(0);
    expect(s.measured[0]?.verdict).toBe("SLOWER");
  });

  it("sorts measured rows by absolute delta, largest first", () => {
    const s = summarize([
      row("bench/m.bench.ts > g > a", 1, 3, true),
      row("bench/m.bench.ts > g > b", -9, 3, true),
      row("bench/m.bench.ts > g > c", 4, 3, true),
    ]);
    expect(s.measured.map((r) => r.delta)).toEqual([-9, 4, 1]);
    expect(s.faster).toBe(1);
  });

  it("leaves the floors alone when no control crossed its own", () => {
    const s = summarize([
      row("bench/m.bench.ts > g > jittery", 6, 8, true),
      row("bench/c.bench.ts > g > ctl", 2, 3, false),
    ]);
    expect(s.scale).toBe(1);
    expect(s.measured[0]?.verdict).toBe("~same");
  });
});

describe("buildCompareDoc", () => {
  it("emits measured rows first with verdicts and controls with a null verdict", () => {
    const doc = buildCompareDoc(
      [
        row("bench/c.bench.ts > g > ctl", 1, 3, false),
        row("bench/m.bench.ts > g > moved", 10, 3, true),
      ],
      meta({ changed: ["@assistant-ui/core"], runs: 4 }),
    );
    expect(doc.schema).toBe("aui-perf/compare@1");
    expect(doc.changed).toEqual(["@assistant-ui/core"]);
    expect(doc.runs).toBe(4);
    expect(doc.summary).toMatchObject({
      measured: 1,
      controls: 1,
      slower: 1,
      controlsPastFloor: 0,
      scale: 1,
      overshootBench: "c › g › ctl",
    });
    expect(doc.rows.map((r) => [r.bench, r.verdict, r.measured])).toEqual([
      ["m › g › moved", "SLOWER", true],
      ["c › g › ctl", null, false],
    ]);
    expect(doc.rows[0]).toMatchObject({ base: 1, head: 1.1, floor: 3 });
  });
});

describe("renderCompareMarkdown", () => {
  it("leads with the tally when nothing is attributed", () => {
    const md = markdown([
      row("bench/a.bench.ts > g > x", 5),
      row("bench/a.bench.ts > g > y", 0),
    ]);
    expect(
      md.startsWith("### aui-perf: head (bbbbbbb) vs base (aaaaaaa)"),
    ).toBe(true);
    expect(md).toContain("- **2 benches** · 1 slower · 0 faster · 1 ~same");
    expect(md).toContain(
      "| a › g › x | 1.000ms | 1.050ms | **+5.0%** | 3.0% | **SLOWER** |",
    );
    expect(md).toContain(
      "| a › g › y | 1.000ms | 1.000ms | +0.0% | 3.0% | ~same |",
    );
    expect(md).not.toContain("<details>");
    expect(md.trimEnd().endsWith("footer · verdicts need |Δ| > floor")).toBe(
      true,
    );
  });

  it("splits measured rows from controls and collapses the controls", () => {
    const md = markdown(
      [
        row("bench/m.bench.ts > g > moved", 10, 3, true),
        row("bench/m.bench.ts > g > still", 1, 3, true),
        row("bench/c.bench.ts > g > ctl-loud", 6, 3, false),
        row("bench/c.bench.ts > g > ctl-quiet", -1, 3, false),
      ],
      { changed: ["@assistant-ui/core"], footer: ["base `a`", "head `b`"] },
    );
    expect(md).toContain(
      "- **Measured:** 2 benches exercise a changed dist (`@assistant-ui/core`) · 1 slower · 0 faster · 1 ~same",
    );
    expect(md).toContain(
      "- **Controls:** 2 benches on unchanged dists · 1 crossed their analytic floor, the worst by 2.0× (c › g › ctl-loud)",
    );
    const details = md.slice(md.indexOf("<details>"));
    expect(details).toContain(
      "<summary>2 control rows (unchanged dists, so every delta here is runner noise)</summary>\n\n| bench |",
    );
    expect(details).toContain(
      "| c › g › ctl-loud | 1.000ms | 1.060ms | +6.0% ⚠︎ | 3.0% |",
    );
    expect(details).not.toContain("SLOWER");
    expect(md.indexOf("m › g › moved")).toBeLessThan(md.indexOf("<details>"));
    expect(md).toContain(
      "base `a` · head `b` · verdicts this run need |Δ| > 2.0× floor, the worst control overshoot",
    );
  });

  it("says so when no measured dist changed", () => {
    const md = markdown(
      [
        row("bench/c.bench.ts > g > x", 2, 3, false),
        row("bench/c.bench.ts > g > y", -4, 3, false),
      ],
      { changed: [] },
    );
    expect(md).toContain(
      "- **Nothing to measure.** Every measured package dist is byte-identical between base (aaaaaaa) and head (bbbbbbb), so all 2 rows ran as controls · 1 crossed their analytic floor, the worst by 1.3× (c › g › y)",
    );
    expect(md).not.toContain("| verdict |");
    expect(md).toContain("<summary>2 control rows");
  });

  it("says when changed dists have no bench instead of claiming they are identical", () => {
    const md = markdown(
      [
        row("bench/c.bench.ts > g > x", 2, 3, false),
        row("bench/c.bench.ts > g > y", -1, 3, false),
      ],
      { changed: ["@assistant-ui/tap"] },
    );
    expect(md).toContain(
      "- **No bench exercises the changed dists** (`@assistant-ui/tap`), so all 2 rows ran as controls · none crossed their analytic floor.",
    );
    expect(md).not.toContain("byte-identical");
  });

  it("names the missing controls when every bench is measured", () => {
    const md = markdown([row("bench/m.bench.ts > g > x", 1, 3, true)], {
      changed: ["@assistant-ui/tap"],
    });
    expect(md).toContain(
      "- **Controls:** none, every bench exercises a changed dist, so verdicts rest on the analytic floors alone",
    );
  });

  it("escapes table-breaking characters in bench names and surfaces warnings as quotes", () => {
    const md = markdown([row("bench/a.bench.ts > g > a | b \\ c\nd", 0)], {
      warnings: ["environments differ"],
    });
    expect(md).toContain("> ⚠️ environments differ");
    expect(md).toContain("| a › g › a \\| b \\\\ c d |");
  });
});

const metrics = (over: Partial<TraceMetrics> = {}): TraceMetrics => ({
  wallSeconds: 5,
  mainBusyMs: 173,
  mainBusyPct: 2.65,
  compositorBusyMs: 40,
  compositorBusyPct: 0.8,
  paintImage: 1806,
  commit: 903,
  prePaint: 900,
  frames: 600,
  ...over,
});

const traceDoc = (withBase: boolean): TraceDoc => ({
  schema: "aui-perf/trace@1",
  generatedAt: "2026-09-02T00:00:00.000Z",
  seconds: 5,
  base: withBase ? { label: "base (aaaaaaa)", sha: "aaaaaaa" } : null,
  head: { label: "head (bbbbbbb)", sha: "bbbbbbb", dirty: false },
  fixtures: [
    {
      name: "shimmer.html",
      base: withBase ? metrics() : null,
      head: metrics({
        mainBusyMs: 5,
        mainBusyPct: 0.07,
        paintImage: 0,
        commit: 1,
      }),
      screenshots: { head: "/tmp/head.png" },
    },
  ],
});

describe("renderTraceMarkdown", () => {
  it("renders base → head cells when a base side exists", () => {
    const md = renderTraceMarkdown(traceDoc(true));
    expect(
      md.startsWith("### aui-perf trace: head (bbbbbbb) vs base (aaaaaaa)"),
    ).toBe(true);
    expect(md).toContain("base → head");
    expect(md).toContain(
      "| shimmer.html | 173ms (2.65%) → 5ms (0.07%) | 40ms (0.80%) → 40ms (0.80%) | 1806 → 0 | 903 → 1 | 900 → 900 | 600 → 600 |",
    );
  });

  it("renders plain cells for a single side", () => {
    const md = renderTraceMarkdown(traceDoc(false));
    expect(md.startsWith("### aui-perf trace: head (bbbbbbb)\n")).toBe(true);
    expect(md).toContain(
      "| shimmer.html | 5ms (0.07%) | 40ms (0.80%) | 0 | 1 | 900 | 600 |",
    );
    expect(md).not.toContain("→");
  });
});

describe("assembleReport", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  it("stacks the lanes that ran under one marker and appends the JSON block", () => {
    const dir = mkdtempSync(join(tmpdir(), "aui-perf-report-"));
    dirs.push(dir);
    const bench = join(dir, "bench.json");
    const trace = join(dir, "trace.json");
    const out = join(dir, "comment.md");
    writeFileSync(
      bench,
      JSON.stringify(
        buildCompareDoc(
          [row("bench/m.bench.ts > g > x", 1, 3, true)],
          meta({ changed: ["@assistant-ui/tap"] }),
        ),
      ),
    );
    writeFileSync(trace, JSON.stringify(traceDoc(true)));
    const md = assembleReport({ out, bench, trace });
    expect(readFileSync(out, "utf8")).toBe(md);
    expect(
      md.startsWith(
        `${MARKER}\n### aui-perf: head (bbbbbbb) vs base (aaaaaaa)`,
      ),
    ).toBe(true);
    expect(md).toContain(
      "### aui-perf trace: head (bbbbbbb) vs base (aaaaaaa)",
    );
    const block = md.slice(md.indexOf("<summary>machine-readable</summary>"));
    const json = JSON.parse(
      block.slice(block.indexOf("```json\n") + 8, block.lastIndexOf("\n```")),
    );
    expect(json.bench.schema).toBe("aui-perf/compare@1");
    expect(json.trace.fixtures[0].name).toBe("shimmer.html");
  });

  it("drops control rows from the JSON block when the comment would exceed the limit", () => {
    const dir = mkdtempSync(join(tmpdir(), "aui-perf-report-"));
    dirs.push(dir);
    const bench = join(dir, "bench.json");
    const out = join(dir, "comment.md");
    const rows: CompareRow[] = [
      row("bench/m.bench.ts > g > measured", 1, 3, true),
    ];
    for (let i = 0; i < 900; i++) {
      rows.push(
        row(
          `bench/c.bench.ts > group ${"x".repeat(60)} > control ${i}`,
          0,
          3,
          false,
        ),
      );
    }
    writeFileSync(
      bench,
      JSON.stringify(
        buildCompareDoc(rows, meta({ changed: ["@assistant-ui/tap"] })),
      ),
    );
    const md = assembleReport({ out, bench });
    expect(md.length).toBeLessThan(65536);
    expect(md).toContain(
      "<summary>900 control rows (unchanged dists, so every delta here is runner noise), the 40 largest moves shown</summary>",
    );
    expect(md).toContain(
      "<summary>machine-readable (control rows omitted to stay under the comment size limit)</summary>",
    );
    const block = md.slice(
      md.indexOf("```json\n") + 8,
      md.lastIndexOf("\n```"),
    );
    expect(JSON.parse(block).bench.rows).toHaveLength(1);
  });

  it("still writes a marked comment when no lane ran", () => {
    const dir = mkdtempSync(join(tmpdir(), "aui-perf-report-"));
    dirs.push(dir);
    const out = join(dir, "comment.md");
    const md = assembleReport({ out });
    expect(md.startsWith(MARKER)).toBe(true);
    expect(md).toContain("_No measurement lane produced output for this run._");
    expect(md).toContain("```json\n{}\n```");
  });
});
