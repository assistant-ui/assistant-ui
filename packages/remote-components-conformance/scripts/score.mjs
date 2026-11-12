#!/usr/bin/env node
// Summarises conformance/.out/results.json: pass/total per engine and suite, and failure reasons.
import { readdirSync, readFileSync } from "node:fs";
const dir = new URL("../.out/", import.meta.url);
const files = readdirSync(dir).filter((f) =>
  /^results(-[a-z]+)?\.json$/.test(f),
);
if (files.length === 0)
  throw new Error(
    "No .out/results-*.json; run pnpm --filter @assistant-ui/remote-components-conformance conformance first",
  );
const rows = [];
const walk = (suite, prefix, fileName) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const r = t.results.at(-1) ?? {};
      const msg = (r.error?.message ?? "")
        // oxlint-disable-next-line no-control-regex -- strips ANSI escapes from Playwright messages
        .replace(/\x1b\[[0-9;]*m/g, "")
        .split("\n")
        .filter(Boolean)
        .slice(0, 2)
        .join(" | ");
      rows.push({
        engine: t.projectName,
        suite: fileName,
        name: `${t.projectName}: ${prefix}${spec.title}`,
        status:
          t.status === "flaky"
            ? "flaky"
            : t.status === "skipped"
              ? "skipped"
              : r.status,
        msg,
      });
    }
  }
  for (const s of suite.suites ?? [])
    walk(s, `${prefix}${s.title} > `, fileName);
};
for (const f of files) {
  const data = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  for (const s of data.suites)
    walk(s, "", s.title.replace(/^.*\//, "").replace(/\.spec\.ts$/, ""));
}
const counted = rows.filter((r) => r.status !== "skipped");
const pass = (rs) => rs.filter((r) => r.status === "passed").length;
console.log(`SCORE ${pass(counted)}/${counted.length}`);
const engines = [...new Set(counted.map((r) => r.engine))];
const suites = [...new Set(counted.map((r) => r.suite))].filter(
  (s) => s !== "inspect",
);
for (const e of engines) {
  const er = counted.filter((r) => r.engine === e);
  const parts = suites.map((s) => {
    const sr = er.filter((r) => r.suite === s);
    return `${s} ${pass(sr)}/${sr.length}`;
  });
  console.log(`  ${e}: ${pass(er)}/${er.length} (${parts.join(", ")})`);
}
for (const r of counted)
  if (r.status !== "passed")
    console.log(`- [${r.status}] ${r.name}: ${r.msg.slice(0, 300)}`);
