import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { ensureRefWorktree } from "./ref-worktree.mjs";
import { envStamp, git } from "./suite.mjs";

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

const REPORT_MARKER = "<!-- aui-size-report -->";

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

const publishedPackages = (root) => {
  const packages = new Map();
  for (const directory of readdirSync(join(root, "packages"), {
    withFileTypes: true,
  })) {
    const pkgDir = join(root, "packages", directory.name);
    const manifestPath = join(pkgDir, "package.json");
    if (!directory.isDirectory() || !existsSync(manifestPath)) continue;
    const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (
      typeof pkg.name !== "string" ||
      pkg.private === true ||
      SIZE_IGNORE.has(pkg.name)
    )
      continue;
    packages.set(pkg.name, listEntries(pkg, pkgDir));
  }
  return packages;
};

export const measurePackages = async (root, names) => {
  const packages = publishedPackages(root);
  const sizes = new Map();
  for (const name of names) {
    for (const { subpath, file } of packages.get(name) ?? []) {
      if (!existsSync(file))
        throw new Error(`${name} ${subpath} was not built: ${file} is missing`);
      sizes.set(`${name} ${subpath}`, await measureEntry(file));
    }
  }
  return sizes;
};

export const diffSizes = (base, head) =>
  [...new Set([...base.keys(), ...head.keys()])]
    .map((entry) => {
      const before = base.get(entry)?.gzip ?? null;
      const after = head.get(entry)?.gzip ?? null;
      const delta = (after ?? 0) - (before ?? 0);
      const status =
        before === null
          ? "new"
          : after === null
            ? "removed"
            : delta === 0
              ? "same"
              : "moved";
      return { entry, base: before, head: after, delta, status };
    })
    .sort(
      (a, b) =>
        Math.abs(b.delta) - Math.abs(a.delta) || a.entry.localeCompare(b.entry),
    );

const bytes = (value) => `${value.toLocaleString("en-US")} B`;

const change = (row) => {
  if (row.status !== "moved") return row.status;
  const sign = row.delta > 0 ? "+" : "-";
  const percent = ((Math.abs(row.delta) / row.base) * 100).toFixed(1);
  return `${sign}${bytes(Math.abs(row.delta))} (${sign}${percent}%)`;
};

const tally = (rows) => {
  const changed = rows.filter((row) => row.status !== "same").length;
  return `${changed} of ${rows.length} measured ${rows.length === 1 ? "entry" : "entries"} changed`;
};

export const renderSizeReport = (rows, { base, head }) =>
  [
    REPORT_MARKER,
    `**Bundle size** of \`${head}\` against \`${base}\`: ${tally(rows)}.`,
    "",
    "| Entry | Base | Head | Change |",
    "| --- | ---: | ---: | ---: |",
    ...rows
      .filter((row) => row.status !== "same")
      .map(
        (row) =>
          `| \`${row.entry}\` | ${row.base === null ? "" : bytes(row.base)} | ${row.head === null ? "" : bytes(row.head)} | ${change(row)} |`,
      ),
    "",
    "Gzip bytes of each published entry of the packages this change builds, minified by rolldown with every bare import external.",
    "",
  ].join("\n");

const turbo = (root, args, stdout = "pipe") =>
  execFileSync(join(root, "node_modules", ".bin", "turbo"), args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", stdout, "inherit"],
  });

// Dependents are selected because every package devDepends on x-buildutils, which is how a build tool change reaches every entry.
const affectedPackages = (root, base) =>
  JSON.parse(
    turbo(root, ["run", "build", `--filter=...[${base}]`, "--dry=json"]),
  ).packages;

const build = (root, names) => {
  turbo(
    root,
    [
      "run",
      "build",
      "--ui=stream",
      "--output-logs=errors-only",
      ...names.map((name) => `--filter=${name}`),
    ],
    2,
  );
};

export const compareSizes = async ({ root, ref, report }) => {
  if (report) rmSync(report, { force: true });
  const base = git(["merge-base", "HEAD", ref], root);
  if (base === "unknown")
    throw new Error(`cannot resolve the merge base of HEAD and ${ref}`);
  const { sha, dirty } = envStamp(root);
  const labels = {
    base: git(["rev-parse", "--short", base], root),
    head: dirty ? `${sha}, dirty` : sha,
  };
  const onHead = publishedPackages(root);
  const names = affectedPackages(root, base).filter((name) => onHead.has(name));
  // A deleted or newly private package is invisible to turbo here, so a changed manifest is what sends the run to the base to report it as removed.
  const manifests = git(
    ["diff", "--name-only", base, "--", "packages/*/package.json"],
    root,
  );
  if (names.length === 0 && manifests === "") {
    console.log(`no published package changed against ${labels.base}`);
    return;
  }

  if (names.length > 0) build(root, names);
  const { wt } = ensureRefWorktree(base, { build: false });
  execFileSync("pnpm", ["install"], {
    cwd: wt,
    stdio: ["ignore", 2, "inherit"],
    env: { ...process.env, CI: "true" },
  });
  const baseNames = [...publishedPackages(wt).keys()].filter(
    (name) => names.includes(name) || !onHead.has(name),
  );
  if (baseNames.length > 0) build(wt, baseNames);

  const rows = diffSizes(
    await measurePackages(wt, baseNames),
    await measurePackages(root, names),
  );
  const changed = rows.filter((row) => row.status !== "same");
  if (changed.length > 0)
    console.table(
      changed.map((row) => ({
        entry: row.entry,
        base: row.base ?? "",
        head: row.head ?? "",
        change: change(row),
      })),
    );
  console.log(`${tally(rows)} against ${labels.base}`);
  if (report && changed.length > 0)
    writeFileSync(report, renderSizeReport(rows, labels));
};
