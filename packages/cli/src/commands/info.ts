import { Command } from "commander";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import chalk from "chalk";
import { detect } from "detect-package-manager";

const ASSISTANT_UI_PACKAGES = [
  // Distribution
  "@assistant-ui/react",
  "@assistant-ui/react-native",
  "@assistant-ui/react-ink",
  // Core (should not be installed directly)
  "@assistant-ui/core",
  "@assistant-ui/store",
  "@assistant-ui/tap",
  // Streaming & Cloud
  "assistant-stream",
  "assistant-cloud",
  "@assistant-ui/cloud-ai-sdk",
  // Adapters
  "@assistant-ui/react-ai-sdk",
  "@assistant-ui/react-langgraph",
  "@assistant-ui/react-ag-ui",
  "@assistant-ui/react-a2a",
  "@assistant-ui/react-data-stream",
  "@assistant-ui/react-google-adk",
  // UI / Rendering
  "@assistant-ui/react-markdown",
  "@assistant-ui/react-streamdown",
  "@assistant-ui/react-lexical",
  "@assistant-ui/react-syntax-highlighter",
  "@assistant-ui/react-hook-form",
  // Observability & DevTools
  "@assistant-ui/react-o11y",
  "@assistant-ui/react-devtools",
];

const ECOSYSTEM_PACKAGES = [
  "react",
  "react-dom",
  "react-native",
  "next",
  "vite",
  "expo",
  "ai",
  "zod",
  "zustand",
  "typescript",
];

// Packages that users should NOT install directly — they are internal
// dependencies pulled in automatically by distribution packages.
const SHOULD_NOT_DIRECT_INSTALL = new Set([
  "@assistant-ui/core",
  "@assistant-ui/store",
  "@assistant-ui/tap",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePackageJson(pkg: string, cwd: string): string | null {
  let dir = cwd;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(
      dir,
      "node_modules",
      ...pkg.split("/"),
      "package.json",
    );
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

function getInstalledVersion(pkg: string, cwd: string): string | null {
  try {
    const pkgJsonPath = resolvePackageJson(pkg, cwd);
    if (pkgJsonPath) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      return pkgJson.version ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

function findWorkspaceRoot(cwd: string): string | null {
  let dir = path.dirname(cwd);
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
        // ignore
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

function readProjectDeps(
  projectPkg: Record<string, unknown>,
): Record<string, string> {
  return {
    ...((projectPkg.dependencies ?? {}) as Record<string, string>),
    ...((projectPkg.devDependencies ?? {}) as Record<string, string>),
  };
}

function getSpecifiedRange(
  pkg: string,
  projectPkg: Record<string, unknown>,
): string | null {
  const deps = (projectPkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (projectPkg.devDependencies ?? {}) as Record<string, string>;
  return deps[pkg] ?? devDeps[pkg] ?? null;
}

function getPeerDeps(pkg: string, cwd: string): Record<string, string> | null {
  try {
    const pkgJsonPath = resolvePackageJson(pkg, cwd);
    if (pkgJsonPath) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      return (pkgJson.peerDependencies as Record<string, string>) ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

function detectFramework(
  projectPkg: Record<string, unknown>,
  cwd: string,
): string {
  const deps = readProjectDeps(projectPkg);

  if (deps.next) {
    const v = getInstalledVersion("next", cwd);
    return `Next.js ${v ?? deps.next}`;
  }
  if (deps.expo) {
    const v = getInstalledVersion("expo", cwd);
    return `Expo ${v ?? deps.expo}`;
  }
  if (deps.vite) {
    const v = getInstalledVersion("vite", cwd);
    return `Vite ${v ?? deps.vite}`;
  }
  if (deps["@remix-run/react"] || deps.remix) return "Remix";
  if (deps.gatsby) return "Gatsby";
  if (deps.astro) return "Astro";
  return "Unknown";
}

function getOsInfo(): string {
  const platform = os.platform();
  const arch = os.arch();
  const release = os.release();

  switch (platform) {
    case "darwin": {
      const result = spawnSync("sw_vers", ["-productVersion"], {
        encoding: "utf8",
      });
      const macVer = result.stdout?.trim();
      return macVer
        ? `macOS ${macVer} (${arch})`
        : `macOS ${release} (${arch})`;
    }
    case "win32":
      return `Windows ${release} (${arch})`;
    case "linux":
      return `Linux ${release} (${arch})`;
    default:
      return `${platform} ${release} (${arch})`;
  }
}

async function getPackageManagerInfo(
  cwd: string,
): Promise<{ name: string; version: string }> {
  const pm = await detect({ cwd });
  const result = spawnSync(pm, ["--version"], {
    encoding: "utf8",
    cwd,
  });
  const version = result.stdout?.trim() ?? "unknown";
  return { name: pm, version };
}

function satisfiesRange(version: string, range: string): boolean {
  if (range === "*" || range === "any") return true;

  const clean = (v: string) => v.replace(/^[^\d]*/, "");
  const major = (v: string) => parseInt(clean(v).split(".")[0]!, 10);

  if (range.includes("||")) {
    return range
      .split("||")
      .some((part) => satisfiesRange(version, part.trim()));
  }

  const rangeMajor = major(range);
  const versionMajor = major(version);

  if (Number.isNaN(rangeMajor) || Number.isNaN(versionMajor)) return true;

  if (range.startsWith("^")) return versionMajor >= rangeMajor;
  if (range.startsWith(">=")) return versionMajor >= rangeMajor;

  return versionMajor >= rangeMajor;
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

interface PackageInfo {
  name: string;
  version: string;
  range: string | null;
}

interface InfoData {
  os: string;
  node: string;
  pm: { name: string; version: string };
  framework: string;
  isMonorepo: boolean;
  packages: PackageInfo[];
  ecosystem: PackageInfo[];
  warnings: string[];
}

function collectPackages(
  names: string[],
  cwd: string,
  projectPkg: Record<string, unknown>,
): PackageInfo[] {
  const result: PackageInfo[] = [];
  const deps = readProjectDeps(projectPkg);

  for (const name of names) {
    const version = getInstalledVersion(name, cwd);
    if (version) {
      result.push({
        name,
        version,
        range: getSpecifiedRange(name, projectPkg),
      });
    } else {
      // Fallback: no node_modules, show range from package.json
      const range = deps[name];
      if (range && !range.startsWith("workspace:")) {
        result.push({ name, version: `${range} (not installed)`, range });
      }
    }
  }
  return result;
}

function collectWarnings(
  packages: PackageInfo[],
  cwd: string,
  projectPkg: Record<string, unknown>,
): string[] {
  const warnings: string[] = [];
  const deps = readProjectDeps(projectPkg);

  // Check peer dependency mismatches
  for (const pkg of packages) {
    const peerDeps = getPeerDeps(pkg.name, cwd);
    if (!peerDeps) continue;

    for (const [peerName, peerRange] of Object.entries(peerDeps)) {
      const peerVersion = getInstalledVersion(peerName, cwd);
      if (!peerVersion) continue;
      if (!satisfiesRange(peerVersion, peerRange)) {
        warnings.push(
          `${pkg.name} requires ${peerName} ${peerRange}, found ${peerVersion}`,
        );
      }
    }
  }

  // Check for direct install of internal packages
  for (const name of SHOULD_NOT_DIRECT_INSTALL) {
    if (deps[name]) {
      warnings.push(
        `${name} should not be installed directly — it is an internal dependency`,
      );
    }
  }

  return warnings;
}

async function collectInfo(
  cwd: string,
  projectPkg: Record<string, unknown>,
): Promise<InfoData> {
  const pm = await getPackageManagerInfo(cwd);
  const packages = collectPackages(ASSISTANT_UI_PACKAGES, cwd, projectPkg);
  const ecosystem = collectPackages(ECOSYSTEM_PACKAGES, cwd, projectPkg);
  const warnings = collectWarnings(packages, cwd, projectPkg);

  return {
    os: getOsInfo(),
    node: process.version,
    pm,
    framework: detectFramework(projectPkg, cwd),
    isMonorepo: findWorkspaceRoot(cwd) !== null,
    packages,
    ecosystem,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function formatSection(label: string, items: PackageInfo[]): string[] {
  if (items.length === 0) return [];
  const lines: string[] = [];
  lines.push("");
  lines.push(`${label}:`);
  const maxLen = Math.max(...items.map((p) => p.name.length));
  for (const pkg of items) {
    lines.push(`  ${pkg.name.padEnd(maxLen)}  ${pkg.version}`);
  }
  return lines;
}

function renderPlain(data: InfoData): string[] {
  const lines: string[] = [];

  lines.push("Environment:");
  lines.push(`  OS:               ${data.os}`);
  lines.push(`  Node.js:          ${data.node}`);
  lines.push(`  Package Manager:  ${data.pm.name} ${data.pm.version}`);
  lines.push(`  Framework:        ${data.framework}`);
  if (data.isMonorepo) {
    lines.push(`  Monorepo:         yes`);
  }

  lines.push(...formatSection("Packages", data.packages));
  lines.push(...formatSection("Ecosystem", data.ecosystem));

  if (data.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of data.warnings) {
      lines.push(`  ! ${w}`);
    }
  }

  return lines;
}

function renderColored(data: InfoData): string[] {
  const lines: string[] = [];

  lines.push(chalk.bold("Environment:"));
  lines.push(`  OS:               ${data.os}`);
  lines.push(`  Node.js:          ${data.node}`);
  lines.push(`  Package Manager:  ${data.pm.name} ${data.pm.version}`);
  lines.push(`  Framework:        ${data.framework}`);
  if (data.isMonorepo) {
    lines.push(`  Monorepo:         yes`);
  }

  if (data.packages.length > 0) {
    const section = formatSection("Packages", data.packages);
    section[0] = "";
    section[1] = chalk.bold("Packages:");
    lines.push(...section);
  } else {
    lines.push("");
    lines.push(chalk.yellow("  No assistant-ui packages found."));
  }

  if (data.ecosystem.length > 0) {
    const section = formatSection("Ecosystem", data.ecosystem);
    section[0] = "";
    section[1] = chalk.bold("Ecosystem:");
    lines.push(...section);
  }

  if (data.warnings.length > 0) {
    lines.push("");
    lines.push(chalk.yellow.bold("Warnings:"));
    for (const w of data.warnings) {
      lines.push(chalk.yellow(`  ! ${w}`));
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const info = new Command()
  .name("info")
  .description("Print environment and package information for bug reports.")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .action(async (opts) => {
    const cwd = path.resolve(opts.cwd);
    const packageJsonPath = path.join(cwd, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      console.error(
        chalk.red("No package.json found in the current directory."),
      );
      process.exit(1);
    }

    const projectPkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const data = await collectInfo(cwd, projectPkg);

    // Colored output for terminal
    console.log("");
    for (const line of renderColored(data)) {
      console.log(line);
    }
    console.log("");

    // Copyable plain text
    const plain = renderPlain(data);
    const block = ["```", ...plain, "```"].join("\n");

    console.log(chalk.dim("— Copy the text below into your bug report —"));
    console.log("");
    console.log(block);
    console.log("");
  });
