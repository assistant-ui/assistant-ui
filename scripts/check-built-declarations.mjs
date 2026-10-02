#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { optionValues } from "./lib/script-options.mjs";
import {
  collectPackages,
  collectTurboFilteredPackageNames,
  posixPath,
} from "./lib/workspace.mjs";

const TSC_ERROR = /^(.+)\(\d+,\d+\): error TS\d+:/;

function spawnTsc(repoRoot, args) {
  const local = path.join(repoRoot, "node_modules", ".bin", "tsc");
  return new Promise((resolve) => {
    execFile(
      existsSync(local) ? local : "tsc",
      args,
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        const exited = !error || typeof error.code === "number";
        resolve({
          status: exited ? (error?.code ?? 0) : null,
          error: exited ? undefined : error,
          stdout,
          stderr,
        });
      },
    );
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

export async function checkPackage(repoRoot, packageDir, pkg) {
  const result = { status: 0, stdout: "", stderr: "" };
  let probe;
  try {
    probe = createDeclarationProbe(packageDir, pkg);
  } catch (error) {
    result.stderr = `${pkg.name}: ${error.message}\n`;
    result.status = 1;
    return result;
  }
  if (!probe) return result;

  try {
    result.stdout = `Checking ${pkg.name} (${probe.entries.length} declaration entries)\n`;
    const compiler = await spawnTsc(repoRoot, [
      "--project",
      probe.configPath,
      "--pretty",
      "false",
    ]);
    const output = `${compiler.stdout ?? ""}${compiler.stderr ?? ""}`;
    const parsedFiles = parseTscErrorFiles(output);
    const unanchoredLines = parseUnanchoredTscErrors(output);
    const own = ownDeclarationDiagnostics(packageDir, output, repoRoot);
    const gate = declarationGateResult({
      spawnError: compiler.error,
      status: compiler.status,
      ownFiles: own,
      parsedFiles,
      unanchoredLines,
    });
    if (gate === "pass") return result;
    result.status = 1;
    if (gate === "spawn-failed") {
      result.stdout += `${compiler.error ?? gate}\n`;
      return result;
    }
    if (gate === "own-errors") {
      const ownFiles = new Set(own);
      const lines = output.split("\n").filter((line) => {
        const match = TSC_ERROR.exec(line);
        return match !== null && ownFiles.has(match[1]);
      });
      result.stdout += `${lines.join("\n")}\n`;
      return result;
    }
    result.stdout += output || `${gate}\n`;
    return result;
  } finally {
    probe.remove();
  }
}

export function declarationConcurrency(value) {
  if (value === undefined) return Math.min(2, availableParallelism());
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error("--concurrency must be a positive integer.");
  }
  return Number(value);
}

export async function checkPackages(
  repoRoot,
  packages,
  concurrency,
  check = checkPackage,
  report = () => {},
) {
  const results = new Array(packages.length);
  let next = 0;
  let printed = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, packages.length) }, async () => {
      while (next < packages.length) {
        const index = next++;
        const { packageDir, pkg } = packages[index];
        results[index] = await check(repoRoot, packageDir, pkg);
        while (printed < results.length && results[printed] !== undefined) {
          report(results[printed++]);
        }
      }
    }),
  );
  return results;
}

export function isExecutedAsMain(metaUrl, argv1) {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}

async function main() {
  const repoRoot = process.cwd();
  const concurrency = declarationConcurrency(
    optionValues(process.argv.slice(2), "--concurrency").at(-1),
  );
  const filters = optionValues(process.argv.slice(2), "--filter");
  const filteredPackageNames = collectTurboFilteredPackageNames(
    repoRoot,
    filters,
    {
      failureMessage: "Failed to list filtered packages",
      skipWithoutFilters: true,
    },
  );
  const packages = collectPackages(repoRoot, filteredPackageNames, (a, b) =>
    a.localeCompare(b),
  );
  if (packages.length === 0) {
    console.log("No public packages matched the filter.");
    return;
  }

  let failed = false;
  await checkPackages(
    repoRoot,
    packages,
    concurrency,
    checkPackage,
    (result) => {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      if (result.status !== 0) failed = true;
    },
  );
  if (failed) process.exitCode = 1;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  await main();
}
