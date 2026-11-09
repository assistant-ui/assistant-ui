import * as fs from "node:fs";
import * as path from "node:path";
import { ts } from "ts-morph";
import { getProject } from "./extract.mts";
import { REACT_PKG, REPO_ROOT } from "./paths.mts";

const PACKAGES_DIR = path.join(REPO_ROOT, "packages");

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

const project = getProject();

function workspaceOffenders(): string[] {
  const workspaceNames = workspacePackageNames();
  const offenders: string[] = [];
  for (const sourceFile of project.getSourceFiles()) {
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
  return offenders;
}

function resolveFromGenerator(specifier: string) {
  return ts.resolveModuleName(
    specifier,
    import.meta.filename,
    project.getCompilerOptions(),
    ts.sys,
  ).resolvedModule?.resolvedFileName;
}

function transportDefaults() {
  const transport = project.getSourceFileOrThrow(
    path.join(REACT_PKG, "assistant-transport.ts"),
  );
  const command = transport.getTypeAliasOrThrow("AssistantTransportCommand");
  const state = transport
    .getFunctionOrThrow("useAssistantTransportState")
    .getType()
    .getCallSignatures()
    .find((signature) => signature.getParameters().length === 0);
  return {
    commandTypes: command
      .getType()
      .getUnionTypes()
      .map((variant) =>
        variant
          .getPropertyOrThrow("type")
          .getTypeAtLocation(command)
          .getLiteralValue(),
      )
      .sort(),
    stateIndexIsUnknown: state
      ?.getReturnType()
      .getStringIndexType()
      ?.isUnknown(),
  };
}

const report = {
  safeContentFrame: {
    root: resolveFromGenerator("safe-content-frame"),
    shadowDom: resolveFromGenerator("safe-content-frame/shadow_dom"),
  },
  offenders: workspaceOffenders(),
  transport: transportDefaults(),
};

export type WorkspaceResolutionReport = typeof report;

process.stdout.write(JSON.stringify(report));
