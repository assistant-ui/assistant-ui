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
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const packagesRoot = path.join(repoRoot, "packages");
const apiSurfaceRoot = path.join(repoRoot, "api-surface");
const tempRoot = path.join(repoRoot, ".api-surface-tmp");
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
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
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
    return aKey.localeCompare(bKey);
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

function entryNamespace(entry, index) {
  const conditions =
    entry.conditions.length > 0 ? `_${entry.conditions.join("_")}` : "";
  const exportPath =
    entry.exportPath === "." ? "root" : entry.exportPath.replace(/^\.\//, "");
  return sanitizeIdentifier(`entry_${index}_${exportPath}${conditions}`);
}

function stripComments(content) {
  let output = "";
  let index = 0;
  let state = "normal";

  while (index < content.length) {
    const char = content[index];
    const next = content[index + 1];

    if (state === "lineComment") {
      if (char === "\n") {
        output += char;
        state = "normal";
      }
      index++;
      continue;
    }

    if (state === "blockComment") {
      if (char === "\n") output += char;
      if (char === "*" && next === "/") {
        index += 2;
        state = "normal";
      } else {
        index++;
      }
      continue;
    }

    if (state === "singleQuote" || state === "doubleQuote") {
      output += char;
      if (char === "\\") {
        output += next ?? "";
        index += 2;
        continue;
      }
      if (
        (state === "singleQuote" && char === "'") ||
        (state === "doubleQuote" && char === '"')
      ) {
        state = "normal";
      }
      index++;
      continue;
    }

    if (state === "template") {
      output += char;
      if (char === "\\") {
        output += next ?? "";
        index += 2;
        continue;
      }
      if (char === "`") state = "normal";
      index++;
      continue;
    }

    if (char === "/" && next === "/") {
      state = "lineComment";
      index += 2;
      continue;
    }

    if (char === "/" && next === "*") {
      state = "blockComment";
      index += 2;
      continue;
    }

    if (char === "'") state = "singleQuote";
    if (char === '"') state = "doubleQuote";
    if (char === "`") state = "template";

    output += char;
    index++;
  }

  return output;
}

function printSurfaceFile(sourceFile) {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return sourceFile.statements
    .map((statement) =>
      printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile),
    )
    .join("\n\n");
}

function applyTwoSpaceIndent(content) {
  return content
    .split("\n")
    .map((line) =>
      line.replace(/^ +/, (spaces) =>
        " ".repeat(Math.floor(spaces.length / 2)),
      ),
    )
    .join("\n");
}

function normalizeBundledDeclaration(content) {
  const stripped = stripComments(content)
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
      const visit = (node) => {
        if (
          ts.isParameter(node) &&
          (ts.isObjectBindingPattern(node.name) ||
            ts.isArrayBindingPattern(node.name))
        ) {
          return context.factory.updateParameterDeclaration(
            node,
            node.modifiers,
            node.dotDotDotToken,
            context.factory.createIdentifier("_param"),
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
  const printed = applyTwoSpaceIndent(printSurfaceFile(result.transformed[0]))
    .replace(
      /declare module "@assistant-ui\/store" {\n\s*interface ScopeRegistry {([\s\S]*?)\n\s*}\n}/g,
      "interface ScopeRegistry {$1\n}",
    )
    .replace(
      /interface ScopeRegistry {\n}/g,
      "interface ScopeRegistry {\n  [key: string]: { methods: any; meta?: any; events?: any };\n}",
    )
    .replace(
      /}\[keyof ClientEventMap\]/g,
      "}[Extract<keyof ClientEventMap, string>]",
    )
    .replace(
      /__ASSISTANT_UI_DEVTOOLS_HOOK__\?: DevToolsHook;/g,
      "__ASSISTANT_UI_DEVTOOLS_HOOK__?: any;",
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
  mkdirSync(tempOut, { recursive: true });

  const source = entries
    .flatMap((entry, index) => {
      const namespace = entryNamespace(entry, index);
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

async function loadCliCommand(modulePath, exportName) {
  const module = await import(pathToFileURL(modulePath));
  return module[exportName];
}

async function buildCliSurface() {
  const cliDist = path.join(packagesRoot, "cli", "dist");
  const requiredFile = path.join(cliDist, "commands", "add.js");
  if (!existsSync(requiredFile)) {
    throw new Error(
      "Missing built CLI files. Run pnpm build before generating API surface files.",
    );
  }

  const add = await loadCliCommand(
    path.join(cliDist, "commands/add.js"),
    "add",
  );
  const create = await loadCliCommand(
    path.join(cliDist, "commands/create.js"),
    "create",
  );
  const init = await loadCliCommand(
    path.join(cliDist, "commands/init.js"),
    "init",
  );
  const mcp = await loadCliCommand(
    path.join(cliDist, "commands/mcp.js"),
    "mcp",
  );
  const { codemodCommand, upgradeCommand } = await import(
    pathToFileURL(path.join(cliDist, "commands/upgrade.js"))
  );
  const update = await loadCliCommand(
    path.join(cliDist, "commands/update.js"),
    "update",
  );
  const agent = await loadCliCommand(
    path.join(cliDist, "commands/agent.js"),
    "agent",
  );
  const info = await loadCliCommand(
    path.join(cliDist, "commands/info.js"),
    "info",
  );
  const doctor = await loadCliCommand(
    path.join(cliDist, "commands/doctor.js"),
    "doctor",
  );

  const program = new add.constructor()
    .name("assistant-ui")
    .description("add components and dependencies to your project");

  for (const command of [
    add,
    create,
    init,
    mcp,
    codemodCommand,
    upgradeCommand,
    update,
    agent,
    info,
    doctor,
  ]) {
    program.addCommand(command);
  }

  return {
    "assistant-ui": formatCommand(program),
    "create-assistant-ui": {
      name: "create-assistant-ui",
      description: "create assistant-ui apps with one command",
      forwardsTo: "assistant-ui create",
      arguments: formatCommand(create).arguments,
      options: formatCommand(create).options,
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

function writeOrCheck(file, content, changedFiles) {
  const previous = existsSync(file) ? readFileSync(file, "utf8") : undefined;
  if (previous === content) return;

  changedFiles.push(path.relative(repoRoot, file).replaceAll("\\", "/"));
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

    if (!checkMode && existsSync(apiSurfaceRoot)) {
      for (const entry of readdirSync(apiSurfaceRoot)) {
        const file = path.join(apiSurfaceRoot, entry);
        if (entry.endsWith(".ts") && !generatedFiles.has(file)) rmSync(file);
      }
    }

    if (checkMode && changedFiles.length > 0) {
      console.error("API surface files are out of date:");
      for (const file of changedFiles) console.error(`  ${file}`);
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
