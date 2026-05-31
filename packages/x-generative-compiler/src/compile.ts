import { parse } from "@babel/parser";
import _traverse, { type NodePath } from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { DIRECTIVE, type Target } from "./constants";

// @babel/traverse and @babel/generator are CJS; their default export is the
// function itself under some interop and `{ default }` under others.
const traverse = (
  typeof _traverse === "function" ? _traverse : (_traverse as any).default
) as typeof _traverse;
const generate = (
  typeof _generate === "function" ? _generate : (_generate as any).default
) as typeof _generate;

export type ToolType = "frontend" | "backend" | "human";

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

  const object = findDefaultExportObject(ast, filename);

  let keptRender = false;
  let keptBackendExecute = false;

  for (const entry of object.properties) {
    const value = entryValue(entry);
    if (!value) {
      // A non-inline tool (spread, method, or a call like `makeTool()`) can't be
      // analyzed, so its `execute` would pass through to the client unstripped.
      throw new GenerativeCompileError(
        "each tool must be an inline object literal (`name: { ... }`) so its " +
          "`execute` can be routed",
        filename,
      );
    }

    // Nature is inferred from `execute` (see inferToolType), not an authored
    // `type`. The resolved type is written back below so the runtime keeps it.
    const type = inferToolType(value, filename);
    const hasRender = !!findMember(value, "render");
    const execute = findMember(value, "execute");

    if ((type === "frontend" || type === "human") && !hasRender) {
      throw new GenerativeCompileError(
        `a ${type} tool must declare a \`render\` (it has no server execute to show otherwise)`,
        filename,
      );
    }

    if (target === "client") {
      // A frontend execute stays (its `"use client"` marker is no longer needed
      // once the module is client); a backend execute and a human `hitl()`
      // sentinel are both dropped.
      if (execute && type === "frontend") stripUseClient(execute);
      else if (execute) removeMember(value, "execute");
      if (hasRender) keptRender = true;
    } else {
      // server: render is never needed; only a backend execute survives.
      if (hasRender) removeMember(value, "render");
      if (execute && type !== "backend") removeMember(value, "execute");
      if (execute && type === "backend") keptBackendExecute = true;
    }

    setToolType(value, type);
  }

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

function findDefaultExportObject(
  ast: t.File,
  filename: string | undefined,
): t.ObjectExpression {
  let object: t.ObjectExpression | null = null;
  let sawDefault = false;

  for (const stmt of ast.program.body) {
    if (!t.isExportDefaultDeclaration(stmt)) continue;
    sawDefault = true;
    object = unwrapDefineToolkit(stmt.declaration);
    // Emit the bare object literal, dropping the `defineToolkit(...)` wrapper
    // (and the import it pulled).
    if (object) stmt.declaration = object;
  }

  if (!sawDefault) {
    throw new GenerativeCompileError("missing a default export", filename);
  }
  if (!object) {
    throw new GenerativeCompileError(
      "the default export must be `defineToolkit({ ... })` (imported from " +
        '"@assistant-ui/react"); wrapping is required so a backend `execute` ' +
        "can't be authored in a way that reaches the client",
      filename,
    );
  }
  return object;
}

/**
 * Unwraps the required `defineToolkit({ ... })` wrapper (through `satisfies`/`as`
 * and parens) to the underlying object literal. Anything else — a bare object, a
 * `satisfies Toolkit` without the wrapper, some other call — yields `null` so the
 * caller errors.
 */
function unwrapDefineToolkit(node: t.Node): t.ObjectExpression | null {
  if (t.isTSSatisfiesExpression(node) || t.isTSAsExpression(node)) {
    return unwrapDefineToolkit(node.expression);
  }
  if (t.isParenthesizedExpression(node)) {
    return unwrapDefineToolkit(node.expression);
  }
  if (
    t.isCallExpression(node) &&
    t.isIdentifier(node.callee, { name: "defineToolkit" }) &&
    t.isObjectExpression(node.arguments[0])
  ) {
    return node.arguments[0];
  }
  return null;
}

type Entry = t.ObjectExpression["properties"][number];

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

/** Whether an `execute` is the `hitl()` human-in-the-loop sentinel. */
function executeIsHitl(member: t.ObjectProperty | t.ObjectMethod): boolean {
  return (
    t.isObjectProperty(member) &&
    t.isCallExpression(member.value) &&
    t.isIdentifier(member.value.callee, { name: "hitl" })
  );
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
 * authored `type`: `hitl()` → `human`; `"use client"` → `frontend`; otherwise
 * `backend`. The loader writes the result back as a `type` field (see
 * {@link setToolType}) so the runtime keeps it.
 */
function inferToolType(
  object: t.ObjectExpression,
  filename: string | undefined,
): ToolType {
  const execute = findMember(object, "execute");
  if (!execute) {
    throw new GenerativeCompileError(
      "every tool must declare an `execute`; use `hitl()` for a " +
        "human-in-the-loop tool",
      filename,
    );
  }
  if (executeIsHitl(execute)) return "human";
  return executeIsClient(execute) ? "frontend" : "backend";
}

/** Writes the resolved `type` back onto the tool object (replacing any author's). */
function setToolType(object: t.ObjectExpression, type: ToolType): void {
  removeMember(object, "type");
  // Append (not prepend) so the inferred type wins over any earlier spread.
  object.properties.push(
    t.objectProperty(t.identifier("type"), t.stringLiteral(type)),
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
