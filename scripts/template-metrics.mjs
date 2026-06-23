#!/usr/bin/env node
// Measures the "install footprint" of each starter template, i.e. what a user
// actually gets when they scaffold it:
//   - own LOC: the template's own tracked source (app glue, config)
//   - /ui LOC: the packages/ui components it pulls in. Aliased templates import
//     @/components/* -> packages/ui/src/* via tsconfig paths, so those files are
//     copied into a user's project on scaffold but live outside templates/ in
//     this repo. We resolve them by walking the import graph from each template.
//   - bundle: gzipped client JS emitted by `next build` (.next/static/**/*.js)
//
// Usage:
//   node scripts/template-metrics.mjs measure <rootDir> <outJson>
//   node scripts/template-metrics.mjs report <baseJson|""> <headJson> <outMd> [gateFile]
//
// report writes "pass"/"fail" to gateFile based on the regression thresholds
// (env: MAX_LOC_INCREASE applied to total LOC, MAX_BUNDLE_INCREASE_KB).

import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { gzipSync } from "node:zlib";
import { join, extname, dirname, resolve } from "node:path";

const CODE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
]);
const RESOLVE_EXT = ["", ".tsx", ".ts", ".jsx", ".js"];

function listTemplates(root) {
  return readdirSync(join(root, "templates"), { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        existsSync(join(root, "templates", d.name, "package.json")),
    )
    .map((d) => d.name)
    .sort();
}

function trackedFiles(root, dir) {
  return execFileSync("git", ["ls-files", "--", dir], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

function lineCount(file) {
  return readFileSync(file, "utf8").split("\n").length;
}

// tsconfig `paths` -> longest-prefix alias matchers, resolved against the
// template dir so "@/components/ui/*" can point into ../../packages/ui/src.
function loadAliases(tplDir) {
  // tsconfig values contain "/*" (e.g. "./*"), so strip only full-line "//"
  // comments and trailing commas; never block comments. Parse raw first.
  const raw = readFileSync(join(tplDir, "tsconfig.json"), "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(
      raw.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"),
    );
  }
  const paths = parsed.compilerOptions?.paths ?? {};
  return Object.entries(paths)
    .map(([key, [target]]) => ({
      prefix: key.replace(/\*$/, ""),
      target: target.replace(/\*$/, ""),
    }))
    .sort((a, b) => b.prefix.length - a.prefix.length);
}

function resolveModule(fromFile, spec, tplDir, aliases) {
  let target;
  if (spec.startsWith("@/")) {
    const alias = aliases.find((a) => spec.startsWith(a.prefix));
    if (!alias) return null;
    target = resolve(tplDir, alias.target + spec.slice(alias.prefix.length));
  } else if (spec.startsWith(".")) {
    target = resolve(dirname(fromFile), spec);
  } else {
    return null; // bare npm import: a dependency, not copied source
  }
  for (const ext of RESOLVE_EXT) {
    const direct = target + ext;
    if (ext && existsSync(direct) && statSync(direct).isFile()) return direct;
    const index = join(target, `index${ext}`);
    if (ext && existsSync(index) && statSync(index).isFile()) return index;
  }
  return existsSync(target) && statSync(target).isFile() ? target : null;
}

function importsOf(file) {
  const src = readFileSync(file, "utf8");
  const specs = [];
  const re = /(?:from|import)\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) specs.push(m[1]);
  return specs;
}

// Owned template files all ship; packages/ui files count only when reachable
// from the template's imports (a user only gets the components they use).
function footprintFor(root, name) {
  // Absolute paths throughout so seeds match the resolver's output and the
  // visited Set dedups correctly (relative + absolute spellings would double).
  const tplDir = resolve(root, "templates", name);
  const aliases = loadAliases(tplDir);
  const seeds = trackedFiles(root, `templates/${name}`)
    .filter((f) => CODE_EXT.has(extname(f)))
    .map((f) => resolve(root, f));

  const visited = new Set();
  const stack = [...seeds];
  while (stack.length) {
    const file = stack.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    for (const spec of importsOf(file)) {
      const resolved = resolveModule(file, spec, tplDir, aliases);
      if (resolved && !visited.has(resolved)) stack.push(resolved);
    }
  }

  let ownLoc = 0;
  let uiLoc = 0;
  for (const file of visited) {
    const loc = lineCount(file);
    if (file.includes("/packages/ui/")) uiLoc += loc;
    else ownLoc += loc;
  }
  return { ownLoc, uiLoc };
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
    ...footprintFor(root, name),
    bundleGzip: bundleGzipFor(root, name),
  }));
  writeFileSync(outJson, JSON.stringify(result, null, 2));
}

function totalLoc(t) {
  return t.ownLoc + t.uiLoc;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function signedKb(bytes) {
  return `${bytes > 0 ? "+" : "-"}${kb(Math.abs(bytes))}`;
}

function locCell(cur, base) {
  if (base == null) return `${cur} (new)`;
  const d = cur - base;
  return `${cur} (${d === 0 ? "0" : `${d > 0 ? "+" : ""}${d}`})`;
}

function bundleCell(cur, base) {
  if (cur == null) return "n/a";
  if (base == null) return `${kb(cur)} (new)`;
  const d = cur - base;
  return `${kb(cur)} (${d === 0 ? "0" : signedKb(d)})`;
}

// Per-template thresholds (env-overridable). A template "regresses" when it
// already existed on the baseline and grows past either limit. The LOC limit
// applies to total footprint (own + /ui).
const MAX_LOC_INCREASE = Number(process.env.MAX_LOC_INCREASE ?? 50);
const MAX_BUNDLE_INCREASE_KB = Number(process.env.MAX_BUNDLE_INCREASE_KB ?? 10);

function regression(t, base) {
  if (!base) return null;
  const reasons = [];
  const locDelta = totalLoc(t) - totalLoc(base);
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
      locCell(t.ownLoc, b?.ownLoc),
      locCell(t.uiLoc, b?.uiLoc),
      locCell(totalLoc(t), b ? totalLoc(b) : null),
      bundleCell(t.bundleGzip, b?.bundleGzip ?? null),
      reasons ? "⚠️" : "✅",
    ];
  });

  const lines = [
    "<!-- template-metrics -->",
    "## 📦 Template install footprint",
    "",
    "Lines copied into your project on scaffold: **Own** (template glue) + **/ui** (shared `packages/ui` components it imports). Bundle = gzipped client JS from `next build`. Each cell shows `current (Δ vs main)`.",
    "",
    "| Template | Own LOC | /ui LOC | Total LOC | Bundle (gz) | Status |",
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
