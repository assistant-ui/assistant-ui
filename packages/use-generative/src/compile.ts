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
}

export interface CompileResult {
  code: string;
  map?: object | null;
}

/** Thrown when a `"use generative"` file violates an authoring constraint. */
export class GenerativeCompileError extends Error {
  constructor(message: string, filename?: string) {
    super(`[use-generative]${filename ? ` ${filename}:` : ""} ${message}`);
    this.name = "GenerativeCompileError";
  }
}

/** Whether a source string opts into generative compilation via the directive. */
export function isGenerativeModule(code: string): boolean {
  // The directive must be a leading statement (before any import/expression).
  return /^﻿?\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use generative["']/.test(
    code,
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
    if (!value) continue;

    const type = readToolType(value, filename);
    const hasRender = !!findMember(value, "render");
    const hasExecute = !!findMember(value, "execute");

    if (hasExecute && !type) {
      throw new GenerativeCompileError(
        `tool "${entryName(entry) ?? "?"}" has an \`execute\` but no static \`type\`; ` +
          `add type: "frontend" | "backend" | "human"`,
        filename,
      );
    }

    if (target === "client") {
      // Drop a backend tool's execute; frontend execute stays with render.
      if (hasExecute && type === "backend") removeMember(value, "execute");
      if (hasRender) keptRender = true;
    } else {
      // server: render is never needed; only a backend execute survives.
      if (hasRender) removeMember(value, "render");
      if (hasExecute && type !== "backend") removeMember(value, "execute");
      if (hasExecute && type === "backend") keptBackendExecute = true;
    }
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
  if (target === "server" && keptBackendExecute) {
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
    object = unwrapToObject(stmt.declaration);
    // Strip authoring wrappers (`satisfies Toolkit`, `defineToolkit(...)`) so
    // they — and the now-unused imports they pulled — never reach the build.
    // The bare object literal is emitted instead.
    if (object) stmt.declaration = object;
  }

  if (!sawDefault) {
    throw new GenerativeCompileError("missing a default export", filename);
  }
  if (!object) {
    throw new GenerativeCompileError(
      "the default export must be an object literal " +
        "(optionally wrapped in `satisfies`/`as` or a `define`-style helper call)",
      filename,
    );
  }
  return object;
}

/**
 * Drills through `satisfies`/`as`, parentheses, and a wrapping helper call
 * (e.g. `defineToolkit({...})`) to the underlying object literal. Mutating it
 * in place preserves the wrapper in the emitted code.
 */
function unwrapToObject(node: t.Node): t.ObjectExpression | null {
  if (t.isTSSatisfiesExpression(node) || t.isTSAsExpression(node)) {
    return unwrapToObject(node.expression);
  }
  if (t.isParenthesizedExpression(node)) return unwrapToObject(node.expression);
  if (t.isObjectExpression(node)) return node;
  if (t.isCallExpression(node) && node.arguments.length > 0) {
    return unwrapToObject(node.arguments[0]!);
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

function entryName(entry: Entry): string | undefined {
  if (t.isObjectProperty(entry)) return memberName(entry.key, entry.computed);
  return undefined;
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

function readToolType(
  object: t.ObjectExpression,
  filename: string | undefined,
): ToolType | undefined {
  const member = findMember(object, "type");
  if (!member || !t.isObjectProperty(member)) return undefined;
  if (!t.isStringLiteral(member.value)) {
    throw new GenerativeCompileError(
      "`type` must be a static string literal so it can route `execute`",
      filename,
    );
  }
  return member.value.value as ToolType;
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
 * Removes code left unreferenced after region removal: unused top-level
 * declarations (e.g. local helper components a dropped `render` used), then
 * unused import specifiers. Runs to a fixpoint so a removed helper frees the
 * imports and other helpers it referenced. Exported declarations, bare
 * side-effect imports, and declarations with potentially side-effectful
 * initializers are kept.
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
              if (
                t.isIdentifier(decl.id) &&
                isRemovableInit(decl.init) &&
                isUnused(decl.id.name)
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

/** Whether a variable initializer is safe to drop (no observable side effects). */
function isRemovableInit(node: t.Expression | null | undefined): boolean {
  if (node == null) return true;
  if (t.isTSAsExpression(node) || t.isTSSatisfiesExpression(node)) {
    return isRemovableInit(node.expression);
  }
  return (
    t.isArrowFunctionExpression(node) ||
    t.isFunctionExpression(node) ||
    t.isClassExpression(node) ||
    t.isObjectExpression(node) ||
    t.isArrayExpression(node) ||
    t.isIdentifier(node) ||
    t.isMemberExpression(node) ||
    t.isTemplateLiteral(node) ||
    t.isJSXElement(node) ||
    t.isJSXFragment(node) ||
    t.isLiteral(node)
  );
}
