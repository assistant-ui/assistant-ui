#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { optionArgs, optionValues } from "./lib/script-options.mjs";

const TSC_ERROR = /^(.+)\(\d+,\d+\): error TS\d+:/;

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function posixPath(file) {
  return file.replaceAll("\\", "/");
}

function spawnTsc(repoRoot, args) {
  const local = path.join(repoRoot, "node_modules", ".bin", "tsc");
  return spawnSync(existsSync(local) ? local : "tsc", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function collectTypeTargets(value) {
  if (!value || typeof value !== "object") return [];
  if (typeof value.types === "string") return [value.types];
  return Object.values(value).flatMap(collectTypeTargets);
}

function declarationFilesForTarget(packageDir, typePath) {
  if (!typePath.includes("*")) {
    const file = path.resolve(packageDir, typePath);
    if (!existsSync(file)) {
      throw new Error(
        `Missing declaration file ${typePath}. Run the package build first.`,
      );
    }
    return [file];
  }

  if (typePath.split("*").length !== 2) {
    throw new Error(
      `Only one wildcard is supported in declaration path ${typePath}.`,
    );
  }

  const [prefix, suffix] = typePath.split("*");
  const dir = path.resolve(packageDir, prefix);
  if (!existsSync(dir)) {
    throw new Error(
      `No declaration files matched ${typePath}. Run the package build first.`,
    );
  }

  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => path.join(dir, entry.name))
    .sort();

  if (files.length === 0) {
    throw new Error(
      `No declaration files matched ${typePath}. Run the package build first.`,
    );
  }
  return files;
}

export function collectDeclarationEntries(packageDir, pkg) {
  const entries = [];
  if (pkg.exports && typeof pkg.exports === "object") {
    for (const [exportPath, exportValue] of Object.entries(pkg.exports)) {
      for (const typePath of collectTypeTargets(exportValue)) {
        for (const file of declarationFilesForTarget(packageDir, typePath)) {
          entries.push({ exportPath, file });
        }
      }
    }
  }

  if (entries.length === 0 && typeof pkg.types === "string") {
    for (const file of declarationFilesForTarget(packageDir, pkg.types)) {
      entries.push({ exportPath: ".", file });
    }
  }

  return entries.sort((a, b) => a.file.localeCompare(b.file));
}

export function createDeclarationProbe(packageDir, pkg) {
  const entries = collectDeclarationEntries(packageDir, pkg);
  if (entries.length === 0) return null;

  const tempDir = mkdtempSync(path.join(packageDir, ".strict-libcheck-"));
  const paths = {};
  const imports = [];
  for (const [index, entry] of entries.entries()) {
    const alias = `__assistant_ui_strict_libcheck_${index}__`;
    paths[alias] = [posixPath(path.relative(tempDir, entry.file))];
    imports.push(`import "${alias}";`);
  }

  writeFileSync(path.join(tempDir, "probe.ts"), `${imports.join("\n")}\n`);
  writeFileSync(
    path.join(tempDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        extends: "../tsconfig.json",
        compilerOptions: {
          composite: false,
          incremental: false,
          noEmit: true,
          paths,
          skipLibCheck: false,
        },
        files: ["probe.ts"],
        include: [],
      },
      null,
      2,
    )}\n`,
  );

  return {
    configPath: path.join(tempDir, "tsconfig.json"),
    entries,
    remove() {
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export function parseTscErrorFiles(output) {
  const files = [];
  for (const line of output.split("\n")) {
    const match = TSC_ERROR.exec(line);
    if (match) files.push(match[1]);
  }
  return files;
}

export function parseUnanchoredTscErrors(output) {
  return output
    .split("\n")
    .filter((line) => /^\s*error TS\d+:/.test(line) && !TSC_ERROR.test(line));
}

export function isOwnDeclarationFile(packageDir, file, cwd) {
  const resolved = path.resolve(cwd, file);
  const root = path.resolve(packageDir);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return false;
  }
  return !resolved.split(path.sep).includes("node_modules");
}

export function ownDeclarationDiagnostics(packageDir, output, cwd) {
  return parseTscErrorFiles(output).filter((file) =>
    isOwnDeclarationFile(packageDir, file, cwd),
  );
}

export function declarationGateResult({
  spawnError,
  status,
  ownFiles,
  parsedFiles,
  unanchoredLines = [],
}) {
  if (spawnError || status == null) return "spawn-failed";
  if (ownFiles.length > 0) return "own-errors";
  if (
    status !== 0 &&
    (parsedFiles.length === 0 || unanchoredLines.length > 0)
  ) {
    return "unparsed-failure";
  }
  return "pass";
}

function collectPackages(repoRoot, filteredPackageNames) {
  const packagesRoot = path.join(repoRoot, "packages");
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesRoot, entry.name, "package.json"))
    .filter(existsSync)
    .map((packageJsonPath) => ({
      packageDir: path.dirname(packageJsonPath),
      pkg: readJson(packageJsonPath),
    }))
    .filter(({ pkg }) => !pkg.private)
    .filter(
      ({ pkg }) => !filteredPackageNames || filteredPackageNames.has(pkg.name),
    )
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
}

function collectTurboFilteredPackageNames(repoRoot, filters) {
  if (filters.length === 0) return null;
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "turbo",
      "ls",
      ...optionArgs("--filter", filters),
      "--output=json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `Failed to list filtered packages:\n${result.stdout}${result.stderr}`,
    );
  }

  const jsonStart = result.stdout.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(`Turbo did not return JSON output:\n${result.stdout}`);
  }
  const output = JSON.parse(result.stdout.slice(jsonStart));
  return new Set(output.packages.items.map((item) => item.name));
}

function checkPackage(repoRoot, packageDir, pkg) {
  let probe;
  try {
    probe = createDeclarationProbe(packageDir, pkg);
  } catch (error) {
    console.error(`${pkg.name}: ${error.message}`);
    return 1;
  }
  if (!probe) return 0;

  try {
    console.log(
      `Checking ${pkg.name} (${probe.entries.length} declaration entries)`,
    );
    const result = spawnTsc(repoRoot, [
      "--project",
      probe.configPath,
      "--pretty",
      "false",
    ]);
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const parsedFiles = parseTscErrorFiles(output);
    const unanchoredLines = parseUnanchoredTscErrors(output);
    const own = ownDeclarationDiagnostics(packageDir, output, repoRoot);
    const gate = declarationGateResult({
      spawnError: result.error,
      status: result.status,
      ownFiles: own,
      parsedFiles,
      unanchoredLines,
    });
    if (gate === "pass") return 0;
    if (gate === "spawn-failed") {
      process.stdout.write(`${result.error ?? gate}\n`);
      return 1;
    }
    if (gate === "own-errors") {
      const ownFiles = new Set(own);
      const lines = output.split("\n").filter((line) => {
        const match = TSC_ERROR.exec(line);
        return match !== null && ownFiles.has(match[1]);
      });
      process.stdout.write(`${lines.join("\n")}\n`);
      return 1;
    }
    process.stdout.write(output || `${gate}\n`);
    return 1;
  } finally {
    probe.remove();
  }
}

export function isExecutedAsMain(metaUrl, argv1) {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}

function main() {
  const repoRoot = process.cwd();
  const filters = optionValues(process.argv.slice(2), "--filter");
  const filteredPackageNames = collectTurboFilteredPackageNames(
    repoRoot,
    filters,
  );
  const packages = collectPackages(repoRoot, filteredPackageNames);
  if (packages.length === 0) {
    console.log("No public packages matched the filter.");
    return;
  }

  let failed = false;
  for (const { packageDir, pkg } of packages) {
    if (checkPackage(repoRoot, packageDir, pkg) !== 0) failed = true;
  }
  if (failed) process.exitCode = 1;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  main();
}
