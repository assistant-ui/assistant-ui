import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const formatHost: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => process.cwd(),
  getCanonicalFileName: (fileName) => fileName,
  getNewLine: () => "\n",
};

// A relative specifier names the emitted module beside the declaration, so
// `./x` and `./dir` become `./x.js` and `./dir/index.js`, the spelling the
// runtime output uses and the one nodenext consumers can resolve.
export const outputSpecifier = (
  specifier: string,
  importer: string,
  options: ts.CompilerOptions,
  host: ts.ModuleResolutionHost,
  cache?: ts.ModuleResolutionCache,
) => {
  if (!specifier.startsWith(".")) return specifier;
  const target = ts.resolveModuleName(specifier, importer, options, host, cache)
    .resolvedModule?.resolvedFileName;
  if (!target || !/\.tsx?$/.test(target) || target.endsWith(".d.ts")) {
    return specifier;
  }
  const output = relative(dirname(importer), target)
    .split(sep)
    .join("/")
    .replace(/\.tsx?$/, ".js");
  return output.startsWith(".") ? output : `./${output}`;
};

const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const readVlq = (text: string, start: number) => {
  let value = 0;
  let shift = 0;
  let index = start;
  let digit: number;
  do {
    digit = BASE64.indexOf(text.charAt(index++));
    if (digit < 0) throw new Error(`Invalid source map segment: ${text}`);
    value += (digit & 31) << shift;
    shift += 5;
  } while (digit & 32);
  return { value: value & 1 ? -(value >>> 1) : value >>> 1, end: index };
};

const writeVlq = (value: number) => {
  let rest = value < 0 ? (-value << 1) | 1 : value << 1;
  let text = "";
  do {
    const digit = rest & 31;
    rest >>>= 5;
    text += BASE64[rest > 0 ? digit | 32 : digit];
  } while (rest > 0);
  return text;
};

// A segment's first field is its generated column as a delta from the previous
// segment on the same line. The other fields are deltas across the whole map
// and stay valid, so moving text within a line only rewrites that field.
const shiftMappings = (
  mappings: string,
  edits: ReadonlyMap<number, readonly { column: number; delta: number }[]>,
) => {
  const lines = mappings.split(";");
  for (const [line, lineEdits] of edits) {
    const segments = lines[line];
    if (!segments) continue;
    let column = 0;
    let shiftedColumn = 0;
    lines[line] = segments
      .split(",")
      .map((segment) => {
        const { value, end } = readVlq(segment, 0);
        column += value;
        let shifted = column;
        for (const edit of lineEdits) {
          if (edit.column <= column) shifted += edit.delta;
        }
        const text = writeVlq(shifted - shiftedColumn) + segment.slice(end);
        shiftedColumn = shifted;
        return text;
      })
      .join(",");
  }
  return lines.join(";");
};

const relativeSpecifierEdits = (
  declaration: ts.SourceFile,
  importer: string,
  options: ts.CompilerOptions,
  cache: ts.ModuleResolutionCache,
) => {
  const edits: { start: number; end: number; text: string }[] = [];
  const rewrite = (node: ts.StringLiteral) => {
    const next = outputSpecifier(node.text, importer, options, ts.sys, cache);
    if (next === node.text) return;
    edits.push({
      start: node.getStart(declaration) + 1,
      end: node.getEnd() - 1,
      text: next,
    });
  };
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      rewrite(node.moduleSpecifier);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      rewrite(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  };
  visit(declaration);
  return edits;
};

// The declaration emitter keeps a relative specifier as the source spells it,
// so each emitted declaration and its map are rewritten in place afterwards.
const rewriteRelativeSpecifiers = (
  declarationFile: string,
  options: ts.CompilerOptions,
  cache: ts.ModuleResolutionCache,
) => {
  const mapFile = `${declarationFile}.map`;
  const map = JSON.parse(readFileSync(mapFile, "utf8")) as {
    sourceRoot?: string;
    sources: string[];
    mappings: string;
  };
  const [source] = map.sources;
  if (map.sources.length !== 1 || source === undefined) {
    throw new Error(`Expected one source in ${mapFile}`);
  }
  const importer = resolve(dirname(mapFile), map.sourceRoot ?? "", source);
  const text = readFileSync(declarationFile, "utf8");
  const declaration = ts.createSourceFile(
    declarationFile,
    text,
    ts.ScriptTarget.Latest,
  );
  const edits = relativeSpecifierEdits(declaration, importer, options, cache);
  if (edits.length === 0) return;

  let output = text;
  const columnEdits = new Map<number, { column: number; delta: number }[]>();
  for (const edit of edits.toSorted((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    const end = declaration.getLineAndCharacterOfPosition(edit.end);
    columnEdits.set(end.line, [
      ...(columnEdits.get(end.line) ?? []),
      {
        column: end.character,
        delta: edit.text.length - (edit.end - edit.start),
      },
    ]);
  }
  writeFileSync(declarationFile, output);
  writeFileSync(
    mapFile,
    JSON.stringify({
      ...map,
      mappings: shiftMappings(map.mappings, columnEdits),
    }),
  );
};

const require = createRequire(import.meta.url);

// The native compiler emits declarations several times faster than the
// TypeScript API, which this module still uses to read the config and to
// resolve specifiers.
const nativeCompiler = () =>
  join(dirname(require.resolve("typescript-7/package.json")), "bin", "tsc");

// One program over the sorted entry list, emitted in one pass: declaration
// text depends on the order the checker first sees each type, so a per-module
// emit scheduled by the bundler changes union order, alias visibility and
// import specifiers between builds of the same commit.
export const emitDeclarations = ({
  cwd,
  entry,
  rootDir,
  outDir,
}: {
  cwd: string;
  entry: readonly string[];
  rootDir: string;
  outDir: string;
}) => {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    resolve(cwd, "tsconfig.json"),
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.formatDiagnostics([diagnostic], formatHost));
      },
    },
  );
  if (!parsed)
    throw new Error(`Unable to read ${resolve(cwd, "tsconfig.json")}`);
  if (parsed.errors.length > 0) {
    throw new Error(ts.formatDiagnostics(parsed.errors, formatHost));
  }
  assertPreservedDirectives({ cwd, entry });
  assertDocumentedExpandos({ cwd, entry });

  // Beside the package's tsconfig so `extends` and type inclusion resolve as
  // they do for the package; named per process and never written over a file.
  const config = resolve(cwd, `tsconfig.aui-build.${process.pid}.json`);
  writeFileSync(
    config,
    JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: false,
        declaration: true,
        declarationMap: true,
        emitDeclarationOnly: true,
        noCheck: true,
        rootDir: resolve(cwd, rootDir),
        outDir: resolve(cwd, outDir),
      },
      files: entry.map((file) => resolve(cwd, file)),
      include: [],
    }),
    { flag: "wx" },
  );
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync(
      process.execPath,
      [
        nativeCompiler(),
        "-p",
        config,
        "--pretty",
        "false",
        "--listEmittedFiles",
      ],
      { cwd, encoding: "utf8" },
    );
  } finally {
    rmSync(config, { force: true });
  }
  if (result.error) throw result.error;
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 0) {
    throw new Error(
      `TypeScript failed to emit declarations for ${cwd}:\n${output}`,
    );
  }

  const declarations = output
    .split(/\r?\n/)
    .filter((line) => line.startsWith("TSFILE: ") && line.endsWith(".d.ts"))
    .map((line) => line.slice("TSFILE: ".length));
  if (declarations.length === 0) {
    throw new Error(
      `TypeScript emitted no declarations for ${cwd}:\n${output}`,
    );
  }
  const options = parsed.options;
  const cache = ts.createModuleResolutionCache(
    cwd,
    (fileName) => fileName,
    options,
  );
  for (const declaration of declarations) {
    rewriteRelativeSpecifiers(declaration, options, cache);
  }
};

// The native emitter declares a constant that gains properties, such as a
// component with `displayName`, as a function and a namespace, and drops the
// constant's doc comment on the way.
const assertDocumentedExpandos = ({
  cwd,
  entry,
}: {
  cwd: string;
  entry: readonly string[];
}) => {
  const undocumented: string[] = [];
  for (const file of entry) {
    const sourceFile = ts.createSourceFile(
      resolve(cwd, file),
      readFileSync(resolve(cwd, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const expanded = new Set<string>();
    for (const statement of sourceFile.statements) {
      if (
        ts.isExpressionStatement(statement) &&
        ts.isBinaryExpression(statement.expression) &&
        statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(statement.expression.left) &&
        ts.isIdentifier(statement.expression.left.expression)
      ) {
        expanded.add(statement.expression.left.expression.text);
      }
    }
    for (const statement of sourceFile.statements) {
      if (
        !ts.isVariableStatement(statement) ||
        !(statement.declarationList.flags & ts.NodeFlags.Const)
      ) {
        continue;
      }
      for (const declaration of statement.declarationList.declarations) {
        const { initializer, name, type } = declaration;
        if (
          ts.isIdentifier(name) &&
          expanded.has(name.text) &&
          !type &&
          initializer &&
          (ts.isArrowFunction(initializer) ||
            ts.isFunctionExpression(initializer)) &&
          ts.getJSDocCommentsAndTags(declaration).length > 0
        ) {
          undocumented.push(`${file}: ${name.text}`);
        }
      }
    }
  }
  if (undocumented.length > 0) {
    throw new Error(
      `Declare these as functions so their doc comments reach the emitted declarations; the declaration emitter drops the comment of a constant that gains properties:\n${undocumented.map((line) => `  ${line}`).join("\n")}`,
    );
  }
};

// The declaration emitter drops every `/// <reference>` directive that is not
// marked `preserve="true"`, and nothing downstream notices the loss.
export const assertPreservedDirectives = ({
  cwd,
  entry,
}: {
  cwd: string;
  entry: readonly string[];
}) => {
  const dropped: string[] = [];
  for (const file of entry) {
    const sourceFile = ts.createSourceFile(
      resolve(cwd, file),
      readFileSync(resolve(cwd, file), "utf8"),
      ts.ScriptTarget.Latest,
    );
    for (const reference of [
      ...sourceFile.referencedFiles,
      ...sourceFile.typeReferenceDirectives,
    ]) {
      if (reference.preserve) continue;
      dropped.push(
        `${file}: ${sourceFile.text.slice(reference.pos, reference.end)}`,
      );
    }
  }
  if (dropped.length > 0) {
    throw new Error(
      `Reference directives need preserve="true" to reach the emitted declarations:\n${dropped.map((line) => `  ${line}`).join("\n")}`,
    );
  }
};
