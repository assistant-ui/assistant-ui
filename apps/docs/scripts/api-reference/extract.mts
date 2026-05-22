import {
  Node,
  Project,
  Scope,
  type InterfaceDeclaration,
  type JSDoc,
  type JSDocableNode,
  type Node as TsNode,
  type SourceFile,
  type Symbol as TsMorphSymbol,
  type Type,
  type TypeAliasDeclaration,
} from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";
import { DOCS_ROOT, REPO_ROOT } from "./paths.mts";
import type { ExportInfo } from "./discover.mts";

// ── Project (per-process shared instance) ──────────────────────────────────

let _project: Project | undefined;

export function getProject(): Project {
  if (_project) return _project;
  _project = new Project({
    tsConfigFilePath: path.join(DOCS_ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });
  // Note: do NOT eagerly add primitive source globs here. Doing so changes
  // ts-morph's intersection property iteration order (legacy api-surface
  // loaded files lazily via addSourceFileAtPath). Primitive sources get
  // pulled in on demand by the primitive extraction module.
  return _project;
}

// ── Semantic model ─────────────────────────────────────────────────────────

export type InheritedFrom =
  | "react"
  | "radix"
  | "csstype"
  | "react-textarea-autosize"
  | "tw"
  | "other";

export type PropModel = {
  name: string;
  /** Resolved ts-morph type text (only `import()` prefixes stripped).
   *  Preserves `| undefined`. Used by primitive-docs projection. */
  rawType?: string;
  /** The explicit type-node text the author wrote where available, else the
   *  resolved type. Used by the api-ref projection (which then strips
   *  trailing `| undefined`). Matches legacy api-surface output. */
  declaredType?: string;
  description?: string;
  default?: string;
  deprecated?: string;
  /** undefined when the source has no required-ness signal (e.g. class
   *  members in a class shape). Projections that always want a boolean
   *  should default to `false`. */
  required?: boolean;
  /** Set when every declaration of this property comes from a known third
   * party. Projections decide whether to drop. */
  inheritedFrom?: InheritedFrom;
  children?: { typeName?: string; props: PropModel[] }[];
};

export type ExtractedShape = {
  kind: "interface" | "type" | "class" | "function" | "component" | "callable";
  name: string;
  parameters: PropModel[];
  signature?: string;
};

// ── Text utilities ─────────────────────────────────────────────────────────

/** Strip `import("...").` prefixes and a leading `|`. Preserves `| undefined`
 *  so projections can decide whether to strip. Used internally by signature
 *  generation; the api-ref projection strips `| undefined` itself. */
export function rawTypeText(typeText: string): string {
  return typeText.replace(/import\(".*?"\)\./g, "");
}

/** Internal helper used by ts-morph logic that compares against canonical
 *  type text. Strips `import()` prefixes, leading `|`, and trailing
 *  `| undefined`. */
export function cleanTypeText(typeText: string): string {
  return typeText
    .replace(/import\(".*?"\)\./g, "")
    .replace(/^\s*\|\s*/, "")
    .replace(/\s*\|\s*undefined$/, "");
}

export function cleanSignatureText(text: string): string {
  return cleanTypeText(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Declaration helpers ────────────────────────────────────────────────────

export function resolveAliasedDeclaration(declaration: TsNode): TsNode {
  if (Node.isExportSpecifier(declaration)) {
    const aliased = declaration.getSymbol()?.getAliasedSymbol();
    const resolved = aliased?.getDeclarations()[0];
    if (resolved) return resolved;
  }
  return declaration;
}

function declarationPriority(node: TsNode): number {
  if (Node.isBindingElement(node)) return 0;
  if (Node.isVariableDeclaration(node)) return 0;
  if (Node.isClassDeclaration(node)) return 1;
  if (Node.isFunctionDeclaration(node)) return 2;
  if (Node.isInterfaceDeclaration(node)) return 3;
  if (Node.isTypeAliasDeclaration(node)) return 4;
  if (Node.isModuleDeclaration(node)) return 5;
  return 6;
}

export function chooseDeclaration(declarations: TsNode[]): TsNode | undefined {
  return declarations
    .map(resolveAliasedDeclaration)
    .sort((a, b) => declarationPriority(a) - declarationPriority(b))[0];
}

function declarationTypeText(node: TsNode): string {
  if (
    Node.isVariableDeclaration(node) ||
    Node.isParameterDeclaration(node) ||
    Node.isPropertySignature(node) ||
    Node.isPropertyDeclaration(node)
  ) {
    const typeNode = node.getTypeNode();
    if (typeNode) return cleanSignatureText(typeNode.getText());
    return cleanSignatureText(node.getType().getText(node));
  }
  return cleanSignatureText(node.getType().getText(node));
}

function returnTypeText(node: TsNode): string {
  if (Node.isMethodDeclaration(node) || Node.isFunctionDeclaration(node)) {
    const typeNode = node.getReturnTypeNode();
    if (typeNode) return cleanSignatureText(typeNode.getText());
    return cleanSignatureText(node.getReturnType().getText(node));
  }
  return declarationTypeText(node);
}

function parameterSignature(parameter: TsNode): string {
  if (!Node.isParameterDeclaration(parameter)) return parameter.getText();
  const dotDotDot = parameter.isRestParameter() ? "..." : "";
  const name = parameter.getNameNode().getText();
  const optional = parameter.hasQuestionToken() ? "?" : "";
  const type = declarationTypeText(parameter);
  const initializer = parameter.getInitializer()?.getText();
  const defaultValue = initializer ? ` = ${initializer}` : "";
  return `${dotDotDot}${name}${optional}: ${type}${defaultValue}`;
}

function typeParameterText(node: TsNode): string {
  if (
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node)
  ) {
    const params = node.getTypeParameters().map((param) => param.getText());
    return params.length > 0 ? `<${params.join(", ")}>` : "";
  }
  return "";
}

function isPublicClassMember(node: TsNode): boolean {
  if (
    Node.isConstructorDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isPropertyDeclaration(node)
  ) {
    const scope = node.getScope();
    return scope !== Scope.Private && scope !== Scope.Protected;
  }
  return false;
}

function classMemberPrefix(node: TsNode): string {
  if (
    (Node.isMethodDeclaration(node) || Node.isPropertyDeclaration(node)) &&
    node.isStatic()
  ) {
    return "static ";
  }
  return "";
}

// ── JSDoc layer (single source of truth) ───────────────────────────────────

const warnedUnresolvedJsDocLinks = new Set<string>();

type JsDocLinkResolver = (target: string) => string | undefined;

export type JsDocRenderOptions = {
  linkResolver?: JsDocLinkResolver;
};

function isExternalLinkTarget(target: string): boolean {
  return /^(https?:|mailto:)/.test(target);
}

function parseJsDocLinkContent(content: string): {
  target: string;
  label: string;
} {
  const trimmed = content.trim();
  const pipeIndex = trimmed.indexOf("|");
  if (pipeIndex !== -1) {
    const target = trimmed.slice(0, pipeIndex).trim();
    const label = trimmed.slice(pipeIndex + 1).trim();
    return { target, label: label || target };
  }

  const match = trimmed.match(/^(\S+)(?:\s+([\s\S]+))?$/);
  const target = match?.[1]?.trim() ?? trimmed;
  const label = match?.[2]?.trim() || target;
  return { target, label };
}

function warnUnresolvedJsDocLink(target: string, source: string): void {
  const key = `${source}:${target}`;
  if (warnedUnresolvedJsDocLinks.has(key)) return;
  warnedUnresolvedJsDocLinks.add(key);
  console.warn(`Warning: unresolved JSDoc link "${target}" in ${source}`);
}

function renderJsDocLinkTag(
  content: string,
  source: string,
  { linkResolver }: JsDocRenderOptions = {},
): string {
  const { target, label } = parseJsDocLinkContent(content);
  const isExternal = isExternalLinkTarget(target);
  const href = isExternal ? target : linkResolver?.(target);
  if (!href) {
    if (!isExternal) warnUnresolvedJsDocLink(target, source);
    return label;
  }
  const labelText = label.replaceAll("[", "\\[").replaceAll("]", "\\]");
  return `[${labelText}](${href.replaceAll(")", "%29")})`;
}

export function renderJsDocLinks(
  text: string,
  source: string,
  options?: JsDocRenderOptions,
): string {
  return text.replace(/\{@link\s+([^}]+)\}/g, (_, content: string) =>
    renderJsDocLinkTag(content, source, options),
  );
}

function cleanJsDocTagText(text: string | undefined): string | undefined {
  return text
    ?.replace(/\n\s*\*\s?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deprecatedTagParts(doc: JSDoc | undefined): {
  deprecated?: string;
  trailingDescription?: string;
} {
  const tag = doc?.getTags().find((tag) => tag.getTagName() === "deprecated");
  const cleaned = cleanJsDocTagText(tag?.getCommentText());
  if (!cleaned) return {};

  const [deprecated, ...rest] = cleaned.split(/\n\s*\n/);
  const trailingDescription = rest.join("\n\n").trim();
  return {
    deprecated: deprecated?.trim() || undefined,
    trailingDescription: trailingDescription || undefined,
  };
}

function jsDocSourceLabel(node: TsNode | undefined): string {
  if (!node) return "unknown source";
  const filePath = path.relative(REPO_ROOT, node.getSourceFile().getFilePath());
  let name: string | undefined;
  if (
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isInterfaceDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isParameterDeclaration(node) ||
    Node.isPropertyDeclaration(node) ||
    Node.isPropertySignature(node) ||
    Node.isTypeAliasDeclaration(node) ||
    Node.isVariableDeclaration(node)
  ) {
    name = node.getName();
  }
  return name ? `${name} (${filePath})` : filePath;
}

export function getJsDocCommentText(
  doc: JSDoc,
  source = "unknown source",
  options?: JsDocRenderOptions,
): string | undefined {
  const text =
    doc.getCommentText() ?? deprecatedTagParts(doc).trailingDescription;
  if (!text) return undefined;

  const cleaned = renderJsDocLinks(text, source, options)
    .replace(/\s+([.,;:])/g, "$1")
    .trim();

  return cleaned || undefined;
}

export function jsDocTag(
  doc: JSDoc | undefined,
  name: string,
  source = "unknown source",
  options?: JsDocRenderOptions,
): string | undefined {
  const tag = doc?.getTags().find((tag) => tag.getTagName() === name);
  const tagText =
    name === "deprecated"
      ? deprecatedTagParts(doc).deprecated
      : cleanJsDocTagText(tag?.getCommentText());
  return tagText
    ? renderJsDocLinks(tagText, `${source} @${name}`, options)
    : undefined;
}

function jsDocTags(
  doc: JSDoc | undefined,
  name: string,
  source = "unknown source",
  options?: JsDocRenderOptions,
): string[] | undefined {
  const tags =
    doc
      ?.getTags()
      .filter((tag) => tag.getTagName() === name)
      .map((tag) => cleanJsDocTagText(tag.getCommentText()))
      .filter((text): text is string => Boolean(text))
      .map((text) => renderJsDocLinks(text, `${source} @${name}`, options)) ??
    [];
  return tags.length > 0 ? tags : undefined;
}

function getJsDocs(node: TsNode | undefined): JSDoc[] {
  if (!node) return [];
  if (
    Node.isInterfaceDeclaration(node) ||
    Node.isTypeAliasDeclaration(node) ||
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isVariableStatement(node)
  ) {
    return node.getJsDocs();
  }
  if (Node.isVariableDeclaration(node)) {
    return node.getVariableStatement()?.getJsDocs() ?? [];
  }
  return [];
}

export function extractJsDoc(
  node: TsNode | undefined,
  options?: JsDocRenderOptions,
): {
  jsDoc?: string;
  deprecated?: string;
  examples?: string[];
} {
  const doc = getJsDocs(node)[0];
  const source = jsDocSourceLabel(node);
  return {
    jsDoc: doc ? getJsDocCommentText(doc, source, options) : undefined,
    deprecated: jsDocTag(doc, "deprecated", source, options),
    examples: jsDocTags(doc, "example", source, options),
  };
}

function hasJsDocs(node: TsNode): node is TsNode & JSDocableNode {
  return (
    typeof (node as TsNode & Partial<JSDocableNode>).getJsDocs === "function"
  );
}

function propertyJsDocMeta(
  node: TsNode | undefined,
  options?: JsDocRenderOptions,
): {
  description?: string;
  default?: string;
  deprecated?: string;
} {
  if (!node || !hasJsDocs(node)) return {};
  const doc = node.getJsDocs()[0];
  if (!doc) return {};
  const source = jsDocSourceLabel(node);
  return {
    description: getJsDocCommentText(doc, source, options),
    default: jsDocTag(doc, "default", source, options),
    deprecated: jsDocTag(doc, "deprecated", source, options),
  };
}

function propertyDeclarationsJsDocMeta(
  declarations: TsNode[],
  options?: JsDocRenderOptions,
): {
  description?: string;
  default?: string;
  deprecated?: string;
} {
  return declarations.reduce<{
    description?: string;
    default?: string;
    deprecated?: string;
  }>((meta, declaration) => {
    const declarationMeta = propertyJsDocMeta(declaration, options);
    return {
      description: meta.description ?? declarationMeta.description,
      default: meta.default ?? declarationMeta.default,
      deprecated: meta.deprecated ?? declarationMeta.deprecated,
    };
  }, {});
}

// ── Signatures ─────────────────────────────────────────────────────────────

function propertySignatureLine(node: TsNode): string | undefined {
  if (!Node.isPropertyDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }
  const name = node.getNameNode().getText();
  const optional = node.hasQuestionToken() ? "?" : "";
  return `${classMemberPrefix(node)}${name}${optional}: ${declarationTypeText(node)};`;
}

function methodSignatureLine(node: TsNode): string | undefined {
  if (!Node.isMethodDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }
  const asyncPrefix = node.isAsync() ? "async " : "";
  const params = node.getParameters().map(parameterSignature).join(", ");
  const returnType = returnTypeText(node);
  return `${classMemberPrefix(node)}${asyncPrefix}${node.getName()}${typeParameterText(node)}(${params}): ${returnType};`;
}

function constructorSignatureLine(node: TsNode): string | undefined {
  if (!Node.isConstructorDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }
  const params = node.getParameters().map(parameterSignature).join(", ");
  return `constructor(${params});`;
}

function classSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isClassDeclaration(node)) return undefined;
  const extendsText = node.getExtends()?.getText();
  const implementsText = node.getImplements().map((item) => item.getText());
  const header = [
    `class ${name}${typeParameterText(node)}`,
    extendsText ? `extends ${extendsText}` : undefined,
    implementsText.length > 0
      ? `implements ${implementsText.join(", ")}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const members = [
    ...node.getConstructors().map(constructorSignatureLine),
    ...node.getProperties().map(propertySignatureLine),
    ...node.getMethods().map(methodSignatureLine),
  ].filter((line): line is string => Boolean(line));
  if (members.length === 0) return `${header} {}`;
  return [`${header} {`, ...members.map((line) => `  ${line}`), "}"].join("\n");
}

function functionSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isFunctionDeclaration(node)) return undefined;
  const asyncPrefix = node.isAsync() ? "async " : "";
  const params = node.getParameters().map(parameterSignature).join(", ");
  return `function ${asyncPrefix}${name}${typeParameterText(node)}(${params}): ${returnTypeText(node)};`;
}

function localTypeSignature(node: TsNode): string | undefined {
  if (Node.isInterfaceDeclaration(node)) {
    return cleanSignatureText(node.getText()).replace(/^export\s+/, "");
  }
  if (Node.isTypeAliasDeclaration(node)) {
    return `type ${node.getName()} = ${cleanSignatureText(node.getTypeNode().getText())};`;
  }
  return undefined;
}

function namespaceSupportingTypes(node: TsNode, name: string): string[] {
  return node
    .getSourceFile()
    .getModules()
    .filter((module) => module.getName() === name)
    .flatMap((module) => {
      const body = module.getBody();
      if (!Node.isModuleBlock(body)) return [];
      const typeLines = body
        .getStatements()
        .map(localTypeSignature)
        .filter((line): line is string => Boolean(line));
      if (typeLines.length === 0) return [];
      return [
        [
          `namespace ${name} {`,
          ...typeLines.map((line) =>
            line
              .split("\n")
              .map((innerLine) => `  ${innerLine}`)
              .join("\n"),
          ),
          "}",
        ].join("\n"),
      ];
    });
}

const localTypeDeclarationsCache = new Map<string, Map<string, TsNode[]>>();

function getLocalTypeDeclarations(
  sourceFile: SourceFile,
): Map<string, TsNode[]> {
  const filePath = sourceFile.getFilePath();
  const cached = localTypeDeclarationsCache.get(filePath);
  if (cached) return cached;

  const declarationsByName = new Map<string, TsNode[]>();
  const addDeclarations = (name: string, declarations: TsNode[]) => {
    declarationsByName.set(name, [
      ...(declarationsByName.get(name) ?? []),
      ...declarations,
    ]);
  };

  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    addDeclarations(name, declarations);
  }
  for (const importDecl of sourceFile.getImportDeclarations()) {
    for (const namedImport of importDecl.getNamedImports()) {
      const symbol = namedImport.getNameNode().getSymbol();
      addDeclarations(
        namedImport.getName(),
        symbol?.getAliasedSymbol()?.getDeclarations() ?? [],
      );
    }
  }

  localTypeDeclarationsCache.set(filePath, declarationsByName);
  return declarationsByName;
}

function referencedLocalTypes(node: TsNode, typeText: string): string[] {
  const referencedNames = [
    ...new Set(
      typeText.match(/\b[A-Z][A-Za-z0-9_]*(?:Props|Adapters)\b/g) ?? [],
    ),
  ];
  if (referencedNames.length === 0) return [];
  const declarationsByName = getLocalTypeDeclarations(node.getSourceFile());
  return referencedNames.flatMap((name) =>
    (declarationsByName.get(name) ?? [])
      .map(resolveAliasedDeclaration)
      .map(localTypeSignature)
      .filter((line): line is string => Boolean(line)),
  );
}

function variableSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isVariableDeclaration(node)) return undefined;
  const typeText = declarationTypeText(node);
  const namespaceTypes = namespaceSupportingTypes(node, name);
  return [
    ...referencedLocalTypes(node, [typeText, ...namespaceTypes].join("\n")),
    ...namespaceTypes,
    `const ${name}: ${typeText};`,
  ].join("\n\n");
}

function bindingElementSignature(
  node: TsNode,
  name: string,
): string | undefined {
  if (!Node.isBindingElement(node)) return undefined;
  return `const ${name}: ${cleanSignatureText(node.getType().getText(node))};`;
}

function typeSignature(node: TsNode, name: string): string | undefined {
  if (Node.isInterfaceDeclaration(node)) {
    return cleanSignatureText(node.getText());
  }
  if (Node.isTypeAliasDeclaration(node)) {
    return `type ${name} = ${cleanSignatureText(node.getTypeNode().getText())};`;
  }
  return undefined;
}

export function extractSignature(
  node: TsNode | undefined,
  name: string,
): string | undefined {
  if (!node) return undefined;
  const signature =
    classSignature(node, name) ??
    functionSignature(node, name) ??
    variableSignature(node, name) ??
    bindingElementSignature(node, name) ??
    typeSignature(node, name);
  return signature ? cleanSignatureText(signature) : undefined;
}

// ── Inheritance classification ─────────────────────────────────────────────

function classifyInheritance(filePath: string): InheritedFrom | undefined {
  if (filePath.includes("node_modules/@types/react")) return "react";
  if (filePath.includes("node_modules/react-textarea-autosize"))
    return "react-textarea-autosize";
  if (
    filePath.includes("node_modules/@radix-ui") ||
    filePath.includes("node_modules/radix-ui")
  ) {
    return "radix";
  }
  if (filePath.includes("node_modules/csstype")) return "csstype";
  if (filePath.includes("node_modules/tw-")) return "tw";
  return undefined;
}

/** Returns the inherited-from category if every declaration of the property
 *  comes from third-party code. Returns undefined if any declaration is
 *  local — even if some other declaration comes from a third party. */
function inheritanceForProperty(
  prop: TsMorphSymbol,
): InheritedFrom | undefined {
  const declarations = prop.getDeclarations();
  if (declarations.length === 0) return undefined;
  let category: InheritedFrom | undefined;
  for (const decl of declarations) {
    const source = classifyInheritance(decl.getSourceFile().getFilePath());
    if (!source) return undefined;
    // Prefer the most specific category: react > csstype > tw > textarea-autosize > radix > other.
    // For our purposes any single category is fine; picking the first is stable.
    category ??= source;
  }
  return category;
}

// ── Property → PropModel ───────────────────────────────────────────────────

function typeDisplayName(type: Type, fallback: string): string {
  const name = type.getAliasSymbol()?.getName() ?? type.getSymbol()?.getName();
  if (!name || name === "__type") return fallback;
  return name;
}

function propertyTypePath(ownerTypeName: string, propertyName: string): string {
  return `${ownerTypeName}["${propertyName}"]`;
}

function nonNullableUnionTypes(type: Type): Type[] {
  if (!type.isUnion()) return [type];
  return type
    .getUnionTypes()
    .filter((unionType) => !unionType.isUndefined() && !unionType.isNull());
}

function typeIncludesUndefined(type: Type): boolean {
  return (
    type.isUndefined() || type.getUnionTypes().some((t) => t.isUndefined())
  );
}

function isPrimitiveType(type: Type): boolean {
  return (
    type.isString() ||
    type.isNumber() ||
    type.isBoolean() ||
    type.isStringLiteral() ||
    type.isNumberLiteral() ||
    type.isBooleanLiteral() ||
    type.isUndefined() ||
    type.isNull()
  );
}

function symbolHasNonNeverDeclaration(symbol: TsMorphSymbol): boolean {
  return symbol.getDeclarations().some((declaration) => {
    const typeText =
      Node.isPropertySignature(declaration) ||
      Node.isPropertyDeclaration(declaration)
        ? declarationTypeText(declaration)
        : symbol.getTypeAtLocation(declaration).getText(declaration);
    return cleanTypeText(typeText) !== "never";
  });
}

function documentableProperties(type: Type): TsMorphSymbol[] {
  const directProperties = type.getProperties();
  if (!type.isUnion() || directProperties.length > 0) return directProperties;
  const types = nonNullableUnionTypes(type);
  if (types.length > 3) return directProperties;
  const properties = new Map<string, TsMorphSymbol>();
  for (const currentType of types) {
    for (const prop of currentType.getProperties()) {
      const name = prop.getName();
      const existing = properties.get(name);
      if (
        !existing ||
        (!symbolHasNonNeverDeclaration(existing) &&
          symbolHasNonNeverDeclaration(prop))
      ) {
        properties.set(name, prop);
      }
    }
  }
  if (properties.size > 30) return directProperties;
  return [...properties.values()];
}

function shouldExpandChildType(type: Type, typeText: string): boolean {
  if (type.isArray() || type.isTuple()) return false;
  const candidateTypes = nonNullableUnionTypes(type);
  if (candidateTypes.length === 0) return false;
  if (candidateTypes.every(isPrimitiveType)) return false;
  if (
    type.isUnion() &&
    candidateTypes.some((unionType) => isPrimitiveType(unionType))
  ) {
    return false;
  }
  if (type.getCallSignatures().length > 0) return false;
  if (typeText.includes("ReactNode") || typeText.startsWith("React.")) {
    return false;
  }
  // Note: do NOT pre-filter by inheritance here. The model carries the full
  // tree and each projection decides which children to drop. Pre-filtering by
  // inheritance would prevent projections that keep some inherited categories
  // (e.g. api-ref keeps radix) from rendering nested portal/dismiss
  // sub-objects whose direct properties happen to come from third-party.
  const childProps = documentableProperties(type).filter(
    (childProp) => !childProp.getName().startsWith("__"),
  );
  return childProps.length > 0 && childProps.length <= 30;
}

function processTypeChildren(
  type: Type,
  typeName: string,
  location: TsNode,
  depth: number,
  options?: JsDocRenderOptions,
): PropModel["children"] | undefined {
  if (depth >= 3) return undefined;
  const childModel = processTypeProperties(
    type,
    typeName,
    location,
    depth + 1,
    options,
  );
  if (!childModel || childModel.length === 0) return undefined;
  return [{ typeName, props: childModel }];
}

function parameterFromProperty(
  prop: TsMorphSymbol,
  location: TsNode,
  depth: number,
  ownerTypeName: string,
  options?: JsDocRenderOptions,
): PropModel | undefined {
  const name = prop.getName();
  if (name.startsWith("__")) return undefined;

  const declarations = prop.getDeclarations();
  const decl =
    declarations.find((declaration) => {
      const typeText =
        Node.isPropertySignature(declaration) ||
        Node.isPropertyDeclaration(declaration)
          ? declarationTypeText(declaration)
          : prop.getTypeAtLocation(declaration).getText(declaration);
      return cleanTypeText(typeText) !== "never";
    }) ?? declarations[0];

  if (
    name === "children" &&
    decl?.getSourceFile().getFilePath().includes("node_modules/")
  ) {
    return undefined;
  }

  const propType = decl
    ? prop.getTypeAtLocation(decl)
    : prop.getTypeAtLocation(location);
  // Two type representations:
  //  - `rawType`: resolved type text, preserves `| undefined`. Primitive-docs
  //    projection consumes this verbatim.
  //  - `declaredType`: prefers the explicit type-node the author wrote where
  //    available, else falls back to the resolved type. Api-ref projection
  //    consumes this and strips trailing `| undefined`. Mirrors the historic
  //    split between the two generators.
  const rawType = rawTypeText(propType.getText(decl ?? location));
  const declaredType =
    decl && (Node.isPropertySignature(decl) || Node.isPropertyDeclaration(decl))
      ? declarationTypeText(decl)
      : cleanTypeText(propType.getText(decl ?? location));

  const childTypeName = typeDisplayName(
    propType,
    propertyTypePath(ownerTypeName, name),
  );
  const children = shouldExpandChildType(propType, rawType)
    ? processTypeChildren(
        propType,
        childTypeName,
        decl ?? location,
        depth,
        options,
      )
    : undefined;

  let required: boolean;
  if (prop.isOptional() || typeIncludesUndefined(propType)) {
    required = false;
  } else if (
    decl &&
    ((Node.isPropertySignature(decl) && !decl.hasQuestionToken()) ||
      (Node.isPropertyDeclaration(decl) && !decl.hasQuestionToken()))
  ) {
    required = true;
  } else {
    required = !prop.isOptional();
  }

  const jsDoc = propertyDeclarationsJsDocMeta(declarations, options);
  const inheritedFrom = inheritanceForProperty(prop);

  const model: PropModel = {
    name,
    rawType,
    declaredType,
    required,
  };
  if (jsDoc.description) model.description = jsDoc.description;
  if (jsDoc.default) model.default = jsDoc.default;
  if (jsDoc.deprecated) model.deprecated = jsDoc.deprecated;
  if (inheritedFrom) model.inheritedFrom = inheritedFrom;
  if (children) model.children = children;

  return model;
}

function processTypeProperties(
  type: Type,
  typeName: string,
  location: TsNode,
  depth = 0,
  options?: JsDocRenderOptions,
): PropModel[] | undefined {
  const properties = documentableProperties(type)
    .map((prop) =>
      parameterFromProperty(prop, location, depth, typeName, options),
    )
    .filter((param): param is PropModel => Boolean(param));
  if (properties.length === 0) return undefined;
  return properties;
}

function parameterFromSignatureParameter(
  parameter: TsMorphSymbol,
  location: TsNode,
  depth: number,
  options?: JsDocRenderOptions,
): PropModel | undefined {
  const decl = parameter.getDeclarations()[0];
  const parameterType = decl
    ? parameter.getTypeAtLocation(decl)
    : parameter.getTypeAtLocation(location);
  const rawType = rawTypeText(parameterType.getText(decl ?? location));
  // For function parameters the api-ref projection wants the cleaned text
  // (legacy used cleanTypeText on the call-signature parameter type). There
  // is no explicit "type-node" for an inferred parameter, so declaredType
  // mirrors rawType minus `| undefined`.
  const declaredType = cleanTypeText(parameterType.getText(decl ?? location));
  let name = parameter.getName();
  if (decl && Node.isParameterDeclaration(decl)) {
    const nameNode = decl.getNameNode();
    if (Node.isObjectBindingPattern(nameNode)) {
      name = declaredType.endsWith("Props") ? "props" : "options";
    }
  }

  let required = !parameter.isOptional();
  if (decl && Node.isParameterDeclaration(decl)) {
    required =
      !decl.hasQuestionToken() &&
      !decl.hasInitializer() &&
      !decl.isRestParameter();
  }

  const jsDoc = propertyJsDocMeta(decl, options);
  const model: PropModel = {
    name,
    rawType,
    declaredType,
    required,
  };
  if (jsDoc.description) model.description = jsDoc.description;
  if (jsDoc.default) model.default = jsDoc.default;
  if (jsDoc.deprecated) model.deprecated = jsDoc.deprecated;

  if (shouldExpandChildType(parameterType, declaredType)) {
    model.children = processTypeChildren(
      parameterType,
      typeDisplayName(parameterType, declaredType),
      decl ?? location,
      depth,
      options,
    );
  }

  return model;
}

// ── Export shape extraction ────────────────────────────────────────────────

export function processTypeOrInterface(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
  typeName: string,
  options?: JsDocRenderOptions,
): PropModel[] | undefined {
  return processTypeProperties(
    declaration.getType(),
    typeName,
    declaration,
    0,
    options,
  );
}

function processCallableDeclaration(
  declaration: TsNode,
  options?: JsDocRenderOptions,
): PropModel[] | undefined {
  const signature = declaration.getType().getCallSignatures()[0];
  if (!signature) return undefined;
  const parameters = signature
    .getParameters()
    .map((parameter) =>
      parameterFromSignatureParameter(parameter, declaration, 0, options),
    )
    .filter((param): param is PropModel => Boolean(param));
  if (parameters.length === 0) return undefined;
  return parameters;
}

function getComponentPropsType(declaration: TsNode): Type | undefined {
  const type = declaration.getType();
  const parameter = type.getCallSignatures()[0]?.getParameters()[0];
  const parameterDeclaration = parameter?.getDeclarations()[0];
  if (parameterDeclaration) {
    return parameter.getTypeAtLocation(parameterDeclaration);
  }
  return undefined;
}

export function processComponentDeclaration(
  declaration: TsNode,
  typeName: string,
  options?: JsDocRenderOptions,
): PropModel[] | undefined {
  const propsType = getComponentPropsType(declaration);
  if (!propsType) return undefined;
  return processTypeProperties(
    propsType,
    `${typeName} props`,
    declaration,
    0,
    options,
  );
}

function classExtractedShape(
  declaration: TsNode,
  typeName: string,
): PropModel[] | undefined {
  if (!Node.isClassDeclaration(declaration)) return undefined;
  const parameters: PropModel[] = [];
  // Class members carry no per-member required-ness or JSDoc here. Match
  // legacy api-surface output exactly: empty description, required omitted.
  for (const ctor of declaration.getConstructors()) {
    if (!isPublicClassMember(ctor)) continue;
    const t = `(${ctor.getParameters().map(parameterSignature).join(", ")}) => ${typeName}`;
    parameters.push({
      name: "constructor",
      rawType: t,
      declaredType: t,
      description: "",
    });
  }
  for (const property of declaration.getProperties()) {
    if (!isPublicClassMember(property)) continue;
    const t = declarationTypeText(property);
    parameters.push({
      name: `${classMemberPrefix(property)}${property.getName()}`,
      rawType: t,
      declaredType: t,
      description: "",
    });
  }
  for (const method of declaration.getMethods()) {
    if (!isPublicClassMember(method)) continue;
    const t = `(${method.getParameters().map(parameterSignature).join(", ")}) => ${returnTypeText(method)}`;
    parameters.push({
      name: `${classMemberPrefix(method)}${method.getName()}`,
      rawType: t,
      declaredType: t,
      description: "",
    });
  }
  if (parameters.length === 0) return undefined;
  return parameters;
}

export function extractExportShape(
  item: ExportInfo,
): ExtractedShape | undefined {
  if (!item.sourcePath) return undefined;
  const filePath = path.join(REPO_ROOT, item.sourcePath);
  if (!fs.existsSync(filePath)) return undefined;
  const project = getProject();
  const sourceFile =
    project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
  const declaration = chooseDeclaration(
    sourceFile.getExportedDeclarations().get(item.name) ?? [],
  );
  return shapeForDeclaration(
    declaration,
    item.name,
    item.kind,
    item.jsDocLinkResolver
      ? { linkResolver: item.jsDocLinkResolver }
      : undefined,
  );
}

function shapeForDeclaration(
  declaration: TsNode | undefined,
  name: string,
  exportKind: ExportInfo["kind"],
  options?: JsDocRenderOptions,
): ExtractedShape | undefined {
  if (!declaration) return undefined;
  if (Node.isInterfaceDeclaration(declaration)) {
    const params = processTypeOrInterface(declaration, name, options);
    return params ? { kind: "interface", name, parameters: params } : undefined;
  }
  if (Node.isTypeAliasDeclaration(declaration)) {
    const params = processTypeOrInterface(declaration, name, options);
    return params ? { kind: "type", name, parameters: params } : undefined;
  }
  if (exportKind === "component") {
    const params = processComponentDeclaration(declaration, name, options);
    return params ? { kind: "component", name, parameters: params } : undefined;
  }
  if (exportKind === "function") {
    const params = processCallableDeclaration(declaration, options);
    return params ? { kind: "function", name, parameters: params } : undefined;
  }
  // Match legacy: only attempt class extraction here, no callable fallback for
  // "value" kind exports (those render their signature in MDX, not a table).
  const params = classExtractedShape(declaration, name);
  return params ? { kind: "class", name, parameters: params } : undefined;
}

/** Walk every exported type in a source file and produce shapes for any
 *  type alias or interface (skips classes/values/components). Used to absorb
 *  the supporting types referenced by a primary export. */
export function extractSupportingTypeShapes(
  filePath: string,
  options?: JsDocRenderOptions,
): Map<string, ExtractedShape> {
  const project = getProject();
  const sourceFile =
    project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
  const result = new Map<string, ExtractedShape>();
  sourceFile.getExportedDeclarations().forEach((declarations, name) => {
    for (const rawDeclaration of declarations) {
      const declaration = resolveAliasedDeclaration(rawDeclaration);
      if (
        Node.isInterfaceDeclaration(declaration) ||
        Node.isTypeAliasDeclaration(declaration)
      ) {
        const params = processTypeOrInterface(declaration, name, options);
        if (params) {
          result.set(name, {
            kind: Node.isInterfaceDeclaration(declaration)
              ? "interface"
              : "type",
            name,
            parameters: params,
          });
        }
      }
    }
  });
  return result;
}

export function isPrimitiveOnlyType(filePath: string, name: string): boolean {
  const project = getProject();
  const sourceFile =
    project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
  const declaration = chooseDeclaration(
    sourceFile.getExportedDeclarations().get(name) ?? [],
  );
  return (
    !!declaration &&
    Node.isTypeAliasDeclaration(declaration) &&
    nonNullableUnionTypes(declaration.getType()).every(isPrimitiveType)
  );
}
