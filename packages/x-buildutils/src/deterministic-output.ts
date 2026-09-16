import { existsSync, readFileSync } from "node:fs";
import * as ts from "typescript";
import type { Plugin, RenderedChunk } from "rolldown";

const compareStrings = (a: string, b: string) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const isRelativeSpecifier = (specifier: string) => specifier.startsWith(".");

const normalizeSpecifier = (specifier: string) =>
  specifier.replace(/\.(?:[cm]?js|[cm]?tsx?)$/, "");

function reorderNodes<T extends ts.Node>(
  code: string,
  nodes: T[],
  order: number[],
) {
  const first = nodes[0]!;
  const declarations = nodes.map((node) =>
    code.slice(node.getStart(), node.getEnd()),
  );
  const separators = nodes.map((node, index) =>
    index === nodes.length - 1
      ? ""
      : code.slice(node.getEnd(), nodes[index + 1]!.getStart()),
  );
  const prefix = code.slice(first.getFullStart(), first.getStart());
  return `${prefix}${order
    .map((index, position) => `${declarations[index]}${separators[position]}`)
    .join("")}`;
}

function propertyName(member: ts.TypeElement): string | undefined {
  if (!ts.isPropertySignature(member) || !member.name) return undefined;
  if (ts.isComputedPropertyName(member.name)) return undefined;
  if (
    ts.isIdentifier(member.name) ||
    ts.isStringLiteral(member.name) ||
    ts.isNumericLiteral(member.name)
  ) {
    return member.name.text;
  }
  return undefined;
}

function isZodEnum(node: ts.TypeReferenceNode, sourceFile: ts.SourceFile) {
  const typeName = node.typeName.getText(sourceFile);
  return typeName === "ZodEnum" || typeName === "z.ZodEnum";
}

function sortImportGroups(code: string, scriptKind: ts.ScriptKind) {
  const sourceFile = ts.createSourceFile(
    "output",
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const groups: ts.ImportDeclaration[][] = [];
  let group: ts.ImportDeclaration[] = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      isRelativeSpecifier(statement.moduleSpecifier.text)
    ) {
      group.push(statement);
    } else if (group.length > 0) {
      groups.push(group);
      group = [];
    }
  }
  if (group.length > 0) groups.push(group);

  let normalized = code;
  for (const imports of groups) {
    if (imports.length < 2) continue;

    const order = imports
      .map((statement, index) => ({
        index,
        specifier: (statement.moduleSpecifier as ts.StringLiteral).text,
      }))
      .sort(
        (a, b) => compareStrings(a.specifier, b.specifier) || a.index - b.index,
      )
      .map(({ index }) => index);
    const first = imports[0]!;
    const last = imports.at(-1)!;
    const sorted = reorderNodes(normalized, imports, order);
    const start = first.getFullStart();
    const end = last.getEnd();
    if (sorted !== normalized.slice(start, end)) {
      normalized = `${normalized.slice(0, start)}${sorted}${normalized.slice(end)}`;
    }
  }
  return normalized;
}

function sortTypeReferenceLiterals(code: string) {
  const sourceFile = ts.createSourceFile(
    "output.d.ts",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const literals: ts.TypeLiteralNode[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isTypeLiteralNode(node) &&
      ts.isTypeReferenceNode(node.parent) &&
      isZodEnum(node.parent, sourceFile)
    ) {
      const names = node.members.map(propertyName);
      if (
        names.length > 1 &&
        names.every((name): name is string => name !== undefined) &&
        new Set(names).size === names.length
      ) {
        literals.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  let normalized = code;
  literals.sort((a, b) => a.getWidth(sourceFile) - b.getWidth(sourceFile));
  for (const literal of literals) {
    const names = literal.members.map(propertyName);
    if (!names.every((name): name is string => name !== undefined)) continue;

    const order = names
      .map((name, index) => ({ index, name }))
      .sort((a, b) => compareStrings(a.name, b.name) || a.index - b.index)
      .map(({ index }) => index);
    const first = literal.members[0]!;
    const last = literal.members.at(-1)!;
    const start = first.getFullStart();
    const end = last.getEnd();
    const sorted = reorderNodes(normalized, [...literal.members], order);
    if (sorted !== normalized.slice(start, end)) {
      normalized = `${normalized.slice(0, start)}${sorted}${normalized.slice(end)}`;
    }
  }
  return normalized;
}

function sourceSideEffectImports(facadeModuleId: string) {
  const withoutDeclarationExtension = facadeModuleId.replace(
    /\.d\.[cm]?ts$/,
    "",
  );
  const sourcePath = [
    facadeModuleId,
    `${withoutDeclarationExtension}.ts`,
    `${withoutDeclarationExtension}.tsx`,
  ].find((candidate) => existsSync(candidate));
  if (!sourcePath) return undefined;

  const source = readFileSync(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  return new Set(
    sourceFile.statements.flatMap((statement) => {
      if (
        !ts.isImportDeclaration(statement) ||
        statement.importClause ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        return [];
      }
      return [normalizeSpecifier(statement.moduleSpecifier.text)];
    }),
  );
}

function removeGeneratedSideEffectImports(
  code: string,
  facadeModuleId: string | null,
) {
  if (!facadeModuleId) return code;
  const sourceImports = sourceSideEffectImports(facadeModuleId);
  if (!sourceImports) return code;

  const sourceFile = ts.createSourceFile(
    "output.d.ts",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const ranges = sourceFile.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !isRelativeSpecifier(statement.moduleSpecifier.text) ||
      sourceImports.has(normalizeSpecifier(statement.moduleSpecifier.text))
    ) {
      return [];
    }
    let end = statement.getEnd();
    if (code[end] === "\r") end++;
    if (code[end] === "\n") end++;
    return [{ start: statement.getStart(), end }];
  });

  return ranges
    .toSorted((a, b) => b.start - a.start)
    .reduce(
      (result, range) =>
        `${result.slice(0, range.start)}${result.slice(range.end)}`,
      code,
    );
}

function normalizeChunk(code: string, chunk: RenderedChunk) {
  const isDeclaration = chunk.fileName.endsWith(".d.ts");
  const isJavaScript =
    chunk.fileName.endsWith(".js") || chunk.fileName.endsWith(".cjs");
  if (!isDeclaration && !isJavaScript) return code;

  let normalized = code;
  if (isDeclaration) {
    normalized = removeGeneratedSideEffectImports(
      normalized,
      chunk.facadeModuleId,
    );
  }
  normalized = sortImportGroups(
    normalized,
    isDeclaration ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  if (isDeclaration) normalized = sortTypeReferenceLiterals(normalized);
  return normalized;
}

export function deterministicOutput(): Plugin {
  return {
    name: "deterministic-output",
    renderChunk(code, chunk) {
      const normalized = normalizeChunk(code, chunk);
      return normalized === code ? null : { code: normalized, map: null };
    },
  };
}
