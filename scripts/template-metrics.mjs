#!/usr/bin/env node
// Measures the "install footprint" of each starter template:
//   - LOC: tracked source lines copied into a user's codebase (git ls-files, so
//     build output and node_modules are excluded automatically)
//   - bundle: gzipped client JS emitted by `next build` (.next/static/**/*.js)
//
// Usage:
//   node scripts/template-metrics.mjs measure <rootDir> <outJson>
//   node scripts/template-metrics.mjs report <baseJson|""> <headJson> <outMd> [gateFile]
//
// report writes "pass"/"fail" to gateFile based on the regression thresholds
// (env: MAX_LOC_INCREASE, MAX_BUNDLE_INCREASE_KB).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, extname } from "node:path";

const CODE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
]);

function listTemplates(root) {
  return readdirSync(join(root, "templates"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function locFor(root, name) {
  const tracked = execFileSync("git", ["ls-files", "--", `templates/${name}`], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);

  let loc = 0;
  for (const file of tracked) {
    if (!CODE_EXT.has(extname(file))) continue;
    loc += readFileSync(join(root, file), "utf8").split("\n").length;
  }
  return loc;
}

function walkJs(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(p, acc);
    else if (entry.name.endsWith(".js")) acc.push(p);
  }
}

function bundleGzipFor(root, name) {
  const staticDir = join(root, "templates", name, ".next", "static");
  if (!existsSync(staticDir)) return null;
  const files = [];
  walkJs(staticDir, files);
  let bytes = 0;
  for (const f of files) bytes += gzipSync(readFileSync(f)).length;
  return bytes;
}

function measure(root, outJson) {
  const result = listTemplates(root).map((name) => ({
    name,
    loc: locFor(root, name),
    bundleGzip: bundleGzipFor(root, name),
  }));
  writeFileSync(outJson, JSON.stringify(result, null, 2));
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function signedKb(bytes) {
  return `${bytes > 0 ? "+" : "-"}${kb(Math.abs(bytes))}`;
}

function deltaLoc(head, base) {
  if (base == null) return "new";
  const d = head - base;
  if (d === 0) return "0";
  return `${d > 0 ? "+" : ""}${d}`;
}

function deltaBundle(head, base) {
  if (head == null) return "n/a";
  if (base == null) return "new";
  const d = head - base;
  if (d === 0) return "0";
  return signedKb(d);
}

// Per-template thresholds (env-overridable). A template "regresses" when it
// already existed on the baseline and grows past either limit.
const MAX_LOC_INCREASE = Number(process.env.MAX_LOC_INCREASE ?? 50);
const MAX_BUNDLE_INCREASE_KB = Number(process.env.MAX_BUNDLE_INCREASE_KB ?? 10);

function regression(t, base) {
  if (!base) return null;
  const reasons = [];
  const locDelta = t.loc - base.loc;
  if (locDelta > MAX_LOC_INCREASE) {
    reasons.push(`LOC +${locDelta} > ${MAX_LOC_INCREASE}`);
  }
  if (t.bundleGzip != null && base.bundleGzip != null) {
    const bundleDelta = t.bundleGzip - base.bundleGzip;
    if (bundleDelta > MAX_BUNDLE_INCREASE_KB * 1024) {
      reasons.push(
        `bundle ${signedKb(bundleDelta)} > +${MAX_BUNDLE_INCREASE_KB} KB`,
      );
    }
  }
  return reasons.length ? reasons : null;
}

function report(baseJson, headJson, outMd, gateFile) {
  const head = JSON.parse(readFileSync(headJson, "utf8"));
  const base =
    baseJson && existsSync(baseJson)
      ? JSON.parse(readFileSync(baseJson, "utf8"))
      : [];
  const baseByName = new Map(base.map((t) => [t.name, t]));

  const regressions = [];
  const rows = head.map((t) => {
    const b = baseByName.get(t.name);
    const reasons = regression(t, b);
    if (reasons) regressions.push({ name: t.name, reasons });
    return [
      t.name,
      String(t.loc),
      deltaLoc(t.loc, b?.loc),
      t.bundleGzip == null ? "n/a" : kb(t.bundleGzip),
      deltaBundle(t.bundleGzip, b?.bundleGzip ?? null),
      reasons ? "regression" : "ok",
    ];
  });

  const lines = [
    "<!-- template-metrics -->",
    "## Template install footprint",
    "",
    "LOC = tracked source lines copied into your project. Bundle = gzipped client JS from `next build`.",
    "",
    "| Template | LOC | d LOC | Bundle (gz) | d Bundle | Status |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...rows.map((r) => `| ${r.join(" | ")} |`),
    "",
  ];

  if (base.length === 0) {
    lines.push(
      "_No baseline found - deltas will appear once `main` has been measured._",
    );
  } else if (regressions.length) {
    lines.push(
      `**Gate failed** - ${regressions.length} template(s) regressed past the configured limits (LOC +${MAX_LOC_INCREASE}, bundle +${MAX_BUNDLE_INCREASE_KB} KB):`,
      ...regressions.map((r) => `- \`${r.name}\`: ${r.reasons.join("; ")}`),
    );
  } else {
    lines.push(
      "_Within limits. Bundle measured for a representative subset; templates without a build show `n/a`._",
    );
  }

  writeFileSync(outMd, lines.join("\n"));
  if (gateFile) writeFileSync(gateFile, regressions.length ? "fail" : "pass");
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "measure") measure(args[0], args[1]);
else if (cmd === "report") report(args[0] || "", args[1], args[2], args[3]);
else {
  console.error("usage: template-metrics.mjs measure|report ...");
  process.exit(1);
}
