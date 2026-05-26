import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";

const ASSISTANT_UI_PACKAGE_NAMES = new Set([
  "assistant-stream",
  "assistant-cloud",
  "assistant-ui",
]);

function isTrackedPackage(name: string | undefined): boolean {
  if (!name) return false;
  if (name.startsWith("@assistant-ui/")) return true;
  return ASSISTANT_UI_PACKAGE_NAMES.has(name);
}

export interface DiscoveredPackage {
  name: string;
  version: string;
  installPath: string;
}

interface ProcessedDir {
  set: Set<string>;
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function processPackageDir(
  pkgDir: string,
  results: DiscoveredPackage[],
  visited: ProcessedDir,
): void {
  const real = (() => {
    try {
      return fs.realpathSync(pkgDir);
    } catch {
      return pkgDir;
    }
  })();
  if (visited.set.has(real)) return;
  visited.set.add(real);

  const pkgJson = readJson(path.join(pkgDir, "package.json"));
  if (pkgJson) {
    const name = pkgJson.name as string | undefined;
    const version = pkgJson.version as string | undefined;
    if (name && version && isTrackedPackage(name)) {
      results.push({ name, version, installPath: pkgDir });
    }
  }

  walkNodeModulesAt(pkgDir, results, visited);
}

function walkNodeModulesAt(
  baseDir: string,
  results: DiscoveredPackage[],
  visited: ProcessedDir,
): void {
  const nm = path.join(baseDir, "node_modules");
  if (!fs.existsSync(nm)) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(nm, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

    if (entry.name.startsWith("@")) {
      const scopeDir = path.join(nm, entry.name);
      let scoped: fs.Dirent[];
      try {
        scoped = fs.readdirSync(scopeDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const s of scoped) {
        if (!s.isDirectory() && !s.isSymbolicLink()) continue;
        processPackageDir(path.join(scopeDir, s.name), results, visited);
      }
    } else {
      processPackageDir(path.join(nm, entry.name), results, visited);
    }
  }
}

// Discover every installation of an assistant-ui-family package reachable
// from `cwd`. Recurses into nested node_modules so transitive copies
// (the real source of duplicate-version bugs) are not missed.
export function discoverInstalledPackages(cwd: string): DiscoveredPackage[] {
  const results: DiscoveredPackage[] = [];
  const visited: ProcessedDir = { set: new Set() };
  walkNodeModulesAt(cwd, results, visited);
  return results;
}

export interface DuplicateGroup {
  name: string;
  installations: DiscoveredPackage[];
}

export function findDuplicates(
  packages: DiscoveredPackage[],
): DuplicateGroup[] {
  const byName = new Map<string, DiscoveredPackage[]>();
  for (const pkg of packages) {
    const list = byName.get(pkg.name) ?? [];
    list.push(pkg);
    byName.set(pkg.name, list);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [name, installations] of byName) {
    const versions = new Set(installations.map((i) => i.version));
    if (versions.size > 1) {
      duplicates.push({ name, installations });
    }
  }
  duplicates.sort((a, b) => a.name.localeCompare(b.name));
  return duplicates;
}

export function uniquePackageNames(packages: DiscoveredPackage[]): string[] {
  return Array.from(new Set(packages.map((p) => p.name))).sort();
}

// Package names use a restricted character set (`[a-z0-9._~-]` plus a
// leading `@scope/` for scoped packages — see the npm package-name spec)
// and the npm registry expects the scope's `@` and `/` un-encoded. So a
// simple validation + concatenation is both correct and avoids the
// CodeQL "incomplete string escaping" foot-gun of `encodeURIComponent`
// + targeted un-escape.
const VALID_NPM_NAME = /^(@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/;

async function fetchLatestVersion(name: string): Promise<string | null> {
  if (!VALID_NPM_NAME.test(name)) return null;
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}/latest`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

async function fetchAllLatestVersions(
  names: string[],
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    names.map(async (n) => [n, await fetchLatestVersion(n)] as const),
  );
  return new Map(entries);
}

interface SemverParts {
  major: number;
  minor: number;
  patch: number;
}

function parseSemver(v: string): SemverParts | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return {
    major: parseInt(m[1]!, 10),
    minor: parseInt(m[2]!, 10),
    patch: parseInt(m[3]!, 10),
  };
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a.localeCompare(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

export interface OutdatedPackage {
  name: string;
  current: string;
  latest: string;
}

export function findOutdated(
  packages: DiscoveredPackage[],
  latest: Map<string, string | null>,
): OutdatedPackage[] {
  const newestByName = new Map<string, string>();
  for (const pkg of packages) {
    const existing = newestByName.get(pkg.name);
    if (!existing || compareSemver(pkg.version, existing) > 0) {
      newestByName.set(pkg.name, pkg.version);
    }
  }

  const result: OutdatedPackage[] = [];
  for (const [name, current] of newestByName) {
    const latestVersion = latest.get(name);
    if (!latestVersion) continue;
    if (compareSemver(current, latestVersion) < 0) {
      result.push({ name, current, latest: latestVersion });
    }
  }
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

function relativeInstallPath(installPath: string, cwd: string): string {
  const rel = path.relative(cwd, installPath);
  return rel.startsWith("..") ? installPath : rel;
}

function reportDuplicates(
  duplicates: DuplicateGroup[],
  cwd: string,
  lines: string[],
): void {
  if (duplicates.length === 0) {
    lines.push(chalk.green("✓ No duplicate versions detected."));
    return;
  }

  lines.push(chalk.red.bold("✗ Duplicate versions detected:"));
  for (const dup of duplicates) {
    const versions = Array.from(
      new Set(dup.installations.map((i) => i.version)),
    )
      .sort(compareSemver)
      .join(", ");
    lines.push(chalk.red(`  ${dup.name} → ${versions}`));
    for (const inst of dup.installations) {
      lines.push(
        chalk.dim(
          `    ${inst.version}  ${relativeInstallPath(inst.installPath, cwd)}`,
        ),
      );
    }
  }
  lines.push("");
  lines.push(
    chalk.yellow(
      "Duplicates almost always cause subtle runtime bugs (see https://github.com/assistant-ui/assistant-ui/issues/4101).",
    ),
  );
  lines.push(
    chalk.yellow(
      "Fix by aligning all @assistant-ui/* packages to compatible versions — run:",
    ),
  );
  lines.push(chalk.cyan("    npx assistant-ui update"));
}

function reportOutdated(outdated: OutdatedPackage[], lines: string[]): void {
  if (outdated.length === 0) {
    lines.push(chalk.green("✓ All assistant-ui packages are up to date."));
    return;
  }

  lines.push(chalk.yellow.bold("! Outdated packages:"));
  const maxLen = Math.max(...outdated.map((o) => o.name.length));
  for (const o of outdated) {
    lines.push(
      chalk.yellow(
        `  ${o.name.padEnd(maxLen)}  ${o.current} → ${o.latest} (latest)`,
      ),
    );
  }
  lines.push("");
  lines.push(chalk.yellow("Run the following to upgrade everything:"));
  lines.push(chalk.cyan("    npx assistant-ui update"));
}

export const doctor = new Command()
  .name("doctor")
  .description(
    "Diagnose mismatched or outdated assistant-ui packages (including transitive ones).",
  )
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("--no-network", "Skip the npm registry check for latest versions.")
  .action(async (opts: { cwd: string; network: boolean }) => {
    const cwd = path.resolve(opts.cwd);
    const packageJsonPath = path.join(cwd, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      console.error(
        chalk.red("No package.json found in the current directory."),
      );
      process.exit(1);
    }

    console.log("");
    console.log(chalk.bold("Running assistant-ui doctor..."));
    console.log("");

    const installed = discoverInstalledPackages(cwd);

    if (installed.length === 0) {
      console.log(
        chalk.yellow(
          "No assistant-ui packages found in node_modules. Did you run `npm install`?",
        ),
      );
      console.log("");
      return;
    }

    const duplicates = findDuplicates(installed);

    let latest = new Map<string, string | null>();
    if (opts.network) {
      latest = await fetchAllLatestVersions(uniquePackageNames(installed));
    }
    const outdated = findOutdated(installed, latest);

    const lines: string[] = [];
    reportDuplicates(duplicates, cwd, lines);
    lines.push("");
    if (opts.network) {
      reportOutdated(outdated, lines);
    } else {
      lines.push(chalk.dim("Skipped npm registry check (--no-network)."));
    }

    for (const line of lines) console.log(line);
    console.log("");

    if (duplicates.length > 0) {
      process.exitCode = 1;
    }
  });
