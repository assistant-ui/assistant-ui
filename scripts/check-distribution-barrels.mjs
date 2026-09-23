#!/usr/bin/env node
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./check-built-declarations.mjs";
import { posixPath, readJson } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const ts = createRequire(
  path.join(repoRoot, "packages/x-buildutils/package.json"),
)("typescript");

export const DISTRIBUTIONS = [
  "@assistant-ui/react",
  "@assistant-ui/react-native",
  "@assistant-ui/react-ink",
];

export const SHARED_PACKAGES = [
  "@assistant-ui/core",
  "@assistant-ui/store",
  "@assistant-ui/tap",
];

export const EXCEPTIONS = [
  {
    names: ["WebSpeechDictationAdapter", "WebSpeechSynthesisAdapter"],
    from: "@assistant-ui/core",
    missingFrom: ["@assistant-ui/react-native", "@assistant-ui/react-ink"],
    reason:
      "the Web Speech API (window.speechSynthesis, SpeechRecognition) only exists in a browser",
  },
  {
    names: [
      "AssistantFrameHost",
      "AssistantFrameProvider",
      "FRAME_MESSAGE_CHANNEL",
      "FrameMessage",
      "FrameMessageType",
      "SerializedModelContext",
      "SerializedTool",
    ],
    from: "@assistant-ui/core",
    missingFrom: ["@assistant-ui/react-native", "@assistant-ui/react-ink"],
    reason: "the iframe bridge speaks window.postMessage between documents",
  },
  {
    names: [
      "defineToolkit",
      "externalTool",
      "hitl",
      "hitlTool",
      "humanTool",
      "providerTool",
      "stubTool",
    ],
    from: "@assistant-ui/core/react",
    missingFrom: ["@assistant-ui/react-ink"],
    reason:
      "Ink runs single-process with no compiler, so its toolkit resolves these markers at runtime and has no counterpart for externalTool",
  },
  {
    names: ["AssistantRuntimeProvider"],
    from: "@assistant-ui/core/react",
    missingFrom: ["@assistant-ui/react"],
    reason:
      "the web distribution ships its legacy runtime provider under this name until the tap-only migration completes",
  },
  {
    names: [
      "AttachmentState",
      "ComposerState",
      "MessageState",
      "ThreadListItemState",
      "ThreadState",
    ],
    from: "@assistant-ui/core/store",
    missingFrom: ["@assistant-ui/react"],
    reason:
      "the web barrel binds these names to the deprecated runtime API state aliases until @assistant-ui/react 0.16, so it cannot carry the store scope types under them yet (#7839)",
  },
  {
    names: [
      "AttachmentState",
      "ComposerState",
      "MessageState",
      "ThreadListItemState",
      "ThreadState",
    ],
    from: "@assistant-ui/core",
    missingFrom: ["@assistant-ui/react-native", "@assistant-ui/react-ink"],
    reason:
      "these names are the deprecated aliases of the runtime API state types, which every barrel carries as ThreadRuntimeState and its siblings; the native and terminal barrels bind the names to the store scope types (#7839)",
  },
];

function readPackages(root) {
  const packagesRoot = path.join(root, "packages");
  const packages = new Map();
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageDir = path.join(packagesRoot, entry.name);
    const manifest = path.join(packageDir, "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = readJson(manifest);
    if (typeof pkg.name === "string")
      packages.set(pkg.name, { packageDir, pkg });
  }
  return packages;
}

function requirePackage(packages, name) {
  const found = packages.get(name);
  if (!found) throw new Error(`Package ${name} is not in the workspace.`);
  return found;
}

function findTypesTarget(value) {
  if (!value || typeof value !== "object") return undefined;
  if (Object.hasOwn(value, "types")) {
    return typeof value.types === "string" ? value.types : undefined;
  }
  for (const nested of Object.values(value)) {
    const target = findTypesTarget(nested);
    if (target) return target;
  }
  return undefined;
}

function sourceEntry({ packageDir, pkg }, subpath) {
  const types = findTypesTarget(pkg.exports?.[subpath]);
  if (types === undefined) return undefined;
  const match = /^\.\/dist\/(.+)\.d\.ts$/.exec(types);
  if (!match) {
    throw new Error(
      `${pkg.name} exports["${subpath}"] does not point at a dist declaration file.`,
    );
  }
  for (const extension of [".ts", ".tsx"]) {
    const candidate = path.join(packageDir, "src", `${match[1]}${extension}`);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `${pkg.name} exports["${subpath}"] has no source entry for ${types}.`,
  );
}

function specifierFor(name, subpath) {
  return subpath === "." ? name : `${name}${subpath.slice(1)}`;
}

function sharedEntries(packages, sharedPackages) {
  const entries = [];
  for (const name of sharedPackages) {
    const found = requirePackage(packages, name);
    for (const subpath of Object.keys(found.pkg.exports ?? {})) {
      if (subpath.includes("*")) continue;
      const file = sourceEntry(found, subpath);
      if (file) entries.push({ specifier: specifierFor(name, subpath), file });
    }
  }
  return entries;
}

function isTypeOnlyExport(symbol) {
  return (symbol.declarations ?? []).some((declaration) =>
    ts.isTypeOnlyImportOrExportDeclaration(declaration),
  );
}

function assertSharedImportsResolveToSource(
  root,
  program,
  checker,
  sharedPackages,
  sharedSourceRoots,
) {
  const isSharedSpecifier = (name) =>
    sharedPackages.some((pkg) => name === pkg || name.startsWith(`${pkg}/`));
  const problems = [];
  for (const file of program.getSourceFiles()) {
    if (file.fileName.includes("/node_modules/")) continue;
    ts.forEachChild(file, (node) => {
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) {
        return;
      }
      const specifier = node.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) return;
      if (!isSharedSpecifier(specifier.text)) return;
      const target = checker
        .getSymbolAtLocation(specifier)
        ?.declarations?.[0]?.getSourceFile().fileName;
      const resolved = target ? posixPath(target) : undefined;
      if (
        !resolved ||
        !sharedSourceRoots.some((sourceRoot) =>
          resolved.startsWith(`${sourceRoot}/`),
        )
      ) {
        problems.push(
          `${path.relative(root, file.fileName)} imports "${specifier.text}", which resolves to ${resolved ? path.relative(root, resolved) : "nothing"}`,
        );
      }
    });
  }
  if (problems.length > 0) {
    throw new Error(
      `Every shared package import has to resolve into that package's src for the parity check to see it:\n  ${problems.join("\n  ")}`,
    );
  }
}

export function collectBarrelParity({
  root: requestedRoot = repoRoot,
  distributions = DISTRIBUTIONS,
  sharedPackages = SHARED_PACKAGES,
} = {}) {
  const root = realpathSync(requestedRoot);
  const packages = readPackages(root);
  const barrels = distributions.map((name) => {
    const file = sourceEntry(requirePackage(packages, name), ".");
    if (!file) throw new Error(`${name} exports["."] declares no types.`);
    return { name, file };
  });
  const shared = sharedEntries(packages, sharedPackages);
  const sharedSourceRoots = sharedPackages.map((name) =>
    posixPath(path.join(requirePackage(packages, name).packageDir, "src")),
  );

  const program = ts.createProgram(
    [...barrels.map((barrel) => barrel.file), ...shared.map((e) => e.file)],
    {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      noEmit: true,
      skipLibCheck: true,
      types: [],
      baseUrl: root,
      paths: Object.fromEntries(shared.map((e) => [e.specifier, [e.file]])),
    },
  );
  const checker = program.getTypeChecker();
  assertSharedImportsResolveToSource(
    root,
    program,
    checker,
    sharedPackages,
    sharedSourceRoots,
  );

  const exportsOf = (file) =>
    checker.getExportsOfModule(
      checker.getSymbolAtLocation(program.getSourceFile(file)),
    );
  const resolve = (symbol) =>
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  const originOf = (symbol) => {
    const declaration = symbol.declarations?.[0];
    return declaration
      ? posixPath(declaration.getSourceFile().fileName)
      : undefined;
  };
  const isShared = (origin) =>
    origin !== undefined &&
    sharedSourceRoots.some((sourceRoot) => origin.startsWith(`${sourceRoot}/`));

  const publicNames = new Map();
  for (const entry of shared) {
    for (const symbol of exportsOf(entry.file)) {
      const target = resolve(symbol);
      if (!publicNames.has(target)) publicNames.set(target, []);
      publicNames
        .get(target)
        .push({ specifier: entry.specifier, name: symbol.name });
    }
  }

  const groups = new Map();
  for (const barrel of barrels) {
    for (const symbol of exportsOf(barrel.file)) {
      const target = resolve(symbol);
      const origin = originOf(target);
      if (origin === undefined) continue;
      if (!isShared(origin) && !publicNames.has(target)) continue;
      let byName = groups.get(target);
      if (!byName) {
        byName = new Map();
        groups.set(target, byName);
      }
      let group = byName.get(symbol.name);
      if (!group) {
        group = {
          name: symbol.name,
          origin: path.relative(root, origin),
          via: publicNames.get(target) ?? [],
          exportedBy: {},
        };
        byName.set(symbol.name, group);
      }
      group.exportedBy[barrel.name] =
        (target.flags & ts.SymbolFlags.Value) !== 0 &&
        !isTypeOnlyExport(symbol);
    }
  }

  const entries = [];
  for (const byName of groups.values()) {
    for (const group of byName.values()) entries.push(group);
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { distributions, entries };
}

export function findParityGaps({ distributions, entries }, exceptions) {
  const exempt = new Map();
  for (const exception of exceptions) {
    if (typeof exception.from !== "string") {
      throw new Error(
        `The exception for ${exception.names.join(", ")} names no \`from\` entry point, so it cannot say which symbol it excuses.`,
      );
    }
    for (const distribution of exception.missingFrom) {
      for (const name of exception.names) {
        const key = `${distribution}\0${name}`;
        if (!exempt.has(key)) exempt.set(key, []);
        exempt.get(key).push({
          distribution,
          name,
          from: exception.from,
          reason: exception.reason,
          used: false,
        });
      }
    }
  }

  const gaps = [];
  for (const entry of entries) {
    const needsValue = Object.values(entry.exportedBy).some(Boolean);
    const specifiers = entry.via.map(({ specifier }) => specifier);
    for (const distribution of distributions) {
      if (!(distribution in entry.exportedBy)) {
        const exception = exempt
          .get(`${distribution}\0${entry.name}`)
          ?.find(({ from }) => specifiers.includes(from));
        if (exception) {
          exception.used = true;
          continue;
        }
        gaps.push({ distribution, kind: "missing", entry });
      } else if (needsValue && !entry.exportedBy[distribution]) {
        gaps.push({ distribution, kind: "type-only", entry });
      }
    }
  }

  const staleExceptions = [...exempt.values()]
    .flat()
    .filter((exception) => !exception.used);
  return { gaps, staleExceptions };
}

export function runCheck(options = {}) {
  const parity = collectBarrelParity(options);
  return {
    entryCount: parity.entries.length,
    ...findParityGaps(parity, options.exceptions ?? EXCEPTIONS),
  };
}

function describeSource(entry, exportedByName) {
  const via = entry.via.map(({ specifier, name }) =>
    name === entry.name ? specifier : `${specifier} (as ${name})`,
  );
  const source = via.length > 0 ? via.join(", ") : entry.origin;
  const siblings = Object.entries(entry.exportedBy)
    .filter(([name]) => name !== exportedByName)
    .map(([name, value]) => `${name}${value ? "" : " (type)"}`);
  return `from ${source}; exported by ${siblings.join(", ")}`;
}

function main() {
  const { entryCount, gaps, staleExceptions } = runCheck({
    root: process.env.DISTRIBUTION_BARREL_CHECK_ROOT,
  });

  if (gaps.length > 0) {
    console.error(
      "The distribution barrels disagree on the shared surface they re-export:\n",
    );
    for (const distribution of DISTRIBUTIONS) {
      const own = gaps.filter((gap) => gap.distribution === distribution);
      if (own.length === 0) continue;
      console.error(`  ${distribution}`);
      for (const { kind, entry } of own) {
        const problem =
          kind === "missing"
            ? "is missing"
            : "exports only the type of a value that its siblings export";
        console.error(
          `    ${problem} ${entry.name} ${describeSource(entry, distribution)}`,
        );
      }
      console.error("");
    }
    console.error(
      "A symbol that @assistant-ui/core, @assistant-ui/store or @assistant-ui/tap declares or re-exports reaches",
    );
    console.error(
      "consumers only through the distribution they installed, and an app never installs two",
    );
    console.error(
      "distributions side by side (a second copy of the store breaks every context). So a name one",
    );
    console.error(
      "distribution re-exports from the shared packages is a name every distribution re-exports,",
    );
    console.error(
      "as the same symbol under the same name, unless a platform keeps it out.",
    );
    console.error(
      "\nAppend the missing re-export to the distribution's src/index.ts, or, when the symbol",
    );
    console.error(
      "genuinely cannot run on that platform, add it to EXCEPTIONS in scripts/check-distribution-barrels.mjs",
    );
    console.error(
      "with the reason and the `from` entry point whose symbol it excuses.",
    );
  }

  if (staleExceptions.length > 0) {
    if (gaps.length > 0) console.error("");
    console.error(
      "EXCEPTIONS in scripts/check-distribution-barrels.mjs lists names that no longer need an exception:\n",
    );
    for (const { distribution, name, from, reason } of staleExceptions) {
      console.error(`  ${distribution}: ${name} from ${from} (${reason})`);
    }
    console.error(
      "\nEither the distribution now exports the name or no distribution exports it any more. Remove the entry.",
    );
  }

  if (gaps.length > 0 || staleExceptions.length > 0) process.exit(1);

  console.log(
    `Every distribution re-exports the same shared surface. (${entryCount} shared exports checked across ${DISTRIBUTIONS.length} barrels)`,
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
