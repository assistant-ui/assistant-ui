#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { optionArgs, optionValues } from "./lib/script-options.mjs";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function posixPath(file) {
  return file.replaceAll("\\", "/");
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
  const files = readdirSync(packageDir, {
    recursive: true,
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
    .filter((file) => {
      const relative = `./${posixPath(path.relative(packageDir, file))}`;
      return relative.startsWith(prefix) && relative.endsWith(suffix);
    })
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
  const probe = createDeclarationProbe(packageDir, pkg);
  if (!probe) return 0;

  try {
    console.log(
      `Checking ${pkg.name} (${probe.entries.length} declaration entries)`,
    );
    const result = spawnSync(
      "pnpm",
      ["exec", "tsc", "--project", probe.configPath, "--pretty", "false"],
      { cwd: repoRoot, stdio: "inherit" },
    );
    return result.status ?? 1;
  } finally {
    probe.remove();
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
  for (const { packageDir, pkg } of packages) {
    const status = checkPackage(repoRoot, packageDir, pkg);
    if (status !== 0) {
      process.exitCode = status;
      return;
    }
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
