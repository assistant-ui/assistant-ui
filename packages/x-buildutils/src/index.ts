import ts from "typescript";
import { promises as fs } from "node:fs";
import path from "node:path";
import { glob } from "tinyglobby";
import { createExtensionTransformer } from "./extension-transformer";

/**
 * Builds a map of package name → set of exact export sub-paths
 * by reading the `exports` field of each dependency's package.json.
 */
async function buildValidExportsMap(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();

  try {
    const pkgJson = JSON.parse(await fs.readFile("package.json", "utf-8"));
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.peerDependencies,
    };

    for (const depName of Object.keys(allDeps)) {
      try {
        const depPkgPath = path.resolve(
          "node_modules",
          depName,
          "package.json",
        );
        const depPkg = JSON.parse(await fs.readFile(depPkgPath, "utf-8"));

        if (depPkg.exports) {
          const validPaths = new Set<string>();

          if (
            typeof depPkg.exports === "string" ||
            Array.isArray(depPkg.exports)
          ) {
            validPaths.add(".");
          } else {
            const keys = Object.keys(depPkg.exports);
            const hasSubpaths = keys.some((k) => k.startsWith("."));
            if (hasSubpaths) {
              for (const key of keys) {
                if (key.startsWith(".")) validPaths.add(key);
              }
            } else {
              // Conditional exports (e.g. { "import": "...", "require": "..." })
              validPaths.add(".");
            }
          }

          map.set(depName, validPaths);
        }
      } catch {
        // Dependency not resolvable — skip
      }
    }
  } catch {
    // No package.json — skip
  }

  return map;
}

async function build() {
  await fs.rm("dist", { recursive: true, force: true });

  const files = await glob(
    ["src/**/*.{ts,tsx}", "!src/**/__tests__/**", "!src/**/*.test.{ts,tsx}"],
    { absolute: true },
  );

  if (files.length === 0) {
    throw new Error("No source files found in src/");
  }

  const configPath = ts.findConfigFile(
    process.cwd(),
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (!configPath) throw new Error("Could not find tsconfig.json");

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.formatDiagnostic(configFile.error, formatHost));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  const validExportsMap = await buildValidExportsMap();

  const program = ts.createProgram(files, {
    ...parsedConfig.options,
    outDir: "dist",
    declaration: true,
    declarationMap: true,
    sourceMap: true,
    noEmit: false,
    emitDeclarationOnly: false,
    // Strip aui-source so build uses dist types, not source
    customConditions:
      parsedConfig.options.customConditions?.filter(
        (c) => c !== "aui-source",
      ) ?? [],
  });

  // JS: extension rewriting only
  // .d.ts: extension rewriting + package sub-path rewriting
  const extensionTransformer = createExtensionTransformer(program);
  const declarationTransformer = createExtensionTransformer(
    program,
    validExportsMap,
  );
  const emitResult = program.emit(undefined, undefined, undefined, false, {
    before: [extensionTransformer],
    afterDeclarations: [
      declarationTransformer as unknown as ts.TransformerFactory<
        ts.Bundle | ts.SourceFile
      >,
    ],
  });

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);
  if (diagnostics.length > 0) {
    console.error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost),
    );
    if (diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) {
      process.exit(1);
    }
  }

  console.log(`Built ${files.length} files to dist/`);
}

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (f) => f,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => "\n",
};

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
