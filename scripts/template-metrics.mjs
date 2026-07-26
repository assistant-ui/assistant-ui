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
//   node scripts/template-metrics.mjs measure-base <rootDir> <outJson> [baseRef]
//   node scripts/template-metrics.mjs check [rootDir] [baseRef]
//   node scripts/template-metrics.mjs report <baseJson|""> <headJson> <outMd> [commentFile]
//
// Bundle size depends on the CI toolchain, so it is measured per run and
// never gated.

import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
  mkdtempSync,
} from "node:fs";
import { tmpdir } from "node:os";
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
const RESOLVE_EXT = [".tsx", ".ts", ".jsx", ".js"];

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
  const text = readFileSync(file, "utf8");
  // A trailing newline yields a phantom empty element; strip one so a new
  // N-line file counts as N, not N+1 (which would skew new-file deltas).
  return text === "" ? 0 : text.replace(/\n$/, "").split("\n").length;
}

// tsconfig `paths` -> longest-prefix alias matchers, resolved against the
// template dir so "@/components/ui/*" can point into ../../packages/ui/src.
function loadAliases(tplDir) {
  const tsconfig = join(tplDir, "tsconfig.json");
  if (!existsSync(tsconfig)) return [];
  // tsconfig values contain "/*" (e.g. "./*"), so strip only full-line "//"
  // comments and trailing commas; never block comments. Parse raw first.
  const raw = readFileSync(tsconfig, "utf8");
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
    .map(([key, targets]) => ({
      prefix: key.replace(/\*$/, ""),
      targets: targets.map((target) => target.replace(/\*$/, "")),
    }))
    .sort((a, b) => b.prefix.length - a.prefix.length);
}

function isFile(p) {
  return existsSync(p) && statSync(p).isFile();
}

function resolveCandidate(target) {
  for (const ext of RESOLVE_EXT) {
    const direct = target + ext;
    if (isFile(direct)) return direct;
    const index = join(target, `index${ext}`);
    if (isFile(index)) return index;
  }
  return isFile(target) ? target : null;
}

// Alias targets are tsconfig fallback arrays: entries are tried in order and
// the first that exists wins, matching bundler resolution.
function resolveModule(fromFile, spec, tplDir, aliases) {
  if (spec.startsWith("@/")) {
    const alias = aliases.find((a) => spec.startsWith(a.prefix));
    if (!alias) return null;
    for (const target of alias.targets) {
      const resolved = resolveCandidate(
        resolve(tplDir, target + spec.slice(alias.prefix.length)),
      );
      if (resolved) return resolved;
    }
    return null;
  }
  if (spec.startsWith(".")) {
    return resolveCandidate(resolve(dirname(fromFile), spec));
  }
  return null;
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
  const result = locMetrics(root).map((t) => ({
    ...t,
    bundleGzip: bundleGzipFor(root, t.name),
  }));
  writeFileSync(outJson, JSON.stringify(result, null, 2));
}

function totalLoc(t) {
  return t.ownLoc + t.uiLoc;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function locCell(cur, base) {
  if (base == null) return `${cur} (new)`;
  const d = cur - base;
  return `${cur} (${d === 0 ? "0" : `${d > 0 ? "+" : ""}${d}`})`;
}

function bundleCell(cur) {
  return cur == null ? "n/a" : kb(cur);
}

function hasLocChange(t, base, hasBaseline) {
  if (!hasBaseline) return false;
  if (!base) return true;
  return t.ownLoc !== base.ownLoc || t.uiLoc !== base.uiLoc;
}

const MAX_LOC_INCREASE = Number(process.env.MAX_LOC_INCREASE ?? 50);
const MAX_LOC_HARD_INCREASE = Number(process.env.MAX_LOC_HARD_INCREASE ?? 300);

function regression(t, base) {
  if (!base) return null;
  const locDelta = totalLoc(t) - totalLoc(base);
  if (locDelta > MAX_LOC_INCREASE) {
    return `LOC +${locDelta} > ${MAX_LOC_INCREASE}`;
  }
  return null;
}

function locMetrics(root) {
  return listTemplates(root).map((name) => ({
    name,
    ...footprintFor(root, name),
  }));
}

function measureAtMergeBase(root, baseRef) {
  const sha = execFileSync("git", ["merge-base", baseRef, "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const dir = mkdtempSync(join(tmpdir(), "aui-template-metrics-"));
  execFileSync("git", ["worktree", "add", "--detach", dir, sha], {
    cwd: root,
    stdio: "ignore",
  });
  try {
    return locMetrics(dir);
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", dir], {
        cwd: root,
        stdio: "ignore",
      });
    } catch {}
  }
}

function measureBase(root, outJson, baseRef) {
  writeFileSync(
    outJson,
    JSON.stringify(measureAtMergeBase(root, baseRef), null, 2),
  );
}

function check(root, baseRef) {
  const measured = locMetrics(root);
  const base = measureAtMergeBase(root, baseRef);
  const baseByName = new Map(base.map((t) => [t.name, t]));

  const failures = [];
  for (const t of measured) {
    const b = baseByName.get(t.name);
    // New templates are a product decision made in review, not bloat.
    if (!b) continue;
    const delta = totalLoc(t) - totalLoc(b);
    if (delta > MAX_LOC_HARD_INCREASE) {
      failures.push(`${t.name}: +${delta} LOC > ${MAX_LOC_HARD_INCREASE}`);
    } else if (delta > MAX_LOC_INCREASE) {
      console.log(
        `::warning::${t.name} grew by ${delta} LOC vs the merge-base (attention threshold ${MAX_LOC_INCREASE}); give the footprint a deliberate look.`,
      );
    }
  }

  if (failures.length) {
    for (const line of failures) console.error(`  ${line}`);
    console.error(
      `::error::Template install footprint grew past the hard ceiling (${MAX_LOC_HARD_INCREASE} LOC). If deliberate, raise MAX_LOC_HARD_INCREASE in .github/workflows/template-metrics.yaml within this PR.`,
    );
    process.exit(1);
  }
  console.log("Template install footprint is within the hard ceiling.");
}

function report(baseJson, headJson, outMd, commentFile) {
  const head = JSON.parse(readFileSync(headJson, "utf8"));
  const base =
    baseJson && existsSync(baseJson)
      ? JSON.parse(readFileSync(baseJson, "utf8"))
      : [];
  const baseByName = new Map(base.map((t) => [t.name, t]));
  const headByName = new Map(head.map((t) => [t.name, t]));
  const hasBaseline = base.length > 0;

  const regressions = [];
  let hasAnyLocChange = base.some((t) => !headByName.has(t.name));
  const rows = head.map((t) => {
    const b = baseByName.get(t.name);
    const reason = regression(t, b);
    if (reason) regressions.push({ name: t.name, reason });
    if (hasLocChange(t, b, hasBaseline)) hasAnyLocChange = true;
    return [
      t.name,
      locCell(t.ownLoc, b?.ownLoc),
      locCell(t.uiLoc, b?.uiLoc),
      locCell(totalLoc(t), b ? totalLoc(b) : null),
      bundleCell(t.bundleGzip),
      reason ? "⚠️" : "✅",
    ];
  });

  const lines = [
    "<!-- template-metrics -->",
    "## 📦 Template install footprint",
    "",
    "Lines copied into your project on scaffold: **Own** (template glue) + **/ui** (shared `packages/ui` components it imports). LOC cells show `current (Δ vs merge-base)`. Bundle = gzipped client JS from `next build`, measured per run for a representative subset.",
    "",
    "| Template | Own LOC | /ui LOC | Total LOC | Bundle (gz) | Status |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...rows.map((r) => `| ${r.join(" | ")} |`),
    "",
  ];

  if (base.length === 0) {
    lines.push("_No base measurements to diff against._");
  } else if (regressions.length) {
    lines.push(
      `**Needs a deliberate look** - ${regressions.length} template(s) grew past +${MAX_LOC_INCREASE} LOC vs the merge-base:`,
      ...regressions.map((r) => `- \`${r.name}\`: ${r.reason}`),
    );
  } else {
    lines.push(
      "_Within limits. Bundle measured for a representative subset; templates without a build show `n/a`._",
    );
  }

  writeFileSync(outMd, lines.join("\n"));
  if (commentFile)
    writeFileSync(
      commentFile,
      hasAnyLocChange || regressions.length ? "post" : "skip",
    );
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "measure") measure(args[0], args[1]);
else if (cmd === "measure-base")
  measureBase(args[0] || ".", args[1], args[2] || "origin/main");
else if (cmd === "check") check(args[0] || ".", args[1] || "origin/main");
else if (cmd === "report") report(args[0] || "", args[1], args[2], args[3]);
else {
  console.error(
    "usage: template-metrics.mjs measure|measure-base|check|report ...",
  );
  process.exit(1);
}
