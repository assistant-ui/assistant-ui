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

/**
 * Restore /// <reference> directives in .d.ts files.
 *
 * TypeScript's declaration emitter drops /// <reference path> and
 * /// <reference types> directives from source files, but they are needed
 * to keep module-augmentation files in the .d.ts import graph.
 */
async function restoreReferenceDirectives(program: ts.Program): Promise<void> {
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    const pathRefs = sourceFile.referencedFiles;
    const typeRefs = sourceFile.typeReferenceDirectives;
    if (pathRefs.length === 0 && typeRefs.length === 0) continue;

    const srcRelative = path.relative(process.cwd(), sourceFile.fileName);
    if (!srcRelative.startsWith("src/")) continue;

    const dtsPath = srcRelative
      .replace(/^src\//, "dist/")
      .replace(/\.tsx?$/, ".d.ts");

    try {
      const content = await fs.readFile(dtsPath, "utf-8");
      const directives = [
        ...pathRefs.map((ref) => {
          const refPath = ref.fileName.replace(/\.tsx?$/, ".d.ts");
          return `/// <reference path="${refPath}" />`;
        }),
        ...typeRefs.map((ref) => `/// <reference types="${ref.fileName}" />`),
      ].join("\n");
      await fs.writeFile(dtsPath, `${directives}\n${content}`);
    } catch {
      // .d.ts file may not exist (e.g. test-only source files)
    }
  }
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
    customConditions: parsedConfig.options.customConditions ?? [],
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

  await restoreReferenceDirectives(program);

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
