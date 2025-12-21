import ts from "typescript";
import { promises as fs } from "node:fs";
import path from "node:path";
import { glob } from "tinyglobby";
import { createExtensionTransformer } from "./extension-transformer";

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

  const transformer = createExtensionTransformer(program);
  const emitResult = program.emit(undefined, undefined, undefined, false, {
    before: [transformer],
    afterDeclarations: [
      transformer as unknown as ts.TransformerFactory<
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
