import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as nodePath from "node:path";
import { parse } from "@babel/parser";
import _traverse, { type NodePath } from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { satisfies } from "semver";
import { DIRECTIVE, type Target } from "./constants";
import pkgJson from "../package.json" with { type: "json" };

const parserPlugins = [
  "typescript",
  "jsx",
  "explicitResourceManagement",
] as NonNullable<NonNullable<Parameters<typeof parse>[1]>["plugins"]>;

// @babel/traverse and @babel/generator are CJS; their default export is the
// function itself under some interop and `{ default }` under others.
const traverse = (
  typeof _traverse === "function" ? _traverse : (_traverse as any).default
) as typeof _traverse;
const generate = (
  typeof _generate === "function" ? _generate : (_generate as any).default
) as typeof _generate;

export type ToolType = "frontend" | "backend" | "human" | "provider";

/** The required wrapper around a toolkit's tools (stripped at build time). */
const TOOLKIT_WRAPPER = "defineToolkit";
/** The helper that produces MCP-only toolkit fragments. */
const MCP_TOOLKIT_WRAPPER = "defineMcpToolkit";
/** The required wrapper around a generative-UI library (stripped at build time). */
const COMPONENTS_WRAPPER = "defineGenerativeComponents";
/** The core package whose metadata declares supported compiler versions. */
const CORE_PACKAGE = "@assistant-ui/core";
/** This package, checked against core's compatibility range. */
const COMPILER_PACKAGE = "@assistant-ui/x-generative-compiler";
/** Packages that re-export core's generative markers. */
const DISTRIBUTION_PACKAGES = [
  CORE_PACKAGE,
  "@assistant-ui/react",
  "@assistant-ui/react-native",
  "@assistant-ui/react-ink",
] as const;
/** Package that exports the generative UI runtime split by export condition. */
const GENERATIVE_UI_PACKAGE = "@assistant-ui/react-generative-ui";
/**
 * The class whose instances expose split-by-condition tools (`present()`,
 * `promptUser()`). A toolkit entry that calls a method on one of these passes
 * through untouched — the library, not this compiler, routes its halves.
 */
const GENERATIVE_FACTORY = "JSONGenerativeUI";
/**
 * The factory producing an interactable's complete tool entry. Unlike
 * `JSONGenerativeUI`, its package has no per-target builds, so this compiler
 * splits the inline config: the client keeps `render`, the server drops it.
 * The factory's own `execute` is internal and client-safe (frontend tool).
 */
const INTERACTABLE_TOOL_FACTORY = "unstable_interactableTool";

/** Mutable per-build outcomes the toolkit pass reports back for directive/guard injection. */
interface TargetFlags {
  /** A `render` survived on a client build (→ emit `"use client"`). */
  keptRender: boolean;
  /** A backend `execute` survived on a server build (→ emit `import "server-only"`). */
  keptBackendExecute: boolean;
}

export interface CompileOptions {
  /** Which build target to emit. */
  target: Target;
  /** Source filename, used for error messages and source maps. */
  filename?: string;
  /** Emit a source map alongside the code. */
  sourceMaps?: boolean;
  /**
   * Whether the `server` target prepends `import "server-only"` when it keeps a
   * backend `execute`. Defaults to `true` (the Next.js/RSC convention, where the
   * guard fires via the `react-server` condition). Set `false` for bundlers
   * without a `react-server` layer (e.g. a Vite/TanStack Start `ssr` build),
   * where the split is already structural and importing `server-only` would
   * throw — see the Vite integration.
   */
  injectServerOnly?: boolean;
}

export interface CompileResult {
  code: string;
  map?: object | null;
}

/** Thrown when a `"use generative"` file violates an authoring constraint. */
export class GenerativeCompileError extends Error {
  constructor(message: string, filename?: string) {
    super(
      `[assistant-ui/use-generative]${filename ? ` ${filename}:` : ""} ${message}`,
    );
    this.name = "GenerativeCompileError";
  }
}

/** Whether a source string opts into generative compilation via the directive. */
export function isGenerativeModule(code: string): boolean {
  // The directive must be a leading statement, preceded only by an optional BOM,
  // whitespace, and line/block comments. Scanned linearly — a regex over the
  // comment prefix is prone to catastrophic backtracking on crafted input.
  let i = code.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (;;) {
    while (i < code.length && /\s/.test(code[i]!)) i++;
    if (code.startsWith("//", i)) {
      const nl = code.indexOf("\n", i);
      if (nl === -1) return false;
      i = nl + 1;
    } else if (code.startsWith("/*", i)) {
      const end = code.indexOf("*/", i + 2);
      if (end === -1) return false;
      i = end + 2;
    } else {
      break;
    }
  }

  const quote = code[i];
  if (quote !== '"' && quote !== "'") return false;

  const directiveStart = i + 1;
  if (!code.startsWith(DIRECTIVE, directiveStart)) return false;

  const directiveEnd = directiveStart + DIRECTIVE.length;
  if (code[directiveEnd] !== quote) return false;

  return hasDirectiveTerminator(code, directiveEnd + 1);
}

function hasDirectiveTerminator(code: string, start: number): boolean {
  let i = start;
  let sawLineTerminator = false;
  for (;;) {
    if (i >= code.length) return true;

    const char = code.charCodeAt(i);
    if (isSemicolon(char)) return true;
    if (isLineTerminator(char)) {
      sawLineTerminator = true;
      i++;
      continue;
    }

    if (code.startsWith("//", i)) {
      const lineEnd = nextLineTerminatorIndex(code, i + 2);
      if (lineEnd === -1) return true;
      sawLineTerminator = true;
      i = lineEnd + 1;
      continue;
    }

    if (code.startsWith("/*", i)) {
      const end = code.indexOf("*/", i + 2);
      if (end === -1) return false;
      sawLineTerminator ||= containsLineTerminator(code, i + 2, end);
      i = end + 2;
      continue;
    }

    if (/\s/.test(code[i]!)) {
      i++;
      continue;
    }

    return sawLineTerminator && !startsExpressionContinuation(code, i);
  }
}

function nextLineTerminatorIndex(code: string, start: number): number {
  for (let i = start; i < code.length; i++) {
    if (isLineTerminator(code.charCodeAt(i))) return i;
  }
  return -1;
}

function containsLineTerminator(
  code: string,
  start: number,
  end: number,
): boolean {
  for (let i = start; i < end; i++) {
    if (isLineTerminator(code.charCodeAt(i))) return true;
  }
  return false;
}

function startsExpressionContinuation(code: string, start: number): boolean {
  switch (code[start]) {
    case ".":
    case "+":
    case "-":
    case "*":
    case "/":
    case "%":
    case "<":
    case ">":
    case "=":
    case "!":
    case "&":
    case "|":
    case "^":
    case "?":
    case ":":
    case ",":
    case "[":
    case "(":
    case "`":
      return true;
  }

  return (
    startsKeywordContinuation(code, start, "as") ||
    startsKeywordContinuation(code, start, "in") ||
    startsKeywordContinuation(code, start, "instanceof") ||
    startsKeywordContinuation(code, start, "satisfies")
  );
}

function startsKeywordContinuation(
  code: string,
  start: number,
  keyword: string,
): boolean {
  if (!code.startsWith(keyword, start)) return false;
  const next = code[start + keyword.length];
  return next === undefined || !/[\p{ID_Continue}$]/u.test(next);
}

function isSemicolon(char: number): boolean {
  return char === 59;
}

function isLineTerminator(char: number): boolean {
  return char === 10 || char === 13 || char === 0x2028 || char === 0x2029;
}

/**
 * Rewrites a `"use generative"` module for a single build target, keeping only the
 * regions that target needs and pruning the imports the dropped regions used.
 */
export function compileGenerative(
  code: string,
  options: CompileOptions,
): CompileResult {
  const { target, filename } = options;

  const ast = parse(code, {
    sourceType: "module",
    plugins: parserPlugins,
  });

  if (!ast.program.directives.some((d) => d.value.value === DIRECTIVE)) {
    throw new GenerativeCompileError(
      `missing "${DIRECTIVE}" directive`,
      filename,
    );
  }

  ensureCompilerCompatibleWithCore(ast, filename);

  // A module may hold several `defineToolkit(...)` / `defineGenerativeComponents(...)`
  // calls anywhere (e.g. a library built inside `new JSONGenerativeUI(...)` plus
  // the toolkit that exposes it). Tools may reference a `JSONGenerativeUI`
  // instance's `present()`/`promptUser()`, which the library — not this compiler —
  // splits across builds via export conditions; collect those instance names so
  // such entries pass through.
  ensureDefaultExport(ast, filename);
  const generativeInstances = collectGenerativeInstances(ast);
  const interactableToolImports = collectInteractableToolImports(ast);
  const toolkitSpreadNames = collectToolkitSpreadNames(
    ast,
    filename,
    createToolkitNameContext(),
  );

  const flags: TargetFlags = { keptRender: false, keptBackendExecute: false };

  traverse(ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      const object = t.isObjectExpression(path.node.arguments[0])
        ? path.node.arguments[0]
        : null;

      if (t.isIdentifier(callee, { name: COMPONENTS_WRAPPER })) {
        if (!object) {
          throw new GenerativeCompileError(
            `${COMPONENTS_WRAPPER}() takes an inline object literal of components`,
            filename,
          );
        }
        compileComponents(object, target, flags, filename);
        // Unwrap the authoring helper to the bare library object so its import
        // can be pruned.
        path.replaceWith(object);
        path.skip();
        return;
      }

      if (t.isIdentifier(callee, { name: TOOLKIT_WRAPPER })) {
        if (!object) {
          throw new GenerativeCompileError(
            `${TOOLKIT_WRAPPER}() takes an inline object literal of tools`,
            filename,
          );
        }
        compileToolkit(
          object,
          target,
          generativeInstances,
          interactableToolImports,
          toolkitSpreadNames,
          flags,
          filename,
        );
        path.replaceWith(object);
        path.skip();
      }
    },
  });

  const { keptRender, keptBackendExecute } = flags;

  pruneUnused(ast);

  // Replace the module directives with the target-appropriate one.
  ast.program.directives = ast.program.directives.filter(
    (d) => d.value.value !== DIRECTIVE && d.value.value !== "use client",
  );
  if (target === "client" && keptRender) {
    ast.program.directives.unshift(
      t.directive(t.directiveLiteral("use client")),
    );
  }
  if (
    target === "server" &&
    keptBackendExecute &&
    (options.injectServerOnly ?? true)
  ) {
    ast.program.body.unshift(
      t.importDeclaration([], t.stringLiteral("server-only")),
    );
  }

  const result = generate(
    ast,
    {
      sourceMaps: options.sourceMaps ?? false,
      ...(filename ? { filename } : {}),
      jsescOption: { minimal: true },
    },
    code,
  );

  return { code: result.code, map: result.map };
}

interface PackageJson {
  name?: string;
  version?: string;
  optionalDevDependencies?: Record<string, string>;
}

const checkedCorePackageJsonPaths = new Set<string>();

// This compiler's own version, inlined from package.json at build time. Read via
// an import (not by walking the filesystem at runtime) so the literal survives
// being bundled into a host package like `@assistant-ui/metro`, where no
// standalone `@assistant-ui/x-generative-compiler` sits on disk to walk up to.
const COMPILER_VERSION = pkgJson.version;

function ensureCompilerCompatibleWithCore(
  ast: t.File,
  filename: string | undefined,
): void {
  const corePackageJsonPath = resolveCorePackageJson(ast, filename);
  if (
    !corePackageJsonPath ||
    checkedCorePackageJsonPaths.has(corePackageJsonPath)
  ) {
    return;
  }

  const corePackageJson = readPackageJson(corePackageJsonPath);
  const range = corePackageJson?.optionalDevDependencies?.[COMPILER_PACKAGE];
  if (!range) {
    checkedCorePackageJsonPaths.add(corePackageJsonPath);
    return;
  }

  let compatible = false;
  try {
    compatible = satisfies(COMPILER_VERSION, range, {
      includePrerelease: true,
    });
  } catch {
    throw new GenerativeCompileError(
      `${CORE_PACKAGE}@${corePackageJson.version ?? "unknown"} declares an ` +
        `invalid optionalDevDependencies range for ${COMPILER_PACKAGE}: ` +
        JSON.stringify(range),
      filename,
    );
  }

  if (!compatible) {
    throw new GenerativeCompileError(
      `${CORE_PACKAGE}@${corePackageJson.version ?? "unknown"} requires ` +
        `${COMPILER_PACKAGE} ${range}, but the current compiler is ` +
        `${COMPILER_VERSION}. Update @assistant-ui/next, @assistant-ui/vite, ` +
        "or @assistant-ui/metro so their compiler satisfies the core package's " +
        "optionalDevDependencies range.",
      filename,
    );
  }

  checkedCorePackageJsonPaths.add(corePackageJsonPath);
}

function resolveCorePackageJson(
  ast: t.File,
  filename: string | undefined,
): string | null {
  for (const packageName of collectImportedDistributionPackages(ast)) {
    const packageJsonPath = resolvePackageJson(packageName, filename);
    if (!packageJsonPath) continue;
    if (packageName === CORE_PACKAGE) return packageJsonPath;

    const corePackageJsonPath = resolvePackageJson(
      CORE_PACKAGE,
      packageJsonPath,
    );
    if (corePackageJsonPath) return corePackageJsonPath;
  }

  return null;
}

function collectImportedDistributionPackages(ast: t.File): Set<string> {
  const packages = new Set<string>();

  for (const statement of ast.program.body) {
    const source =
      (t.isImportDeclaration(statement) ||
        t.isExportNamedDeclaration(statement) ||
        t.isExportAllDeclaration(statement)) &&
      statement.source
        ? statement.source.value
        : null;
    if (!source) continue;

    const packageName = packageNameFromSpecifier(source);
    if (packageName) packages.add(packageName);
  }

  return packages;
}

function packageNameFromSpecifier(specifier: string): string | null {
  for (const packageName of DISTRIBUTION_PACKAGES) {
    if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
      return packageName;
    }
  }

  return null;
}

function resolvePackageJson(
  packageName: string,
  filename: string | undefined,
): string | null {
  const requirePath = normalizeRequirePath(filename);
  const require = createRequire(requirePath);

  try {
    return findPackageJson(require.resolve(packageName), packageName);
  } catch {
    return findPackageJsonFromNodeModules(packageName, requirePath);
  }
}

function normalizeRequirePath(filename: string | undefined): string {
  return cleanAbsoluteFilename(filename) ?? import.meta.url;
}

/** Strips a `?query`/`#hash` suffix and returns the path only if it is absolute. */
function cleanAbsoluteFilename(filename: string | undefined): string | null {
  if (!filename) return null;
  const clean = filename.split(/[?#]/, 1)[0]!;
  return nodePath.isAbsolute(clean) ? clean : null;
}

function findPackageJson(
  fromPathOrUrl: string,
  packageName: string,
): string | null {
  let current = nodePath.dirname(
    fromPathOrUrl.startsWith("file:")
      ? new URL(fromPathOrUrl).pathname
      : nodePath.resolve(fromPathOrUrl),
  );

  for (;;) {
    const packageJsonPath = nodePath.join(current, "package.json");
    const packageJson = readPackageJson(packageJsonPath);
    if (packageJson?.name === packageName) return packageJsonPath;

    const parent = nodePath.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function findPackageJsonFromNodeModules(
  packageName: string,
  fromPathOrUrl: string,
): string | null {
  const parts = packageName.split("/");
  let current = nodePath.dirname(
    fromPathOrUrl.startsWith("file:")
      ? new URL(fromPathOrUrl).pathname
      : nodePath.resolve(fromPathOrUrl),
  );

  for (;;) {
    const packageJsonPath = nodePath.join(
      current,
      "node_modules",
      ...parts,
      "package.json",
    );
    const packageJson = readPackageJson(packageJsonPath);
    if (packageJson?.name === packageName) return packageJsonPath;

    const parent = nodePath.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function readPackageJson(packageJsonPath: string): PackageJson | null {
  if (!existsSync(packageJsonPath)) return null;
  try {
    return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
  } catch (error) {
    throw new GenerativeCompileError(
      `could not parse package metadata at ${packageJsonPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Errors unless the module's default export is the toolkit — a `defineToolkit(...)`
 * call (through `satisfies`/`as`/parens). This is the security boundary: the
 * default export is what the runtime registers, so it must be wrapped (and thus
 * split). A bare `export default { ... }` would ship a backend `execute` to the
 * client even if some *other* `defineToolkit(...)` exists elsewhere in the file.
 */
function ensureDefaultExport(ast: t.File, filename: string | undefined): void {
  const def = ast.program.body.find(
    (stmt): stmt is t.ExportDefaultDeclaration =>
      t.isExportDefaultDeclaration(stmt),
  );
  if (!def) {
    throw new GenerativeCompileError("missing a default export", filename);
  }
  if (!unwrapToToolkitCall(def.declaration)) {
    throw new GenerativeCompileError(
      `the default export must be ${TOOLKIT_WRAPPER}({ ... }) or ` +
        `${MCP_TOOLKIT_WRAPPER}({ ... }) (imported from "@assistant-ui/react"); ` +
        "wrapping is required so a backend `execute` can't be authored in a way " +
        "that reaches the client",
      filename,
    );
  }
}

/**
 * Unwraps a node through `satisfies`/`as`/parens to a call of the named function,
 * or returns `null`.
 */
function unwrapToCall(node: t.Node, name: string): t.CallExpression | null {
  if (t.isTSSatisfiesExpression(node) || t.isTSAsExpression(node)) {
    return unwrapToCall(node.expression, name);
  }
  if (t.isParenthesizedExpression(node)) {
    return unwrapToCall(node.expression, name);
  }
  if (t.isCallExpression(node) && t.isIdentifier(node.callee, { name })) {
    return node;
  }
  return null;
}

/**
 * Unwraps a statement to its variable declaration through an `export` wrapper,
 * or returns `null`.
 */
function asVariableDeclaration(
  statement: t.Statement,
): t.VariableDeclaration | null {
  if (t.isVariableDeclaration(statement)) return statement;
  if (
    t.isExportNamedDeclaration(statement) &&
    t.isVariableDeclaration(statement.declaration)
  ) {
    return statement.declaration;
  }
  return null;
}

/**
 * Collects the names bound to `new JSONGenerativeUI(...)` (e.g.
 * `const generative = new JSONGenerativeUI({ library })`). A toolkit entry that
 * calls a method on one of these is a generative tool whose halves the library
 * routes by export condition, so it passes through the toolkit pass untouched.
 */
function collectGenerativeInstances(ast: t.File): Set<string> {
  const names = new Set<string>();
  const generativeFactories = collectGenerativeFactoryImports(ast);
  for (const statement of ast.program.body) {
    const variableDeclaration = asVariableDeclaration(statement);
    if (!variableDeclaration) continue;
    for (const declaration of variableDeclaration.declarations) {
      const { id, init } = declaration;
      if (
        t.isIdentifier(id) &&
        t.isNewExpression(init) &&
        t.isIdentifier(init.callee) &&
        generativeFactories.has(init.callee.name)
      ) {
        names.add(id.name);
      }
    }
  }
  return names;
}

function collectGenerativeFactoryImports(ast: t.File): Set<string> {
  const names = new Set<string>();
  for (const statement of ast.program.body) {
    if (
      !t.isImportDeclaration(statement) ||
      statement.source.value !== GENERATIVE_UI_PACKAGE
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (
        t.isImportSpecifier(specifier) &&
        t.isIdentifier(specifier.imported, { name: GENERATIVE_FACTORY })
      ) {
        names.add(specifier.local.name);
      }
    }
  }
  return names;
}

type ToolkitStaticNames = readonly string[] | null;
type ToolkitSpreadNames = Map<string, ToolkitStaticNames>;

interface ToolkitNameContext {
  importedToolkitNamesByFile: Map<string, ToolkitStaticNames | undefined>;
  resolvingImportedToolkitNames: Set<string>;
}

/**
 * Collects the local names `unstable_interactableTool` is imported under from a
 * distribution package, so toolkit entries calling it can be recognized
 * (and a same-named local function can't smuggle an arbitrary call through).
 */
function collectInteractableToolImports(ast: t.File): Set<string> {
  const names = new Set<string>();
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement)) continue;
    if (!packageNameFromSpecifier(statement.source.value)) continue;
    for (const specifier of statement.specifiers) {
      if (
        t.isImportSpecifier(specifier) &&
        t.isIdentifier(specifier.imported, { name: INTERACTABLE_TOOL_FACTORY })
      ) {
        names.add(specifier.local.name);
      }
    }
  }
  return names;
}

function createToolkitNameContext(): ToolkitNameContext {
  return {
    importedToolkitNamesByFile: new Map(),
    resolvingImportedToolkitNames: new Set(),
  };
}

/**
 * The inline config of an `unstable_interactableTool({ ... })` toolkit entry, or `null`
 * when the entry is some other expression.
 */
function interactableToolConfig(
  value: t.Node,
  imports: Set<string>,
): t.ObjectExpression | null {
  return t.isCallExpression(value) &&
    t.isIdentifier(value.callee) &&
    imports.has(value.callee.name) &&
    t.isObjectExpression(value.arguments[0])
    ? value.arguments[0]
    : null;
}

/**
 * Toolkit identifiers that are safe to spread into a `defineToolkit({ ... })`,
 * paired with the static tool names they contain. A `null` name list means the
 * spread is safe, but its names are not statically known for duplicate checks.
 *
 * Two kinds qualify:
 *
 * - A local variable whose initializer is visible to this compiler pass: a
 *   `defineToolkit(...)` binding is compiled in-place before a later spread
 *   reads it, and `defineMcpToolkit(...)` entries can't contain executable code.
 * - The default import of another `"use generative"` module: that module is
 *   split per-target by its own compiler pass, so spreading its default-exported
 *   toolkit can't leak a backend `execute` to the client. Only the default
 *   export crosses the generative-module boundary, so named imports don't
 *   qualify — they would be `undefined` once that module is build-split.
 */
function collectToolkitSpreadNames(
  ast: t.File,
  filename: string | undefined,
  context: ToolkitNameContext,
): ToolkitSpreadNames {
  const spreadNames: ToolkitSpreadNames = new Map();
  const localToolkitCalls = new Map<string, t.CallExpression>();

  for (const statement of ast.program.body) {
    const localDeclaration = asVariableDeclaration(statement);
    if (localDeclaration) {
      for (const declaration of localDeclaration.declarations) {
        const { id, init } = declaration;
        if (t.isIdentifier(id) && init) {
          const toolkitCall = unwrapToToolkitCall(init);
          if (toolkitCall) localToolkitCalls.set(id.name, toolkitCall);
        }
      }
      continue;
    }

    if (t.isImportDeclaration(statement)) {
      const defaultSpecifier = statement.specifiers.find(
        (specifier): specifier is t.ImportDefaultSpecifier =>
          t.isImportDefaultSpecifier(specifier),
      );
      if (!defaultSpecifier) continue;

      const names = getGenerativeImportToolkitNames(
        statement.source.value,
        filename,
        context,
      );
      if (names !== undefined) {
        spreadNames.set(defaultSpecifier.local.name, names);
      }
    }
  }

  const resolveLocal = (name: string): ToolkitStaticNames | undefined => {
    if (spreadNames.has(name)) return spreadNames.get(name);

    const call = localToolkitCalls.get(name);
    if (!call) return undefined;

    const object = t.isObjectExpression(call.arguments[0])
      ? call.arguments[0]
      : null;
    const names = object
      ? collectToolkitObjectNames(object, spreadNames)
      : null;
    const publicNames = uniqueToolkitNames(names);

    spreadNames.set(name, publicNames);
    return publicNames;
  };

  for (const name of localToolkitCalls.keys()) {
    resolveLocal(name);
  }

  return spreadNames;
}

const MODULE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

/** Extensions a specifier may carry that actually map to a TS source file. */
const REWRITABLE_JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);

/**
 * Reads the static tool names from the default export of an imported
 * `"use generative"` module. Relative specifiers and `tsconfig` path aliases
 * (e.g. `@/tools`) are resolved; anything else (a bare package, an unresolvable
 * alias) is treated as non-generative, and thus an unsafe spread.
 */
function getGenerativeImportToolkitNames(
  source: string,
  filename: string | undefined,
  context: ToolkitNameContext,
): ToolkitStaticNames | undefined {
  const cleanFilename = cleanAbsoluteFilename(filename);
  if (!cleanFilename) return undefined;

  const resolved = resolveImportedModuleFile(source, cleanFilename);
  if (!resolved) return undefined;

  if (context.importedToolkitNamesByFile.has(resolved)) {
    return context.importedToolkitNamesByFile.get(resolved);
  }
  if (context.resolvingImportedToolkitNames.has(resolved)) return null;

  let code: string;
  try {
    code = readFileSync(resolved, "utf8");
  } catch {
    context.importedToolkitNamesByFile.set(resolved, undefined);
    return undefined;
  }

  if (!isGenerativeModule(code)) {
    context.importedToolkitNamesByFile.set(resolved, undefined);
    return undefined;
  }

  context.resolvingImportedToolkitNames.add(resolved);
  try {
    const importedAst = parse(code, {
      sourceType: "module",
      plugins: parserPlugins,
    });
    const names = getDefaultExportToolkitNames(importedAst, resolved, context);
    context.importedToolkitNamesByFile.set(resolved, names);
    return names;
  } catch (error) {
    if (error instanceof GenerativeCompileError) throw error;
    context.importedToolkitNamesByFile.set(resolved, null);
    return null;
  } finally {
    context.resolvingImportedToolkitNames.delete(resolved);
  }
}

function getDefaultExportToolkitNames(
  ast: t.File,
  filename: string | undefined,
  context: ToolkitNameContext,
): ToolkitStaticNames {
  const def = ast.program.body.find(
    (stmt): stmt is t.ExportDefaultDeclaration =>
      t.isExportDefaultDeclaration(stmt),
  );
  if (!def) return null;

  const toolkitCall = unwrapToToolkitCall(def.declaration);
  if (!toolkitCall || !t.isObjectExpression(toolkitCall.arguments[0])) {
    return null;
  }

  const spreadNames = collectToolkitSpreadNames(ast, filename, context);
  return uniqueToolkitNames(
    collectToolkitObjectNames(toolkitCall.arguments[0], spreadNames),
  );
}

/** Resolves an import specifier (relative or `tsconfig`-aliased) to a file on disk. */
function resolveImportedModuleFile(
  source: string,
  fromFilename: string,
): string | null {
  if (source.startsWith(".")) {
    const base = nodePath.resolve(nodePath.dirname(fromFilename), source);
    return resolveModuleFileAtPath(base);
  }
  return resolveAliasImport(source, fromFilename);
}

/**
 * Resolves a candidate module path, trying TS/JS extensions then index files. A
 * specifier may carry a `.js`-family extension that maps to a `.ts`/`.tsx`
 * source (TypeScript's `bundler`/`nodenext` resolution), so the extension is
 * dropped before probing.
 */
function resolveModuleFileAtPath(base: string): string | null {
  const ext = nodePath.extname(base);
  if (ext && existsSync(base)) return base;

  const stem = REWRITABLE_JS_EXTENSIONS.has(ext)
    ? base.slice(0, -ext.length)
    : base;

  for (const candidateExt of MODULE_EXTENSIONS) {
    const candidate = `${stem}${candidateExt}`;
    if (existsSync(candidate)) return candidate;
  }
  for (const candidateExt of MODULE_EXTENSIONS) {
    const candidate = nodePath.join(base, `index${candidateExt}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

interface TsconfigAliases {
  /** Absolute directory that `paths` targets resolve against. */
  baseDir: string;
  paths: Record<string, string[]>;
}

/** Resolves a `tsconfig` path alias (e.g. `@/tools/x`) to a file on disk. */
function resolveAliasImport(
  source: string,
  fromFilename: string,
): string | null {
  const tsconfig = loadTsconfigAliases(nodePath.dirname(fromFilename));
  if (!tsconfig) return null;

  // TypeScript matches the most specific key first: an exact (wildcard-free) key
  // beats a wildcard one, and a longer static prefix beats a shorter one.
  const patterns = Object.entries(tsconfig.paths).sort(
    ([a], [b]) => aliasSpecificity(b) - aliasSpecificity(a),
  );

  for (const [pattern, targets] of patterns) {
    const matched = matchAliasPattern(pattern, source);
    if (matched === null) continue;

    for (const target of targets) {
      const specifier = substituteAliasWildcard(target, matched);
      const file = resolveModuleFileAtPath(
        nodePath.resolve(tsconfig.baseDir, specifier),
      );
      if (file) return file;
    }
  }
  return null;
}

/** Ranks a `paths` key: an exact key outranks any wildcard; longer prefixes win. */
function aliasSpecificity(pattern: string): number {
  const star = pattern.indexOf("*");
  return star === -1 ? pattern.length + 1 : star;
}

/** Substitutes the single `*` in a `paths` target with the matched text. */
function substituteAliasWildcard(target: string, matched: string): string {
  const star = target.indexOf("*");
  if (star === -1) return target;
  return target.slice(0, star) + matched + target.slice(star + 1);
}

/**
 * Matches an import specifier against a `tsconfig` `paths` key. Returns the text
 * captured by the key's `*` (or `""` for an exact, wildcard-free key), or `null`
 * when the specifier doesn't match.
 */
function matchAliasPattern(pattern: string, source: string): string | null {
  const star = pattern.indexOf("*");
  if (star === -1) return pattern === source ? "" : null;

  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  if (
    source.length >= prefix.length + suffix.length &&
    source.startsWith(prefix) &&
    source.endsWith(suffix)
  ) {
    return source.slice(prefix.length, source.length - suffix.length);
  }
  return null;
}

/**
 * Memoizes resolved aliases per start directory. The compiler runs once per
 * file across a build, so without this every aliased spread re-walks and
 * re-parses the same `tsconfig.json`. Process-lifetime, like
 * `checkedCorePackageJsonPaths`.
 */
const tsconfigAliasesByDir = new Map<string, TsconfigAliases | null>();

/** Walks up from a directory to the nearest `tsconfig.json` that declares `paths`. */
function loadTsconfigAliases(fromDir: string): TsconfigAliases | null {
  const cached = tsconfigAliasesByDir.get(fromDir);
  if (cached !== undefined) return cached;

  let aliases: TsconfigAliases | null = null;
  let dir = fromDir;
  for (;;) {
    const tsconfigPath = nodePath.join(dir, "tsconfig.json");
    if (existsSync(tsconfigPath)) {
      aliases = readTsconfigAliases(tsconfigPath, new Set());
      if (aliases) break;
    }
    const parent = nodePath.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  tsconfigAliasesByDir.set(fromDir, aliases);
  return aliases;
}

/** Reads `baseUrl`/`paths` from a tsconfig, following a single `extends` chain. */
function readTsconfigAliases(
  tsconfigPath: string,
  seen: Set<string>,
): TsconfigAliases | null {
  if (seen.has(tsconfigPath)) return null;
  seen.add(tsconfigPath);

  let config: {
    extends?: string | string[];
    compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
  } | null;
  try {
    config = parseJsonc(readFileSync(tsconfigPath, "utf8"));
  } catch {
    return null;
  }
  if (!config) return null;

  const configDir = nodePath.dirname(tsconfigPath);
  const { baseUrl, paths } = config.compilerOptions ?? {};

  if (paths) {
    return {
      baseDir: baseUrl ? nodePath.resolve(configDir, baseUrl) : configDir,
      paths,
    };
  }

  // `extends` may be a string or (TS 5.0+) a string array; later entries take
  // precedence, so try them last-first. Parsed from untrusted JSONC, so the
  // array case is a real runtime shape, not just a type.
  const extendsList = Array.isArray(config.extends)
    ? config.extends
    : config.extends
      ? [config.extends]
      : [];
  for (let i = extendsList.length - 1; i >= 0; i--) {
    const entry = extendsList[i];
    if (typeof entry !== "string") continue;
    const extended = resolveExtendedTsconfig(entry, configDir);
    if (extended) {
      const aliases = readTsconfigAliases(extended, seen);
      if (aliases) return aliases;
    }
  }
  return null;
}

/** Resolves a tsconfig `extends` value (relative path or installed package). */
function resolveExtendedTsconfig(
  extendsValue: string,
  configDir: string,
): string | null {
  if (extendsValue.startsWith(".")) {
    const base = nodePath.resolve(configDir, extendsValue);
    const candidates =
      nodePath.extname(base) === ".json" ? [base] : [`${base}.json`, base];
    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }
  try {
    return createRequire(nodePath.join(configDir, "package.json")).resolve(
      extendsValue.endsWith(".json") ? extendsValue : `${extendsValue}.json`,
    );
  } catch {
    return null;
  }
}

/** Parses JSON with `//` and block comments and trailing commas stripped (tsconfig is JSONC). */
function parseJsonc(text: string): any {
  const withoutComments = text.replace(
    /"(?:[^"\\]|\\.)*"|\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g,
    (match) => (match.startsWith('"') ? match : ""),
  );
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(withoutTrailingCommas);
}

function unwrapToToolkitCall(node: t.Node): t.CallExpression | null {
  return (
    unwrapToCall(node, TOOLKIT_WRAPPER) ??
    unwrapToCall(node, MCP_TOOLKIT_WRAPPER)
  );
}

function collectToolkitObjectNames(
  object: t.ObjectExpression,
  toolkitSpreadNames: ToolkitSpreadNames,
): ToolkitStaticNames {
  const names: string[] = [];

  for (const entry of object.properties) {
    const entryNames = toolkitEntryNames(entry, toolkitSpreadNames);
    if (!entryNames) return null;
    names.push(...entryNames);
  }

  return names;
}

function uniqueToolkitNames(names: ToolkitStaticNames): ToolkitStaticNames {
  return names ? [...new Set(names)] : names;
}

function toolkitEntryNames(
  entry: t.ObjectExpression["properties"][number],
  toolkitSpreadNames: ToolkitSpreadNames,
): ToolkitStaticNames {
  if (t.isSpreadElement(entry)) {
    if (t.isIdentifier(entry.argument)) {
      return toolkitSpreadNames.get(entry.argument.name) ?? null;
    }

    const directMcpToolkit = unwrapToCall(entry.argument, MCP_TOOLKIT_WRAPPER);
    if (
      directMcpToolkit &&
      t.isObjectExpression(directMcpToolkit.arguments[0])
    ) {
      return collectToolkitObjectNames(
        directMcpToolkit.arguments[0],
        toolkitSpreadNames,
      );
    }

    return null;
  }

  if (t.isObjectProperty(entry) || t.isObjectMethod(entry)) {
    const name = memberName(entry.key, entry.computed);
    return name ? [name] : [];
  }

  return [];
}

function warnDuplicateToolkitNames(
  object: t.ObjectExpression,
  toolkitSpreadNames: ToolkitSpreadNames,
  filename: string | undefined,
): void {
  const names = collectToolkitObjectNames(object, toolkitSpreadNames);
  if (!names) return;

  const seen = new Set<string>();
  const warned = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      if (!warned.has(name)) {
        console.warn(
          new GenerativeCompileError(
            `Duplicate tool name "${name}" while composing toolkits. ` +
              "JavaScript object spread keeps the last definition.",
            filename,
          ).message,
        );
        warned.add(name);
      }
      continue;
    }
    seen.add(name);
  }
}

function isSafeToolkitSpread(
  entry: t.SpreadElement,
  toolkitSpreadNames: ToolkitSpreadNames,
): boolean {
  if (t.isIdentifier(entry.argument)) {
    return toolkitSpreadNames.has(entry.argument.name);
  }

  const directMcpToolkit = unwrapToCall(entry.argument, MCP_TOOLKIT_WRAPPER);
  return (
    !!directMcpToolkit && t.isObjectExpression(directMcpToolkit.arguments[0])
  );
}

function genericUnsafeToolkitEntryMessage(): string {
  return (
    "each tool must be an inline object literal (`name: { ... }`) or a " +
    "compiler-visible toolkit spread / generative tool (e.g. " +
    "`...defineMcpToolkit(...)`, `...baseToolkit`, " +
    "`generative.present()`, or `unstable_interactableTool(...)`) so its " +
    "`execute` can be routed"
  );
}

function describeUnsafeToolkitEntry(entry: Entry): string {
  if (!t.isObjectProperty(entry)) return genericUnsafeToolkitEntryMessage();

  const toolName = memberName(entry.key, entry.computed);
  const raw = entryRawValue(entry);
  if (!toolName || !raw) return genericUnsafeToolkitEntryMessage();

  return (
    `tool "${toolName}" cannot be \`${generate(raw).code}\`; use an inline ` +
    `object literal (\`${toolName}: { ... }\`) or a compiler-visible toolkit ` +
    "spread / generative tool so its `execute` can be routed"
  );
}

/** The `JSONGenerativeUI` methods that produce a split-by-condition tool. */
const GENERATIVE_TOOL_METHODS = new Set(["present", "promptUser"]);

/**
 * Whether a toolkit entry's value is a call to a tool-producing method on a
 * collected `JSONGenerativeUI` instance (`generative.present()`), which passes
 * through. The method name is checked too, so a typo like `generative.presnt()`
 * is a compile error here rather than a pass-through that fails at runtime.
 */
function isGenerativeToolEntry(value: t.Node, instances: Set<string>): boolean {
  return (
    t.isCallExpression(value) &&
    t.isMemberExpression(value.callee) &&
    !value.callee.computed &&
    t.isIdentifier(value.callee.object) &&
    instances.has(value.callee.object.name) &&
    t.isIdentifier(value.callee.property) &&
    GENERATIVE_TOOL_METHODS.has(value.callee.property.name)
  );
}

/**
 * Splits a `defineGenerativeComponents({ ... })` library for a build target:
 * a component's `render` (and the client imports it alone uses) is dropped on
 * the server; `properties`/`description` stay on both, since they drive the tool
 * schema either way. Mutates the object in place.
 */
function compileComponents(
  object: t.ObjectExpression,
  target: Target,
  flags: TargetFlags,
  filename: string | undefined,
): void {
  for (const entry of object.properties) {
    const value = entryValue(entry);
    if (!value) {
      throw new GenerativeCompileError(
        `each component in ${COMPONENTS_WRAPPER}() must be an inline object ` +
          "literal (`name: { ... }`) so its `render` can be routed",
        filename,
      );
    }
    if (!findMember(value, "render")) continue;
    // The client keeps `render` (and so needs the module marked `"use client"`);
    // the server drops it, since only the schema reaches the model there.
    if (target === "client") flags.keptRender = true;
    else removeMember(value, "render");
  }
}

/**
 * Splits a `defineToolkit({ ... })` for a build target. Each inline tool is
 * routed by inferred type (see the per-entry logic); a generative entry like
 * `generative.present()` passes through, the library having already split it.
 * Mutates the object in place and records outcomes in {@link TargetFlags}.
 */
function compileToolkit(
  object: t.ObjectExpression,
  target: Target,
  instances: Set<string>,
  interactableToolImports: Set<string>,
  toolkitSpreadNames: ToolkitSpreadNames,
  flags: TargetFlags,
  filename: string | undefined,
): void {
  // Split builds compile both targets; emit target-independent warnings from
  // the client pass so each duplicate is logged once.
  if (target === "client") {
    warnDuplicateToolkitNames(object, toolkitSpreadNames, filename);
  }

  const nextProperties: t.ObjectExpression["properties"] = [];

  for (const entry of object.properties) {
    const value = entryValue(entry);
    if (!value) {
      if (
        t.isSpreadElement(entry) &&
        isSafeToolkitSpread(entry, toolkitSpreadNames)
      ) {
        nextProperties.push(entry);
        continue;
      }
      // A generative tool (`generative.present()`) is split by the library's
      // export conditions, so it is safe to keep verbatim. Anything else — a
      // method or opaque call like `makeTool()` — can't be analyzed, so its
      // `execute` could reach the client unstripped.
      const raw = entryRawValue(entry);
      if (raw && isGenerativeToolEntry(raw, instances)) {
        nextProperties.push(entry);
        continue;
      }
      const config =
        raw && interactableToolConfig(raw, interactableToolImports);
      if (config) {
        if (target === "client") flags.keptRender = true;
        else removeMember(config, "render");
        nextProperties.push(entry);
        continue;
      }
      throw new GenerativeCompileError(
        describeUnsafeToolkitEntry(entry),
        filename,
      );
    }

    // Nature is inferred from `execute` (see inferToolType), not an authored
    // `type`. The resolved type is written back below so the runtime keeps it.
    const toolName = t.isObjectProperty(entry)
      ? memberName(entry.key, entry.computed)
      : undefined;
    const execute = findMember(value, "execute");
    const isStub = execute ? executeIsStubTool(execute) : false;
    const isExternal = execute ? executeIsExternalTool(execute) : false;
    const type = inferToolType(value, toolName, filename);
    const hasRender = !!findMember(value, "render");
    const hasRenderText = !!findMember(value, "renderText");

    if (type === "frontend" && !hasRender && !hasRenderText) {
      throw new GenerativeCompileError(
        `${typedToolSubject("frontend", toolName)} must declare a ` +
          "`render` or `renderText` " +
          "(it has no server execute to show otherwise)",
        filename,
      );
    }

    if (type === "human" && !hasRender) {
      throw new GenerativeCompileError(
        `${typedToolSubject("human", toolName)} must declare a ` +
          "`render` so it can collect input",
        filename,
      );
    }

    if (type === "provider" && execute) {
      applyProviderToolConfig(value, execute, toolName, filename);
    }

    if (isExternal) {
      if (!hasRender && !hasRenderText) {
        throw new GenerativeCompileError(
          `${typedToolSubject("external", toolName)} must declare a ` +
            "`render` or `renderText` " +
            "(assistant-ui only renders calls for tools defined elsewhere)",
          filename,
        );
      }
      if (target === "server") continue;
      stripExternalToolMetadata(value);
    }

    if (target === "client") {
      // A non-stub frontend execute stays (its `"use client"` marker is no longer needed
      // once the module is client); backend, sentinel, and stub executes are dropped.
      if (execute && type === "frontend" && !isStub) stripUseClient(execute);
      else if (execute) removeMember(value, "execute");
      if (hasRender || hasRenderText) flags.keptRender = true;
    } else {
      // server: render is never needed; only a non-external backend execute survives.
      if (hasRender) removeMember(value, "render");
      if (hasRenderText) removeMember(value, "renderText");
      if (execute) {
        if (type === "backend" && !isExternal) flags.keptBackendExecute = true;
        else removeMember(value, "execute");
      }
    }

    setToolType(value, type);
    setBackendDefault(value, target, type);
    nextProperties.push(entry);
  }

  object.properties = nextProperties;
}

function applyProviderToolConfig(
  object: t.ObjectExpression,
  execute: t.ObjectProperty | t.ObjectMethod,
  toolName: string | undefined,
  filename: string | undefined,
): void {
  if (
    !t.isObjectProperty(execute) ||
    !t.isCallExpression(execute.value) ||
    execute.value.arguments.length !== 1 ||
    !t.isObjectExpression(execute.value.arguments[0])
  ) {
    throw new GenerativeCompileError(
      "`providerTool(...)` must receive an inline object literal",
      filename,
    );
  }

  const existingNames = new Set(
    object.properties.flatMap((prop) => {
      if (!t.isObjectProperty(prop) && !t.isObjectMethod(prop)) return [];
      const name = memberName(prop.key, prop.computed);
      return name ? [name] : [];
    }),
  );
  const configNames = new Set<string>();

  for (const prop of execute.value.arguments[0].properties) {
    if (!t.isObjectProperty(prop)) {
      throw new GenerativeCompileError(
        "`providerTool(...)` config can only contain object properties",
        filename,
      );
    }
    const name = memberName(prop.key, prop.computed);
    if (!name) {
      throw new GenerativeCompileError(
        "`providerTool(...)` config can only contain static property names",
        filename,
      );
    }
    if (
      t.isFunctionExpression(prop.value) ||
      t.isArrowFunctionExpression(prop.value)
    ) {
      throw new GenerativeCompileError(
        "`providerTool(...)` config cannot contain function-valued properties",
        filename,
      );
    }
    if (existingNames.has(name) || configNames.has(name)) {
      const toolLabel = toolName ? ` for "${toolName}"` : "";
      throw new GenerativeCompileError(
        `\`providerTool(...)\` config${toolLabel} duplicates "${name}"`,
        filename,
      );
    }
    configNames.add(name);
    object.properties.push(prop);
  }
}

type Entry = t.ObjectExpression["properties"][number];

/** The raw AST value of an entry (any expression), or null for spreads/methods. */
function entryRawValue(entry: Entry): t.Expression | null {
  if (t.isObjectProperty(entry) && t.isExpression(entry.value)) {
    return entry.value;
  }
  return null;
}

function entryValue(entry: Entry): t.ObjectExpression | null {
  if (t.isObjectProperty(entry) && t.isObjectExpression(entry.value)) {
    return entry.value;
  }
  return null;
}

/** A member of an entry object: `render`/`execute`/`type`, as property or method. */
function findMember(
  object: t.ObjectExpression,
  name: string,
): t.ObjectProperty | t.ObjectMethod | undefined {
  return object.properties.find(
    (p): p is t.ObjectProperty | t.ObjectMethod =>
      (t.isObjectProperty(p) || t.isObjectMethod(p)) &&
      memberName(p.key, p.computed) === name,
  );
}

function removeMember(object: t.ObjectExpression, name: string): void {
  object.properties = object.properties.filter(
    (p) =>
      !(
        (t.isObjectProperty(p) || t.isObjectMethod(p)) &&
        memberName(p.key, p.computed) === name
      ),
  );
}

/** The `BlockStatement` body of an `execute` member, if it has one. */
function executeBody(
  member: t.ObjectProperty | t.ObjectMethod,
): t.BlockStatement | undefined {
  if (t.isObjectMethod(member)) return member.body;
  const value = member.value;
  if (
    (t.isArrowFunctionExpression(value) || t.isFunctionExpression(value)) &&
    t.isBlockStatement(value.body)
  ) {
    return value.body;
  }
  return undefined;
}

/** Whether an `execute` opts into the client via a leading `"use client"`. */
function executeIsClient(member: t.ObjectProperty | t.ObjectMethod): boolean {
  return !!executeBody(member)?.directives.some(
    (d) => d.value.value === "use client",
  );
}

function executeIsSentinel(
  member: t.ObjectProperty | t.ObjectMethod,
  name: string,
): boolean {
  return (
    t.isObjectProperty(member) &&
    t.isCallExpression(member.value) &&
    t.isIdentifier(member.value.callee, { name })
  );
}

/** Whether an `execute` is the human-in-the-loop sentinel. */
function executeIsHumanTool(
  member: t.ObjectProperty | t.ObjectMethod,
): boolean {
  return (
    executeIsSentinel(member, "humanTool") ||
    executeIsSentinel(member, "hitlTool") ||
    executeIsSentinel(member, "hitl")
  );
}

/** Whether an `execute` is the provider-tool sentinel. */
function executeIsProviderTool(
  member: t.ObjectProperty | t.ObjectMethod,
): boolean {
  return executeIsSentinel(member, "providerTool");
}

/** Whether an `execute` is the local override sentinel. */
function executeIsStubTool(member: t.ObjectProperty | t.ObjectMethod): boolean {
  return executeIsSentinel(member, "stubTool");
}

/** Whether an `execute` is the externally-defined backend tool sentinel. */
function executeIsExternalTool(
  member: t.ObjectProperty | t.ObjectMethod,
): boolean {
  return executeIsSentinel(member, "externalTool");
}

/** Drops the `"use client"` directive from an `execute` body (kept frontend). */
function stripUseClient(member: t.ObjectProperty | t.ObjectMethod): void {
  const body = executeBody(member);
  if (body) {
    body.directives = body.directives.filter(
      (d) => d.value.value !== "use client",
    );
  }
}

/**
 * The tool's nature, inferred from its (mandatory) `execute` rather than an
 * authored `type`: `humanTool()` → `human`; `providerTool(...)` → `provider`;
 * `stubTool()` → `frontend`; `externalTool()` → `backend`; `"use client"` →
 * `frontend`; otherwise `backend`.
 * The loader writes the result back as a `type` field (see {@link setToolType})
 * so the runtime keeps it.
 */
function inferToolType(
  object: t.ObjectExpression,
  toolName: string | undefined,
  filename: string | undefined,
): ToolType {
  const execute = findMember(object, "execute");
  if (!execute) {
    throw new GenerativeCompileError(
      `${toolSubject(toolName)} must declare an \`execute\`; use ` +
        "`humanTool()` for a human-in-the-loop tool",
      filename,
    );
  }
  if (executeIsHumanTool(execute)) return "human";
  if (executeIsProviderTool(execute)) return "provider";
  if (executeIsStubTool(execute)) return "frontend";
  if (executeIsExternalTool(execute)) return "backend";
  return executeIsClient(execute) ? "frontend" : "backend";
}

function toolSubject(toolName: string | undefined): string {
  return toolName ? `tool "${toolName}"` : "every tool";
}

function typedToolSubject(type: string, toolName: string | undefined): string {
  if (toolName) return `${type} tool "${toolName}"`;
  const article = /^[aeiou]/i.test(type) ? "an" : "a";
  return `${article} ${type} tool`;
}

function stripExternalToolMetadata(object: t.ObjectExpression): void {
  // Mirror BackendTool's forbidden metadata fields: execute is stripped by the
  // main routing loop, while streamCall is also removed because there is no
  // assistant-ui executor to stream from.
  removeMember(object, "description");
  removeMember(object, "parameters");
  removeMember(object, "disabled");
  removeMember(object, "toModelOutput");
  removeMember(object, "experimental_onSchemaValidationError");
  removeMember(object, "providerOptions");
  removeMember(object, "streamCall");
}

/** Writes the resolved `type` back onto the tool object (replacing any author's). */
function setToolType(object: t.ObjectExpression, type: ToolType): void {
  removeMember(object, "type");
  // Append (not prepend) so the inferred type wins over any earlier spread.
  object.properties.push(
    t.objectProperty(t.identifier("type"), t.stringLiteral(type)),
  );
}

function setBackendDefault(
  object: t.ObjectExpression,
  target: Target,
  type: ToolType,
): void {
  // Always strip any hand-authored marker first; only re-add it for client
  // frontend/human tools whose schema is already known by the backend.
  removeMember(object, "unstable_backendDefault");
  if (target !== "client" || (type !== "frontend" && type !== "human")) return;

  object.properties.push(
    t.objectProperty(
      t.identifier("unstable_backendDefault"),
      t.objectExpression([
        t.objectProperty(t.identifier("parameters"), t.booleanLiteral(true)),
      ]),
    ),
  );
}

function memberName(
  key: t.Node,
  computed: boolean | undefined,
): string | undefined {
  if (computed) return undefined;
  if (t.isIdentifier(key)) return key.name;
  if (t.isStringLiteral(key)) return key.value;
  return undefined;
}

/**
 * Removes declarations and import specifiers left unreferenced after region
 * removal, to a fixpoint (a dropped helper frees what it used). Keeps exports,
 * side-effect imports, and possibly-side-effectful initializers.
 */
function pruneUnused(ast: t.File): void {
  const hadSpecifiers = new WeakSet<t.ImportDeclaration>();
  for (const stmt of ast.program.body) {
    if (t.isImportDeclaration(stmt) && stmt.specifiers.length > 0) {
      hadSpecifiers.add(stmt);
    }
  }

  let removedSomething = true;
  while (removedSomething) {
    removedSomething = false;
    traverse(ast, {
      Program(path: NodePath<t.Program>) {
        path.scope.crawl();
        const isUnused = (name: string): boolean => {
          const binding = path.scope.getBinding(name);
          return !!binding && !binding.referenced;
        };

        path.node.body = path.node.body.filter((stmt) => {
          if (
            (t.isFunctionDeclaration(stmt) || t.isClassDeclaration(stmt)) &&
            stmt.id &&
            isUnused(stmt.id.name)
          ) {
            removedSomething = true;
            return false;
          }
          if (t.isVariableDeclaration(stmt)) {
            stmt.declarations = stmt.declarations.filter((decl) => {
              // Handles destructuring too: drop the declarator only when *every*
              // bound name is unused (else a `const { a } = server` survives and
              // keeps a server import in the client graph). Restricted to plain
              // patterns so a default/computed-key side effect isn't dropped.
              const names = Object.keys(t.getBindingIdentifiers(decl.id));
              if (
                names.length > 0 &&
                isPlainPattern(decl.id) &&
                isRemovableInit(decl.init) &&
                names.every(isUnused)
              ) {
                removedSomething = true;
                return false;
              }
              return true;
            });
            if (stmt.declarations.length === 0) return false;
          }
          return true;
        });
        path.stop();
      },
    });
  }

  traverse(ast, {
    Program(path: NodePath<t.Program>) {
      path.scope.crawl();
      for (const stmt of path.node.body) {
        if (!t.isImportDeclaration(stmt)) continue;
        stmt.specifiers = stmt.specifiers.filter((spec) => {
          const binding = path.scope.getBinding(spec.local.name);
          return binding ? binding.referenced : true;
        });
      }
      path.node.body = path.node.body.filter(
        (stmt) =>
          !(
            t.isImportDeclaration(stmt) &&
            stmt.specifiers.length === 0 &&
            hadSpecifiers.has(stmt)
          ),
      );
      path.stop();
    },
  });
}

/**
 * Whether a binding pattern is side-effect-free to drop: a plain identifier, or
 * an object/array pattern of plain bindings — no default values
 * (`{ a = expr }`) or computed keys (`{ [expr]: a }`), which would evaluate (and
 * thus could have side effects) at destructuring time.
 */
function isPlainPattern(node: t.Node): boolean {
  if (t.isIdentifier(node)) return true;
  if (t.isObjectPattern(node)) {
    return node.properties.every((p) =>
      t.isRestElement(p)
        ? isPlainPattern(p.argument)
        : !p.computed && isPlainPattern(p.value),
    );
  }
  if (t.isArrayPattern(node)) {
    return node.elements.every((el) => el == null || isPlainPattern(el));
  }
  return false; // AssignmentPattern (default), member expr, etc.
}

/** Whether a variable initializer is safe to drop (no observable side effects). */
function isRemovableInit(node: t.Expression | null | undefined): boolean {
  if (node == null) return true;
  if (t.isTSAsExpression(node) || t.isTSSatisfiesExpression(node)) {
    return isRemovableInit(node.expression);
  }
  // Containers are removable only if every element is — a nested call (e.g.
  // `[track()]`) has an observable side effect that dropping would lose.
  if (t.isArrayExpression(node)) {
    return node.elements.every(
      (el) => el == null || (t.isExpression(el) && isRemovableInit(el)),
    );
  }
  if (t.isObjectExpression(node)) {
    return node.properties.every(
      (p) =>
        t.isObjectProperty(p) &&
        !p.computed &&
        t.isExpression(p.value) &&
        isRemovableInit(p.value),
    );
  }
  if (t.isTemplateLiteral(node)) {
    return node.expressions.every(
      (e) => t.isExpression(e) && isRemovableInit(e),
    );
  }
  return (
    t.isArrowFunctionExpression(node) ||
    t.isFunctionExpression(node) ||
    t.isClassExpression(node) ||
    t.isIdentifier(node) ||
    // non-computed only — `obj[fn()]` could hide a side-effectful key
    (t.isMemberExpression(node) && !node.computed) ||
    t.isJSXElement(node) ||
    t.isJSXFragment(node) ||
    t.isLiteral(node)
  );
}
