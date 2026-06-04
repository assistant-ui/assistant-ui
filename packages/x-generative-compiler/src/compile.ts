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
/**
 * The class whose instances expose split-by-condition tools (`present()`,
 * `promptUser()`). A toolkit entry that calls a method on one of these passes
 * through untouched — the library, not this compiler, routes its halves.
 */
const GENERATIVE_FACTORY = "JSONGenerativeUI";

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
    super(`[assistant-ui/next]${filename ? ` ${filename}:` : ""} ${message}`);
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
  return (
    code.startsWith(`"${DIRECTIVE}"`, i) || code.startsWith(`'${DIRECTIVE}'`, i)
  );
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
    plugins: ["typescript", "jsx", "explicitResourceManagement"],
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
  const safeToolkitSpreads = collectSafeToolkitSpreads(ast, filename);

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
          safeToolkitSpreads,
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
      filename,
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
 * Collects the names bound to `new JSONGenerativeUI(...)` (e.g.
 * `const generative = new JSONGenerativeUI({ library })`). A toolkit entry that
 * calls a method on one of these is a generative tool whose halves the library
 * routes by export condition, so it passes through the toolkit pass untouched.
 */
function collectGenerativeInstances(ast: t.File): Set<string> {
  const names = new Set<string>();
  for (const statement of ast.program.body) {
    if (!t.isVariableDeclaration(statement)) continue;
    for (const declaration of statement.declarations) {
      const { id, init } = declaration;
      if (
        t.isIdentifier(id) &&
        t.isNewExpression(init) &&
        t.isIdentifier(init.callee, { name: GENERATIVE_FACTORY })
      ) {
        names.add(id.name);
      }
    }
  }
  return names;
}

/**
 * Toolkit identifiers that are safe to spread into a `defineToolkit({ ... })`.
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
function collectSafeToolkitSpreads(
  ast: t.File,
  filename: string | undefined,
): Set<string> {
  const names = new Set<string>();
  const generativeBySource = new Map<string, boolean>();

  for (const statement of ast.program.body) {
    if (t.isVariableDeclaration(statement)) {
      for (const declaration of statement.declarations) {
        const { id, init } = declaration;
        if (t.isIdentifier(id) && init && unwrapToToolkitCall(init)) {
          names.add(id.name);
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

      const source = statement.source.value;
      let isGenerative = generativeBySource.get(source);
      if (isGenerative === undefined) {
        isGenerative = isGenerativeImport(source, filename);
        generativeBySource.set(source, isGenerative);
      }
      if (isGenerative) names.add(defaultSpecifier.local.name);
    }
  }

  return names;
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
 * Whether an import specifier resolves on disk to a `"use generative"` module.
 * Relative specifiers and `tsconfig` path aliases (e.g. `@/tools`) are resolved;
 * anything else (a bare package, an unresolvable alias) is treated as
 * non-generative, and thus an unsafe spread.
 */
function isGenerativeImport(
  source: string,
  filename: string | undefined,
): boolean {
  const cleanFilename = cleanAbsoluteFilename(filename);
  if (!cleanFilename) return false;

  const resolved = resolveImportedModuleFile(source, cleanFilename);
  if (!resolved) return false;

  try {
    return isGenerativeModule(readFileSync(resolved, "utf8"));
  } catch {
    return false;
  }
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

/** Walks up from a directory to the nearest `tsconfig.json` that declares `paths`. */
function loadTsconfigAliases(fromDir: string): TsconfigAliases | null {
  let dir = fromDir;
  for (;;) {
    const tsconfigPath = nodePath.join(dir, "tsconfig.json");
    if (existsSync(tsconfigPath)) {
      const aliases = readTsconfigAliases(tsconfigPath, new Set());
      if (aliases) return aliases;
    }
    const parent = nodePath.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
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
    if (nodePath.extname(base) === ".json")
      return existsSync(base) ? base : null;
    const withJson = `${base}.json`;
    if (existsSync(withJson)) return withJson;
    return existsSync(base) ? base : null;
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

function isSafeToolkitSpread(
  entry: t.SpreadElement,
  safeToolkitSpreads: Set<string>,
): boolean {
  if (t.isIdentifier(entry.argument)) {
    return safeToolkitSpreads.has(entry.argument.name);
  }

  const directMcpToolkit = unwrapToCall(entry.argument, MCP_TOOLKIT_WRAPPER);
  return (
    !!directMcpToolkit && t.isObjectExpression(directMcpToolkit.arguments[0])
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
  safeToolkitSpreads: Set<string>,
  flags: TargetFlags,
  filename: string | undefined,
): void {
  const nextProperties: t.ObjectExpression["properties"] = [];

  for (const entry of object.properties) {
    const value = entryValue(entry);
    if (!value) {
      if (
        t.isSpreadElement(entry) &&
        isSafeToolkitSpread(entry, safeToolkitSpreads)
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
      throw new GenerativeCompileError(
        "each tool must be an inline object literal (`name: { ... }`) or a " +
          "compiler-visible toolkit spread / generative tool (e.g. " +
          "`...defineMcpToolkit(...)`, `...baseToolkit`, or " +
          "`generative.present()`) so its `execute` can be routed",
        filename,
      );
    }

    // Nature is inferred from `execute` (see inferToolType), not an authored
    // `type`. The resolved type is written back below so the runtime keeps it.
    const execute = findMember(value, "execute");
    const isStub = execute ? executeIsStubTool(execute) : false;
    const isExternal = execute ? executeIsExternalTool(execute) : false;
    const type = inferToolType(value, filename);
    const hasRender = !!findMember(value, "render");
    const hasRenderText = !!findMember(value, "renderText");

    if (type === "frontend" && !hasRender && !hasRenderText) {
      throw new GenerativeCompileError(
        "a frontend tool must declare a `render` or `renderText` " +
          "(it has no server execute to show otherwise)",
        filename,
      );
    }

    if (type === "human" && !hasRender) {
      throw new GenerativeCompileError(
        "a human tool must declare a `render` so it can collect input",
        filename,
      );
    }

    if (type === "provider" && execute) {
      applyProviderToolConfig(value, execute, filename);
    }

    if (isExternal) {
      if (!hasRender && !hasRenderText) {
        throw new GenerativeCompileError(
          "an external tool must declare a `render` or `renderText` " +
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
      throw new GenerativeCompileError(
        "`providerTool(...)` config cannot duplicate tool properties",
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
  filename: string | undefined,
): ToolType {
  const execute = findMember(object, "execute");
  if (!execute) {
    throw new GenerativeCompileError(
      "every tool must declare an `execute`; use `humanTool()` for a " +
        "human-in-the-loop tool",
      filename,
    );
  }
  if (executeIsHumanTool(execute)) return "human";
  if (executeIsProviderTool(execute)) return "provider";
  if (executeIsStubTool(execute)) return "frontend";
  if (executeIsExternalTool(execute)) return "backend";
  return executeIsClient(execute) ? "frontend" : "backend";
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
