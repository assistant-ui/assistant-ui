#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const packagesRoot = path.join(repoRoot, "packages");
const apiSurfaceRoot = path.join(repoRoot, "api-surface");
const tempRoot = path.join(repoRoot, ".turbo", "api-surface");
const checkMode = process.argv.includes("--check");

const requireFromBuildUtils = createRequire(
  path.join(repoRoot, "packages/x-buildutils/package.json"),
);
const { build } = await import(requireFromBuildUtils.resolve("tsdown"));
const ts = requireFromBuildUtils("typescript");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function packageFileName(packageName) {
  return `${packageName.replace(/^@/, "").replaceAll("/", "__")}.ts`;
}

function packageEntryName(packageName) {
  return packageFileName(packageName).replace(/\.ts$/, "");
}

function posixPath(file) {
  return file.replaceAll("\\", "/");
}

function relativeImport(fromDir, toFile) {
  const relative = posixPath(path.relative(fromDir, toFile));
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function collectTypeTargets(value, conditions = []) {
  if (!value || typeof value !== "object") return [];

  const targets = [];
  if (Object.prototype.hasOwnProperty.call(value, "types")) {
    if (typeof value.types === "string") {
      targets.push({
        conditions,
        typePath: value.types,
      });
    }
    return targets;
  }

  for (const [condition, nested] of Object.entries(value)) {
    targets.push(...collectTypeTargets(nested, [...conditions, condition]));
  }
  return targets;
}

function declarationFilesForTarget(packageDir, typePath) {
  if (!typePath.includes("*")) {
    const absolute = path.join(packageDir, typePath);
    if (!existsSync(absolute)) {
      throw new Error(
        `Missing declaration file ${path.relative(repoRoot, absolute)}. Run pnpm build before generating API surface files.`,
      );
    }
    return [absolute];
  }

  if (typePath.split("*").length !== 2) {
    throw new Error(
      `API surface generation supports a single wildcard in declaration paths, but found ${typePath}.`,
    );
  }

  const [prefix, suffix] = typePath.split("*");
  const files = readdirSync(packageDir, {
    recursive: true,
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      posixPath(path.join(entry.parentPath ?? entry.path, entry.name)),
    )
    .filter((file) => {
      const relative = `./${posixPath(path.relative(packageDir, file))}`;
      return relative.startsWith(prefix) && relative.endsWith(suffix);
    })
    .sort();

  if (files.length === 0) {
    throw new Error(
      `No declaration files matched ${typePath} in ${path.relative(repoRoot, packageDir)}.`,
    );
  }
  return files;
}

function collectPackages() {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesRoot, entry.name, "package.json"))
    .filter((packageJsonPath) => existsSync(packageJsonPath))
    .map((packageJsonPath) => {
      const pkg = readJson(packageJsonPath);
      return {
        packageDir: path.dirname(packageJsonPath),
        pkg,
      };
    })
    .filter(({ pkg }) => !pkg.private)
    .sort((a, b) => compareStrings(a.pkg.name, b.pkg.name));
}

function collectDeclarationEntries(packageDir, pkg) {
  const entries = [];
  const exportsMap = pkg.exports;

  if (exportsMap && typeof exportsMap === "object") {
    for (const [exportPath, exportValue] of Object.entries(exportsMap)) {
      const targets = collectTypeTargets(exportValue);
      for (const target of targets) {
        for (const file of declarationFilesForTarget(
          packageDir,
          target.typePath,
        )) {
          entries.push({
            exportPath,
            conditions: target.conditions,
            file,
          });
        }
      }
    }
  }

  return entries.sort((a, b) => {
    const aKey = `${a.exportPath}:${a.conditions.join("/")}:${a.file}`;
    const bKey = `${b.exportPath}:${b.conditions.join("/")}:${b.file}`;
    return compareStrings(aKey, bKey);
  });
}

function runtimePathForDeclaration(file) {
  if (file.endsWith(".d.cts")) return file.replace(/\.d\.cts$/, ".cjs");
  if (file.endsWith(".d.mts")) return file.replace(/\.d\.mts$/, ".mjs");
  return file.replace(/\.d\.ts$/, ".js");
}

function collectReferenceFiles(file) {
  const content = readFileSync(file, "utf8");
  const references = [];
  for (const match of content.matchAll(
    /\/\/\/\s*<reference\s+path=["']([^"']+)["']/g,
  )) {
    const reference = path.resolve(path.dirname(file), match[1]);
    if (existsSync(reference)) references.push(reference);
  }
  return references;
}

function sanitizeIdentifier(value) {
  const sanitized = value.replace(/[^A-Za-z0-9_$]/g, "_");
  return /^[A-Za-z_$]/.test(sanitized) ? sanitized : `entry_${sanitized}`;
}

function entryNamespace(entry) {
  const conditions =
    entry.conditions.length > 0 ? `_${entry.conditions.join("_")}` : "";
  const exportPath =
    entry.exportPath === "." ? "root" : entry.exportPath.replace(/^\.\//, "");
  return sanitizeIdentifier(`entry_${exportPath}${conditions}`);
}

function printSurfaceFile(sourceFile) {
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: true,
  });
  return sourceFile.statements
    .map((statement) =>
      printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile),
    )
    .join("\n\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeReactImports(content) {
  if (/\bReact\./.test(content)) return content;

  return content
    .replace(
      /^import React, \{([^}]+)\} from "react";$/m,
      (_, specifiers) => `import {${specifiers}} from "react";`,
    )
    .replace(/^import React from "react";\n?/m, "");
}

function normalizeBundlerNamespaceNames(content) {
  const exportMatch = content.match(/\nexport \{ ([^}]+) \};?$/);
  if (!exportMatch) return content;

  const replacements = exportMatch[1]
    .split(",")
    .map((part) => part.trim().match(/^([A-Za-z_$][\w$]*) as (entry_[\w$]+)$/))
    .filter(Boolean)
    .map(([, from, to]) => [from, `${to}_exports`])
    .sort((a, b) => b[0].length - a[0].length);

  let normalized = content;
  for (const [from, to] of replacements) {
    normalized = normalized.replace(
      new RegExp(
        `(^|[^A-Za-z0-9_$])${escapeRegExp(from)}(?![A-Za-z0-9_$])`,
        "g",
      ),
      `$1${to}`,
    );
  }
  return normalized;
}

function applyTwoSpaceIndent(content) {
  return content
    .split("\n")
    .map((line) =>
      line.replace(/^ +/, (spaces) => {
        if (spaces.length % 4 !== 0) {
          throw new Error(
            `Unexpected generated declaration indentation: ${spaces.length} spaces.`,
          );
        }
        return " ".repeat(spaces.length / 2);
      }),
    )
    .join("\n");
}

const KNOWN_DECLARATION_FIXUPS = [
  {
    pattern:
      /declare module "@assistant-ui\/store" {\n\s*interface ScopeRegistry {([\s\S]*?)\n\s*}\n}/g,
    replacement: "interface ScopeRegistry {$1\n}",
  },
  {
    pattern: /interface ScopeRegistry {\n}/g,
    replacement:
      "interface ScopeRegistry {\n  [key: string]: { methods: any; meta?: any; events?: any };\n}",
  },
  {
    pattern: /}\[keyof ClientEventMap\]/g,
    replacement: "}[Extract<keyof ClientEventMap, string>]",
  },
  {
    pattern: /__ASSISTANT_UI_DEVTOOLS_HOOK__\?: DevToolsHook;/g,
    replacement: "__ASSISTANT_UI_DEVTOOLS_HOOK__?: any;",
  },
  {
    pattern:
      /(declare const MessagePartPrimitiveText:[\s\S]*?import\("react"\)\.RefAttributes<HTMLSpanElement>, "ref">, )"children" \| "asChild"/g,
    replacement: '$1"asChild" | "children"',
  },
];

function applyKnownDeclarationFixups(content) {
  return KNOWN_DECLARATION_FIXUPS.reduce(
    (output, fixup) => output.replace(fixup.pattern, fixup.replacement),
    content,
  );
}

function typeMemberName(member, sourceFile) {
  if (!member.name) return "";
  if (ts.isIdentifier(member.name) || ts.isPrivateIdentifier(member.name)) {
    return member.name.text;
  }
  if (ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name)) {
    return member.name.text;
  }
  return member.name.getText(sourceFile);
}

function unwrapParenthesizedType(node) {
  let current = node;
  while (ts.isParenthesizedTypeNode(current)) current = current.type;
  return current;
}

function literalPropertyValue(member) {
  if (!member.type) return undefined;
  const type = unwrapParenthesizedType(member.type);
  if (
    ts.isLiteralTypeNode(type) &&
    (ts.isStringLiteral(type.literal) || ts.isNumericLiteral(type.literal))
  ) {
    return type.literal.text;
  }
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    return type.typeName.text;
  }
  return undefined;
}

function collectTypeLiteralProperties(typeLiteral, sourceFile) {
  const properties = new Map();
  for (const member of typeLiteral.members) {
    if (!ts.isPropertySignature(member)) continue;
    const name = typeMemberName(member, sourceFile);
    if (!name) continue;
    properties.set(name, {
      optional: Boolean(member.questionToken),
      value: literalPropertyValue(member),
    });
  }
  return properties;
}

function collectIntersectionTypeProperties(type, sourceFile) {
  const unwrapped = unwrapParenthesizedType(type);
  if (!ts.isIntersectionTypeNode(unwrapped)) return undefined;

  const properties = new Map();
  for (const part of unwrapped.types) {
    const partType = unwrapParenthesizedType(part);
    if (!ts.isTypeLiteralNode(partType)) continue;
    for (const [name, value] of collectTypeLiteralProperties(
      partType,
      sourceFile,
    )) {
      properties.set(name, value);
    }
  }
  return properties;
}

function attachmentUnionMemberStatus(properties) {
  const source = properties.get("source")?.value;
  if (source !== "thread-composer" && source !== "edit-composer") {
    return undefined;
  }

  const status = properties.get("status")?.value;
  if (
    status !== "CompleteAttachmentStatus" &&
    status !== "PendingAttachmentStatus"
  ) {
    return undefined;
  }

  return status;
}

function attachmentUnionMemberInfo(type, sourceFile) {
  const properties = collectIntersectionTypeProperties(type, sourceFile);
  if (!properties) return { recognized: false, key: undefined };

  const status = attachmentUnionMemberStatus(properties);
  if (!status) return { recognized: false, key: undefined };

  const statusRank = status === "CompleteAttachmentStatus" ? 0 : 1;

  const hasMatchingPayload =
    (statusRank === 0 &&
      properties.has("content") &&
      !properties.get("content").optional) ||
    (statusRank === 1 &&
      properties.has("file") &&
      !properties.get("file").optional);
  if (!hasMatchingPayload) return { recognized: true, key: undefined };

  return {
    recognized: true,
    key: `${properties.get("source").value}:${statusRank}`,
  };
}

function normalizeAttachmentUnionType(node, sourceFile, factory) {
  const keyedTypes = node.types.map((type, index) => {
    const info = attachmentUnionMemberInfo(type, sourceFile);
    return {
      index,
      ...info,
      type,
    };
  });
  const recognizedTypes = keyedTypes.filter(({ recognized }) => recognized);
  if (recognizedTypes.length < 2) return node;

  if (recognizedTypes.some(({ key }) => key === undefined)) {
    throw new Error(
      "Found a composer attachment union with an unsupported shape; update normalizeAttachmentUnionType.",
    );
  }

  const sortedRecognizedTypes = recognizedTypes.toSorted(
    (a, b) => compareStrings(a.key, b.key) || a.index - b.index,
  );
  if (
    recognizedTypes.every(
      ({ index }, sortedIndex) =>
        index === sortedRecognizedTypes[sortedIndex].index,
    )
  ) {
    return node;
  }

  let sortedIndex = 0;
  const types = keyedTypes.map(({ recognized, type }) =>
    recognized ? sortedRecognizedTypes[sortedIndex++].type : type,
  );

  return factory.updateUnionTypeNode(node, types);
}

function normalizeBundledDeclaration(content) {
  const stripped = content
    .replaceAll("\r\n", "\n")
    .replace(/ ?\/\/# sourceMappingURL=.*$/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const sourceFile = ts.createSourceFile(
    "api-surface.ts",
    stripped,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const result = ts.transform(sourceFile, [
    (context) => {
      let bindingParameterIndex = 0;
      const visit = (node) => {
        if (ts.isUnionTypeNode(node)) {
          return normalizeAttachmentUnionType(
            ts.visitEachChild(node, visit, context),
            sourceFile,
            context.factory,
          );
        }
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          /^Primitive(?:\$\d+)?$/.test(node.name.text) &&
          node.type &&
          ts.isTypeLiteralNode(node.type)
        ) {
          return context.factory.updateVariableDeclaration(
            node,
            node.name,
            node.exclamationToken,
            context.factory.updateTypeLiteralNode(
              node.type,
              [...node.type.members].sort((a, b) =>
                compareStrings(
                  typeMemberName(a, sourceFile),
                  typeMemberName(b, sourceFile),
                ),
              ),
            ),
            node.initializer,
          );
        }
        if (
          ts.isParameter(node) &&
          (ts.isObjectBindingPattern(node.name) ||
            ts.isArrayBindingPattern(node.name))
        ) {
          return context.factory.updateParameterDeclaration(
            node,
            node.modifiers,
            node.dotDotDotToken,
            context.factory.createIdentifier(
              `_param${bindingParameterIndex++}`,
            ),
            node.questionToken,
            node.type,
            node.initializer,
          );
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  const printed = applyKnownDeclarationFixups(
    normalizeBundlerNamespaceNames(
      normalizeReactImports(
        applyTwoSpaceIndent(printSurfaceFile(result.transformed[0])),
      ),
    ),
  );
  result.dispose();
  return `${printed.trim()}\n`;
}

async function bundlePackageSurface(packageInfo) {
  const { packageDir, pkg } = packageInfo;
  const entries = collectDeclarationEntries(packageDir, pkg);
  if (entries.length === 0) return undefined;

  const entryName = packageEntryName(pkg.name);
  const tempSrc = path.join(tempRoot, "src");
  const tempOut = path.join(tempRoot, "out", entryName);
  const entryFile = path.join(tempSrc, `${entryName}.ts`);

  mkdirSync(tempSrc, { recursive: true });

  const source = entries
    .flatMap((entry) => {
      const namespace = entryNamespace(entry);
      const runtimePath = runtimePathForDeclaration(entry.file);
      const referenceImports = collectReferenceFiles(entry.file).map(
        (reference) =>
          `import ${JSON.stringify(relativeImport(tempSrc, runtimePathForDeclaration(reference)))};`,
      );
      return [
        ...referenceImports,
        `export * as ${namespace} from ${JSON.stringify(relativeImport(tempSrc, runtimePath))};`,
      ];
    })
    .join("\n");
  writeFileSync(entryFile, `${source}\n`);

  await build({
    entry: [entryFile],
    outDir: tempOut,
    cwd: repoRoot,
    platform: "neutral",
    format: "esm",
    dts: true,
    sourcemap: false,
    clean: true,
    logLevel: "silent",
    deps: { neverBundle: /^node:/, skipNodeModulesBundle: true },
  });

  const outputFile = path.join(tempOut, `${entryName}.d.mts`);
  if (!existsSync(outputFile)) {
    throw new Error(
      `tsdown did not emit ${path.relative(repoRoot, outputFile)}`,
    );
  }

  return normalizeBundledDeclaration(readFileSync(outputFile, "utf8"));
}

function cleanDefaultValue(value) {
  if (value === undefined) return undefined;
  if (value === repoRoot) return "<cwd>";
  return value;
}

function cleanObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

function formatArgument(argument) {
  const name = argument.name();
  return cleanObject({
    syntax: argument.required
      ? `<${name}${argument.variadic ? "..." : ""}>`
      : `[${name}${argument.variadic ? "..." : ""}]`,
    description: argument.description,
    required: argument.required,
    variadic: argument.variadic || undefined,
    defaultValue: cleanDefaultValue(argument.defaultValue),
    choices: argument.argChoices,
  });
}

function formatOption(option) {
  return cleanObject({
    flags: option.flags,
    description: option.description,
    required: option.required || undefined,
    optional: option.optional || undefined,
    defaultValue: cleanDefaultValue(option.defaultValue),
    choices: option.argChoices,
    hidden: option.hidden || undefined,
  });
}

function formatCommand(command) {
  return cleanObject({
    name: command.name(),
    description: command.description() || undefined,
    usage: command.usage() || undefined,
    arguments: command.registeredArguments.map(formatArgument),
    options: command.options.map(formatOption),
    commands: command.commands.map(formatCommand),
  });
}

async function buildCliSurface() {
  const cliDist = path.join(packagesRoot, "cli", "dist");
  const programFile = path.join(cliDist, "program.js");
  const requiredFile = path.join(cliDist, "commands", "create.js");
  if (!existsSync(requiredFile)) {
    throw new Error(
      "Missing built CLI files. Run pnpm build before generating API surface files.",
    );
  }

  const { buildProgram } = await import(pathToFileURL(programFile));
  const program = buildProgram();
  const create = program.commands.find(
    (command) => command.name() === "create",
  );
  if (!create) {
    throw new Error("CLI program is missing the create command.");
  }

  const createSurface = formatCommand(create);
  return {
    "assistant-ui": formatCommand(program),
    "create-assistant-ui": {
      name: "create-assistant-ui",
      description: "create assistant-ui apps with one command",
      forwardsTo: "assistant-ui create",
      arguments: createSurface.arguments,
      options: createSurface.options,
    },
  };
}

function renderCliSurface(cliSurface) {
  return [
    "type CliSurfaceSnapshot = Record<string, unknown>;",
    "",
    `export const cliSurface: CliSurfaceSnapshot = ${JSON.stringify(cliSurface, null, 2)};`,
    "",
  ].join("\n");
}

function diffContent(file, content) {
  const diffFile = path.join(
    tempRoot,
    "diff",
    path.relative(repoRoot, file).replaceAll(path.sep, "__"),
  );
  mkdirSync(path.dirname(diffFile), { recursive: true });
  writeFileSync(diffFile, content);

  const diff = spawnSync("git", ["diff", "--no-index", "--", file, diffFile], {
    encoding: "utf8",
  });
  return `${diff.stdout}${diff.stderr}`.split("\n").slice(0, 200).join("\n");
}

function writeOrCheck(file, content, changedFiles) {
  const previous = existsSync(file) ? readFileSync(file, "utf8") : undefined;
  if (previous === content) return;

  changedFiles.push({
    file: path.relative(repoRoot, file).replaceAll("\\", "/"),
    content,
  });
  if (!checkMode) writeFileSync(file, content);
}

async function main() {
  const packages = collectPackages();
  const generatedFiles = new Set();
  const changedFiles = [];

  rmSync(tempRoot, { recursive: true, force: true });
  if (!checkMode) mkdirSync(apiSurfaceRoot, { recursive: true });

  try {
    const cliSurface = await buildCliSurface();

    for (const packageInfo of packages) {
      const { pkg } = packageInfo;
      const bundledSurface = await bundlePackageSurface(packageInfo);
      const cliPackageSurface = cliSurface[pkg.name];
      if (!bundledSurface && !cliPackageSurface) continue;
      const content = bundledSurface ?? renderCliSurface(cliPackageSurface);

      const outputFile = path.join(apiSurfaceRoot, packageFileName(pkg.name));
      generatedFiles.add(outputFile);
      writeOrCheck(outputFile, content, changedFiles);
    }

    if (existsSync(apiSurfaceRoot)) {
      for (const entry of readdirSync(apiSurfaceRoot)) {
        const file = path.join(apiSurfaceRoot, entry);
        if (!entry.endsWith(".ts") || generatedFiles.has(file)) continue;
        if (checkMode) {
          changedFiles.push({
            file: path.relative(repoRoot, file).replaceAll("\\", "/"),
          });
        } else {
          rmSync(file);
        }
      }
    }

    if (checkMode && changedFiles.length > 0) {
      console.error("API surface files are out of date:");
      for (const { file } of changedFiles) console.error(`  ${file}`);
      for (const { file, content } of changedFiles) {
        if (!content) continue;
        console.error(`\nDiff for ${file}:`);
        console.error(diffContent(path.join(repoRoot, file), content));
      }
      console.error("Run `pnpm api-surface` and commit the updated files.");
      process.exit(1);
    }

    const action = checkMode ? "Checked" : "Generated";
    console.log(`${action} ${generatedFiles.size} API surface file(s).`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

await main();
