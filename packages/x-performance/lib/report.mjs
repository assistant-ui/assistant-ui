import { readFileSync, writeFileSync } from "node:fs";

export const MARKER = "<!-- aui-perf-report -->";

export const fmt = (ms) =>
  ms >= 1 ? `${ms.toFixed(3)}ms` : `${(ms * 1000).toFixed(2)}µs`;

export const shortId = (id) =>
  id
    .replace(/^bench\//, "")
    .replace(/\.bench\.tsx?(?= > )/, "")
    .split(" > ")
    .join(" › ");

const pct = (value) =>
  `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(1)}%`;
const floor = (value) => `${value.toFixed(1)}%`;
const code = (value) => `\`${value}\``;

// Rows carry `measured: false` when every dist they exercise is byte-identical
// on both sides. Such controls cannot have moved for a real reason, so how far
// the worst of them overshoots its own analytic floor calibrates the floors
// for this run: a measured row counts as moved only when it clears its floor
// by at least that same factor.
export const summarize = (rows) => {
  const attributed = rows.some((row) => row.measured !== undefined);
  const controls = attributed ? rows.filter((row) => !row.measured) : [];
  const candidates = attributed ? rows.filter((row) => row.measured) : rows;
  let overshoot;
  let overshootRow;
  for (const row of controls) {
    const ratio = Math.abs(row.delta) / row.noise;
    if (overshoot === undefined || ratio > overshoot) {
      overshoot = ratio;
      overshootRow = row;
    }
  }
  const scale = Math.max(1, overshoot ?? 1);
  const measured = candidates
    .map((row) => {
      const verdict =
        Math.abs(row.delta) <= row.noise * scale
          ? "~same"
          : row.delta > 0
            ? "SLOWER"
            : "FASTER";
      return { ...row, verdict };
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const count = (verdict) =>
    measured.filter((row) => row.verdict === verdict).length;
  return {
    attributed,
    measured,
    controls,
    overshoot,
    overshootRow,
    scale,
    slower: count("SLOWER"),
    faster: count("FASTER"),
    same: count("~same"),
    controlsPastFloor: controls.filter((row) => Math.abs(row.delta) > row.noise)
      .length,
  };
};

export const buildCompareDoc = (rows, meta) => {
  const s = summarize(rows);
  const toRow = (row, verdict) => ({
    id: row.id,
    bench: shortId(row.id),
    measured: row.measured ?? true,
    touched: row.touched ?? [],
    base: row.a,
    head: row.b,
    delta: row.delta,
    floor: row.noise,
    verdict,
  });
  return {
    schema: "aui-perf/compare@1",
    generatedAt: new Date().toISOString(),
    base: meta.base,
    head: meta.head,
    changed: meta.changed ?? null,
    runs: meta.runs ?? null,
    warnings: meta.warnings,
    summary: {
      measured: s.measured.length,
      controls: s.controls.length,
      slower: s.slower,
      faster: s.faster,
      same: s.same,
      controlsPastFloor: s.controlsPastFloor,
      scale: s.scale,
      overshoot: s.overshoot ?? null,
      overshootBench: s.overshootRow ? shortId(s.overshootRow.id) : null,
    },
    rows: [
      ...s.measured.map((row) => toRow(row, row.verdict)),
      ...s.controls.map((row) => toRow(row, null)),
    ],
    footer: meta.footer,
  };
};

const cell = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");

const mdTable = (header, aligns, body) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${aligns.join(" | ")} |`,
    ...body.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");

const controlsText = (s) =>
  s.controlsPastFloor
    ? `${s.controlsPastFloor} crossed their analytic floor, the worst by ${s.overshoot.toFixed(1)}× (${s.overshootBench})`
    : "none crossed their analytic floor";

const compareHeadline = (doc) => {
  const s = doc.summary;
  const tally = `${s.slower} slower · ${s.faster} faster · ${s.same} ~same`;
  if (doc.changed === null)
    return [`- **${doc.rows.length} benches** · ${tally}`];
  if (!s.measured) {
    return [
      doc.changed.length
        ? `- **No bench exercises the changed dists** (${doc.changed.map(code).join(", ")}), so all ${doc.rows.length} rows ran as controls · ${controlsText(s)}. A bench under \`bench/\` that imports them would measure this class of change.`
        : `- **Nothing to measure.** Every measured package dist is byte-identical between ${doc.base.label} and ${doc.head.label}, so all ${doc.rows.length} rows ran as controls · ${controlsText(s)}`,
    ];
  }
  return [
    `- **Measured:** ${s.measured} benches exercise a changed dist (${doc.changed.map(code).join(", ")}) · ${tally}`,
    s.controls
      ? `- **Controls:** ${s.controls} benches on unchanged dists · ${controlsText(s)}`
      : "- **Controls:** none, every bench exercises a changed dist, so verdicts rest on the analytic floors alone",
  ];
};

const ruleText = (s) =>
  s.scale > 1
    ? `verdicts this run need |Δ| > ${s.scale.toFixed(1)}× floor, the worst control overshoot`
    : "verdicts need |Δ| > floor";

const splitRows = (doc) => ({
  measured: doc.rows.filter((row) => row.verdict !== null),
  controls: doc.rows.filter((row) => row.verdict === null),
});

export const renderCompareMarkdown = (
  doc,
  { controlLimit = Infinity, measuredLimit = Infinity } = {},
) => {
  const { measured: allMeasured, controls: allControls } = splitRows(doc);
  const measured = allMeasured.slice(0, measuredLimit);
  const measuredOmitted = allMeasured.length - measured.length;
  const controls = [...allControls]
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, controlLimit);
  const omitted = allControls.length - controls.length;
  const out = [
    `### aui-perf: ${doc.head.label} vs ${doc.base.label}`,
    "",
    "_Wall-time benches on a shared runner. Informational, never a gate._",
    "",
  ];
  for (const warning of doc.warnings) out.push(`> ⚠️ ${warning}`, "");
  out.push(...compareHeadline(doc));
  if (measured.length) {
    if (measuredOmitted)
      out.push(
        "",
        `_${measuredOmitted} smaller measured moves omitted from this table._`,
      );
    out.push(
      "",
      mdTable(
        ["bench", doc.base.label, doc.head.label, "Δ", "floor", "verdict"],
        ["---", "---:", "---:", "---:", "---:", "---"],
        measured.map((row) => [
          row.bench,
          fmt(row.base),
          fmt(row.head),
          row.verdict === "~same" ? pct(row.delta) : `**${pct(row.delta)}**`,
          floor(row.floor),
          row.verdict === "~same" ? row.verdict : `**${row.verdict}**`,
        ]),
      ),
    );
  }
  if (controls.length) {
    out.push(
      "",
      "<details>",
      `<summary>${allControls.length} control rows (unchanged dists, so every delta here is runner noise)${omitted ? `, the ${controls.length} largest moves shown` : ""}</summary>`,
      "",
      mdTable(
        ["bench", doc.base.label, doc.head.label, "Δ", "floor"],
        ["---", "---:", "---:", "---:", "---:"],
        controls.map((row) => [
          row.bench,
          fmt(row.base),
          fmt(row.head),
          Math.abs(row.delta) > row.floor
            ? `${pct(row.delta)} ⚠︎`
            : pct(row.delta),
          floor(row.floor),
        ]),
      ),
      "",
      "</details>",
    );
  }
  out.push("", [...doc.footer, ruleText(doc.summary)].join(" · "));
  return out.join("\n");
};

export const renderCompareTerminal = (doc) => {
  const { measured, controls } = splitRows(doc);
  for (const warning of doc.warnings) console.warn(`warning: ${warning}\n`);
  const table = (list, withVerdict) =>
    console.table(
      list.map((row) => ({
        bench: row.bench,
        [doc.base.label]: fmt(row.base),
        [doc.head.label]: fmt(row.head),
        delta: pct(row.delta),
        floor: floor(row.floor),
        ...(withVerdict
          ? { verdict: row.verdict }
          : { noise: Math.abs(row.delta) > row.floor ? "past floor" : "" }),
      })),
    );
  if (measured.length) table(measured, true);
  if (controls.length) {
    console.log(
      `controls (${controls.length} benches on unchanged dists; deltas are runner noise):`,
    );
    table(controls, false);
  }
  for (const line of compareHeadline(doc))
    console.log(line.replace(/^- /, "").replace(/\*\*/g, ""));
  console.log([...doc.footer, ruleText(doc.summary)].join("\n"));
};

const busy = (m) =>
  `${m.mainBusyMs.toFixed(0)}ms (${m.mainBusyPct.toFixed(2)}%)`;
const compositor = (m) =>
  `${m.compositorBusyMs.toFixed(0)}ms (${m.compositorBusyPct.toFixed(2)}%)`;
const pair = (pick, fixture) =>
  fixture.base
    ? `${pick(fixture.base)} → ${pick(fixture.head)}`
    : pick(fixture.head);

const traceColumns = [
  ["renderer main", busy],
  ["compositor", compositor],
  ["PaintImage", (m) => m.paintImage],
  ["Commit", (m) => m.commit],
  ["PrePaint", (m) => m.prePaint],
  ["frames", (m) => m.frames],
];

export const renderTraceMarkdown = (doc) => {
  const title = doc.base
    ? `### aui-perf trace: ${doc.head.label} vs ${doc.base.label}`
    : `### aui-perf trace: ${doc.head.label}`;
  const direction = doc.base ? ", base → head" : "";
  return [
    title,
    "",
    `_Rendering-pipeline counters per fixture over ${doc.seconds}s in headless Chrome${direction}. Performance evidence only: a page that renders nothing traces beautifully, so compare the screenshots in the trace-screenshots artifact before believing an improvement._`,
    "",
    mdTable(
      ["fixture", ...traceColumns.map(([name]) => name)],
      ["---", ...traceColumns.map(() => "---:")],
      doc.fixtures.map((fixture) => [
        fixture.name,
        ...traceColumns.map(([, pick]) => pair(pick, fixture)),
      ]),
    ),
  ].join("\n");
};

export const renderTraceTerminal = (doc) => {
  console.table(
    doc.fixtures.map((fixture) => ({
      fixture: fixture.name,
      ...Object.fromEntries(
        traceColumns.map(([name, pick]) => [name, pair(pick, fixture)]),
      ),
    })),
  );
  console.log(
    `${doc.base ? `base: ${doc.base.sha}\n` : ""}head: ${doc.head.sha}${doc.head.dirty ? " (dirty)" : ""}\ntrace numbers are performance evidence, not correctness evidence; compare the screenshots in .perf/`,
  );
};

export const writeLaneOutputs = (doc, outputs, render) => {
  if (outputs?.json) {
    writeFileSync(outputs.json, JSON.stringify(doc, null, 2) + "\n");
    console.error(`json -> ${outputs.json}`);
  }
  if (outputs?.report) {
    writeFileSync(outputs.report, `${MARKER}\n${render(doc)}\n`);
    console.error(`markdown report -> ${outputs.report}`);
  }
};

// GitHub rejects comment bodies past 65536 characters, and the posting step
// must never fail for a reason that is not an infrastructure error.
const COMMENT_LIMIT = 60_000;

const withoutControls = (doc) => ({
  ...doc,
  rows: doc.rows.filter((row) => row.verdict !== null),
});

// One sticky comment per PR carries every lane that ran plus the same data as
// JSON, so a reviewer skims the tables and a review agent parses the block.
export const assembleReport = ({ out, bench, trace }) => {
  const docs = {};
  const sections = [];
  if (bench) {
    docs.bench = JSON.parse(readFileSync(bench, "utf8"));
    sections.push(renderCompareMarkdown(docs.bench));
  }
  if (trace) {
    docs.trace = JSON.parse(readFileSync(trace, "utf8"));
    sections.push(renderTraceMarkdown(docs.trace));
  }
  if (!sections.length) {
    sections.push(
      "### aui-perf\n\n_No measurement lane produced output for this run._",
    );
  }
  const render = (payload, note) =>
    [
      MARKER,
      ...sections,
      "<details>",
      `<summary>machine-readable${note ? ` (${note})` : ""}</summary>`,
      "",
      "```json",
      JSON.stringify(payload),
      "```",
      "",
      "</details>",
      "",
    ].join("\n");
  let markdown = render(docs, "");
  if (markdown.length > COMMENT_LIMIT && docs.bench) {
    const trimmed = withoutControls(docs.bench);
    sections[0] = renderCompareMarkdown(docs.bench, { controlLimit: 40 });
    markdown = render(
      { ...docs, bench: trimmed },
      "control rows omitted to stay under the comment size limit",
    );
  }
  if (markdown.length > COMMENT_LIMIT) {
    if (docs.bench)
      sections[0] = renderCompareMarkdown(docs.bench, {
        controlLimit: 20,
        measuredLimit: 40,
      });
    if (docs.trace)
      sections[sections.length - 1] = renderTraceMarkdown({
        ...docs.trace,
        fixtures: docs.trace.fixtures.slice(0, 40),
      });
    markdown = render(
      Object.fromEntries(
        Object.entries(docs).map(([lane, doc]) => [
          lane,
          {
            schema: doc.schema,
            generatedAt: doc.generatedAt,
            summary: doc.summary ?? null,
          },
        ]),
      ),
      "rows omitted to stay under the comment size limit",
    );
  }
  writeFileSync(out, markdown);
  return markdown;
};
