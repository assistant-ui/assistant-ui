import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

export const SIZE_IGNORE = new Set([
  "assistant-ui",
  "create-assistant-ui",
  "@assistant-ui/x-buildutils",
  "@assistant-ui/x-generative-compiler",
  "@assistant-ui/mcp-docs-server",
  "@assistant-ui/next",
  "@assistant-ui/metro",
  "@assistant-ui/vite",
  "@assistant-ui/agent-launcher",
]);

const isJavaScript = (file) =>
  file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs");

const resolveExport = (value) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  if (value.import !== undefined) return resolveExport(value.import);
  if (value.default !== undefined) return resolveExport(value.default);
  return undefined;
};

export const listEntries = (pkg, pkgDir) => {
  const exports = pkg.exports;
  const entries = [];
  const add = (subpath, value) => {
    const file = resolveExport(value);
    if (
      subpath.includes("*") ||
      subpath === "./package.json" ||
      !file ||
      !isJavaScript(file)
    )
      return;
    entries.push({ subpath, file: resolve(pkgDir, file) });
  };

  if (typeof exports === "string") add(".", exports);
  else if (exports && typeof exports === "object" && !Array.isArray(exports)) {
    const subpaths = Object.keys(exports).filter((key) => key.startsWith("."));
    if (subpaths.length) {
      for (const subpath of subpaths) add(subpath, exports[subpath]);
    } else {
      add(".", exports);
    }
  } else {
    const file = pkg.module ?? pkg.main;
    if (typeof file === "string") add(".", file);
  }

  return entries;
};

export const measureEntry = async (file) => {
  const { rolldown } = await import("rolldown");
  const bundle = await rolldown({
    input: file,
    platform: "neutral",
    external: (id) =>
      !id.startsWith(".") && !id.startsWith("#") && !isAbsolute(id),
    logLevel: "silent",
  });
  try {
    const { output } = await bundle.generate({ format: "esm", minify: true });
    const code = output
      .filter((item) => item.type === "chunk")
      .map((item) => item.code)
      .join("");
    return {
      min: Buffer.byteLength(code, "utf8"),
      gzip: gzipSync(code, { level: 9 }).length,
    };
  } finally {
    await bundle.close();
  }
};

export const budgetStatus = (budget, actual) => {
  if (!Number.isFinite(budget?.gzip)) return "new";
  const tolerance = Math.max(Math.round(budget.gzip * 0.02), 256);
  if (actual.gzip > budget.gzip + tolerance) return "over";
  if (actual.gzip < budget.gzip - tolerance) return "under";
  return "ok";
};

/**
 * Names of the packages whose files differ from the merge base with
 * origin/main, committed or not. Every entry is externalized to bare imports
 * when measured, so only a package's own files can move its size — this is the
 * set whose local dists an update may trust. Returns null when the set cannot
 * be determined (repoRoot is not the root of a git work tree, or there is no
 * origin/main), in which case every package is treated as changed.
 */
export const changedPackageNames = (repoRoot) => {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
  let files;
  try {
    // Paths arrive relative to the work tree's root, so a repoRoot nested in
    // some other work tree would match none of them and read as an empty set,
    // which withholds every entry instead of falling back.
    if (
      realpathSync(git("rev-parse", "--show-toplevel").trim()) !==
      realpathSync(repoRoot)
    )
      return null;
    const base = git("merge-base", "HEAD", "origin/main").trim();
    files = [
      ...git("diff", "--name-only", "--no-renames", "-z", base, "--").split(
        "\0",
      ),
      ...git("status", "--porcelain", "--no-renames", "-z")
        .split("\0")
        .map((line) => line.slice(3)),
    ];
  } catch {
    return null;
  }
  const names = new Set();
  for (const file of files) {
    const match = /^packages\/([^/]+)\//.exec(file);
    if (!match) continue;
    const manifestPath = join(repoRoot, "packages", match[1], "package.json");
    if (!existsSync(manifestPath)) continue;
    const name = JSON.parse(readFileSync(manifestPath, "utf8")).name;
    if (typeof name === "string") names.add(name);
  }
  return names;
};

const readBudgets = (budgetsPath) =>
  existsSync(budgetsPath) ? JSON.parse(readFileSync(budgetsPath, "utf8")) : {};

const cloneBudgets = (budgets) =>
  Object.fromEntries(
    Object.entries(budgets).map(([name, entries]) => [name, { ...entries }]),
  );

const sortBudgets = (budgets) =>
  Object.fromEntries(
    Object.keys(budgets)
      .sort()
      .filter((name) => Object.keys(budgets[name]).length)
      .map((name) => [
        name,
        Object.fromEntries(
          Object.keys(budgets[name])
            .sort()
            .map((subpath) => [subpath, budgets[name][subpath]]),
        ),
      ]),
  );

const budgetCount = (budgets) =>
  Object.values(budgets).reduce(
    (count, entries) => count + Object.keys(entries).length,
    0,
  );

const percentDelta = (budget, actual) => {
  const delta = ((actual.gzip - budget.gzip) / budget.gzip) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
};

const tableRow = (row) => ({
  entry: `${row.package} ${row.subpath}`,
  "gzip budget": row.budget?.gzip ?? "",
  gzip: row.gzip ?? "",
  delta:
    row.budget && row.gzip !== undefined ? percentDelta(row.budget, row) : "",
  status: row.status,
});

export const checkSizes = async ({
  repoRoot,
  budgetsPath,
  update = false,
  updateAll = false,
  json,
}) => {
  const budgets = readBudgets(budgetsPath);
  const nextBudgets = cloneBudgets(budgets);
  // A dist a PR never touched is often older than the merge base or built by
  // a different toolchain, so re-recording it would land a stale value that
  // surfaces as an unexplained `over` on the next PR that really touches the
  // package. An update trusts only dists of packages changed vs origin/main.
  const changed = update && !updateAll ? changedPackageNames(repoRoot) : null;
  const recordable = (name) => changed === null || changed.has(name);
  let keptEntries = 0;
  const declaredEntries = new Map();
  const rows = [];
  const measured = new Set();
  const packageDirs = readdirSync(join(repoRoot, "packages"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const directory of packageDirs) {
    const pkgDir = join(repoRoot, "packages", directory.name);
    const manifestPath = join(pkgDir, "package.json");
    if (!existsSync(manifestPath)) continue;
    const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (typeof pkg.name !== "string") continue;
    const entries = listEntries(pkg, pkgDir);
    declaredEntries.set(
      pkg.name,
      new Set(entries.map((entry) => entry.subpath)),
    );

    if (pkg.private === true || SIZE_IGNORE.has(pkg.name)) continue;
    for (const entry of entries) {
      const budget = budgets[pkg.name]?.[entry.subpath];
      if (!existsSync(entry.file)) {
        rows.push({
          package: pkg.name,
          subpath: entry.subpath,
          min: null,
          gzip: null,
          budget: budget ?? null,
          status: "skipped (not built)",
        });
        continue;
      }

      const actual = await measureEntry(entry.file);
      const status = budgetStatus(budget, actual);
      // Withholding a `new` entry would leave the check red with no run able
      // to clear it, so only a move away from a recorded budget is withheld.
      const drifted = status === "over" || status === "under";
      const kept = update && drifted && !recordable(pkg.name);
      rows.push({
        package: pkg.name,
        subpath: entry.subpath,
        ...actual,
        budget: budget ?? null,
        status: kept ? `${status} (kept: unchanged vs origin/main)` : status,
      });
      measured.add(`${pkg.name}\u0000${entry.subpath}`);
      if (status !== "ok" && !kept) {
        nextBudgets[pkg.name] ??= {};
        nextBudgets[pkg.name][entry.subpath] = actual;
      }
      if (kept) keptEntries += 1;
    }
  }

  for (const [name, entries] of Object.entries(budgets)) {
    for (const [subpath, budget] of Object.entries(entries)) {
      if (measured.has(`${name}\u0000${subpath}`)) continue;
      if (declaredEntries.get(name)?.has(subpath)) continue;
      rows.push({
        package: name,
        subpath,
        min: null,
        gzip: null,
        budget,
        status: "stale",
      });
      delete nextBudgets[name][subpath];
    }
  }

  console.table(rows.map(tableRow));

  if (json) {
    writeFileSync(
      json,
      `${JSON.stringify(
        {
          schema: "aui-perf/size@1",
          generatedAt: new Date().toISOString(),
          rows,
        },
        null,
        2,
      )}\n`,
    );
  }

  if (update) {
    const sortedBudgets = sortBudgets(nextBudgets);
    writeFileSync(budgetsPath, `${JSON.stringify(sortedBudgets, null, 2)}\n`);
    console.log(`wrote ${budgetCount(sortedBudgets)} size budget entries`);
    if (!updateAll && changed === null) {
      console.log(
        "could not determine the packages changed vs origin/main, so every drifted entry was re-recorded; check that this is a git work tree with an origin/main",
      );
    }
    if (keptEntries > 0) {
      console.log(
        `kept ${keptEntries} drifted entr${keptEntries === 1 ? "y" : "ies"} of packages unchanged vs origin/main (their local dists are not this branch's claim); run pnpm size:update:all to re-record them`,
      );
    }
    return true;
  }

  const hasFailure = rows.some((row) =>
    ["new", "over", "under", "stale"].includes(row.status),
  );
  if (hasFailure) {
    console.log(
      "size budgets need updating: run pnpm size:update. A shrink beyond tolerance also needs the update so the file stays truthful. That run keeps the entries of packages unchanged vs origin/main, so a move a toolchain change caused, or a re-baseline on main, needs pnpm size:update:all instead.",
    );
  }
  return !hasFailure;
};
