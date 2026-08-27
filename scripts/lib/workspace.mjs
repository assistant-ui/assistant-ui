import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { optionArgs } from "./script-options.mjs";

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function posixPath(file) {
  return file.replaceAll("\\", "/");
}

export function collectPackages(
  repoRoot,
  filteredPackageNames,
  comparePackageNames,
) {
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
    .sort((a, b) => comparePackageNames(a.pkg.name, b.pkg.name));
}

export function collectTurboFilteredPackageNames(
  repoRoot,
  filters,
  { failureMessage, skipWithoutFilters = false },
) {
  if (skipWithoutFilters && filters.length === 0) return null;

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
    throw new Error(`${failureMessage}:\n${result.stdout}${result.stderr}`);
  }

  const jsonStart = result.stdout.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(`Turbo did not return JSON output:\n${result.stdout}`);
  }

  const output = JSON.parse(result.stdout.slice(jsonStart));
  return new Set(
    output.packages.items.map((item) => {
      if (typeof item.name !== "string") {
        throw new Error("Turbo package list included an item without a name.");
      }
      return item.name;
    }),
  );
}
