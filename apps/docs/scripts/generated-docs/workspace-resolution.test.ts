import * as fs from "node:fs";
import * as path from "node:path";
import { ts } from "ts-morph";
import { getProject } from "./extract.mts";
import { REPO_ROOT } from "./paths.mts";

const PACKAGES_DIR = path.join(REPO_ROOT, "packages");
const PROBE_FILE = path.join(
  REPO_ROOT,
  "apps/docs/scripts/generated-docs/workspace-resolution.test.ts",
);

function workspacePackageNames(): Set<string> {
  const names = new Set<string>();
  for (const entry of fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(PACKAGES_DIR, entry.name, "package.json");
    if (!fs.existsSync(manifest)) continue;
    names.add(JSON.parse(fs.readFileSync(manifest, "utf8")).name);
  }
  return names;
}

function packageNameOf(specifier: string): string {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? specifier);
}

describe("workspace package resolution", () => {
  it("maps safe-content-frame to its source entry points", () => {
    const options = getProject().getCompilerOptions();
    const resolve = (specifier: string) =>
      ts.resolveModuleName(specifier, PROBE_FILE, options, ts.sys)
        .resolvedModule?.resolvedFileName;

    expect(resolve("safe-content-frame")).toBe(
      path.join(PACKAGES_DIR, "safe-content-frame/src/index.ts"),
    );
    expect(resolve("safe-content-frame/shadow_dom")).toBe(
      path.join(PACKAGES_DIR, "safe-content-frame/src/shadow_dom.ts"),
    );
  });

  it("resolves every workspace import the generator reads to source", () => {
    const workspaceNames = workspacePackageNames();
    const offenders: string[] = [];

    for (const sourceFile of getProject().getSourceFiles()) {
      for (const declaration of [
        ...sourceFile.getImportDeclarations(),
        ...sourceFile.getExportDeclarations(),
      ]) {
        const specifier = declaration.getModuleSpecifierValue();
        if (!specifier || !workspaceNames.has(packageNameOf(specifier))) {
          continue;
        }
        const resolved = declaration
          .getModuleSpecifierSourceFile()
          ?.getFilePath();
        if (!resolved || resolved.includes("/dist/")) {
          offenders.push(`${specifier} -> ${resolved ?? "unresolved"}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
