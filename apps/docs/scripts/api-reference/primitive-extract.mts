import {
  Node,
  type ExportedDeclarations,
  type InterfaceDeclaration,
  type ModuleDeclaration,
  type SourceFile,
  type TypeAliasDeclaration,
} from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";
import { REACT_INDEX, REACT_PKG, REPO_ROOT } from "./paths.mts";
import {
  getProject,
  getJsDocCommentText,
  jsDocTag,
  processComponentDeclaration,
  processTypeOrInterface,
  type PropModel,
} from "./extract.mts";

export type PrimitivePartModel = {
  primitiveName: string; // "ComposerPrimitive"
  partName: string; // "Input"
  propsTypeName: string; // "ComposerPrimitiveInputProps"
  /** The local name of the underlying React component declaration. Two
   *  exports that re-export the same component (e.g. `Parts` aliased as
   *  `Content`) share a localName, so the primitive-docs projection can
   *  dedupe to one entry while api-ref still emits a typeDocs entry per
   *  exported part name. */
  localName: string;
  element?: string;
  description?: string;
  deprecated?: string;
  supportsAsChild: boolean;
  isActionButton: boolean;
  isRequireAtLeastOne: boolean;
  props: PropModel[];
  sourcePath: string;
};

const primitiveSourceFiles = new Map<string, SourceFile>();
const primitiveParts = new Map<string, string[]>();
let primitiveBarrelExports: Map<string, string> | undefined;

export function primitivePartTypeDocName(
  primitiveName: string,
  part: string,
): string {
  return `${primitiveName}${part}Props`;
}

export function primitiveModuleSourceFile(
  primitiveName: string,
): SourceFile | undefined {
  const cached = primitiveSourceFiles.get(primitiveName);
  if (cached) return cached;
  const project = getProject();
  const index =
    project.getSourceFile(REACT_INDEX) ??
    project.addSourceFileAtPath(REACT_INDEX);
  const exportDecl = index
    .getExportDeclarations()
    .find((decl) => decl.getNamespaceExport()?.getName() === primitiveName);
  const moduleSpec = exportDecl?.getModuleSpecifierValue();
  if (!moduleSpec) return undefined;
  const modulePath = path.join(REACT_PKG, moduleSpec.replace(/^\.\//, ""));
  const sourcePath = [
    `${modulePath}.ts`,
    `${modulePath}.tsx`,
    path.join(modulePath, "index.ts"),
    path.join(modulePath, "index.tsx"),
  ].find((file) => fs.existsSync(file));
  if (!sourcePath) return undefined;
  const sourceFile =
    project.getSourceFile(sourcePath) ??
    project.addSourceFileAtPath(sourcePath);
  primitiveSourceFiles.set(primitiveName, sourceFile);
  return sourceFile;
}

export function readPrimitiveParts(primitiveName: string): string[] {
  const cached = primitiveParts.get(primitiveName);
  if (cached) return cached;
  const sourceFile = primitiveModuleSourceFile(primitiveName);
  if (!sourceFile) {
    primitiveParts.set(primitiveName, []);
    return [];
  }
  const isPrimitivePart = (name: string) =>
    (/^[A-Z]/.test(name) || /^Unstable_[A-Z]/.test(name)) &&
    !name.includes("Primitive");
  const orderedParts = sourceFile
    .getExportDeclarations()
    .flatMap((decl) =>
      decl.getNamedExports().map((specifier) => {
        return specifier.getAliasNode()?.getText() ?? specifier.getName();
      }),
    )
    .filter(isPrimitivePart);
  const orderedPartNames = new Set(orderedParts);
  const fallbackParts = [...sourceFile.getExportedDeclarations().keys()]
    .filter(isPrimitivePart)
    .filter((name) => !orderedPartNames.has(name))
    .sort((a, b) => a.localeCompare(b));
  const parts = [
    ...orderedParts.filter((part) => part === "Root"),
    ...orderedParts.filter((part) => part !== "Root"),
    ...fallbackParts,
  ];
  primitiveParts.set(primitiveName, parts);
  return parts;
}

function findNamespace(
  sourceFile: SourceFile,
  localName: string,
): ModuleDeclaration | undefined {
  for (const ns of sourceFile.getModules()) {
    if (ns.getName() === localName) return ns;
  }
  return undefined;
}

function extractElementType(ns: ModuleDeclaration): string | undefined {
  for (const typeAlias of ns.getTypeAliases()) {
    if (typeAlias.getName() !== "Element") continue;
    const typeText = typeAlias.getType().getText();
    if (typeText.includes("HTMLTextAreaElement")) return "textarea";
    if (typeText.includes("HTMLButtonElement")) return "button";
    if (typeText.includes("HTMLInputElement")) return "input";
    if (typeText.includes("HTMLDivElement")) return "div";
    if (typeText.includes("HTMLSpanElement")) return "span";
    if (typeText.includes("HTMLFormElement")) return "form";
    if (typeText.includes("ActionButtonElement")) return "button";
  }
  return undefined;
}

function getPrimitiveComponentMeta(
  sourceFile: SourceFile,
  localName: string,
): { description?: string; deprecated?: string } {
  for (const varDecl of sourceFile.getVariableDeclarations()) {
    if (varDecl.getName() !== localName) continue;
    const statement = varDecl.getVariableStatement();
    if (!statement) continue;
    const jsDocs = statement.getJsDocs();
    if (jsDocs.length === 0) continue;
    const doc = jsDocs[0]!;
    const description = getJsDocCommentText(doc, `${localName} primitive`);
    const deprecated = jsDocTag(doc, "deprecated", `${localName} primitive`);
    return { description, deprecated };
  }
  return {};
}

function typeSupportsAsChild(
  typeAlias: TypeAliasDeclaration | InterfaceDeclaration,
): boolean {
  return typeAlias
    .getType()
    .getProperties()
    .some((prop) => prop.getName() === "asChild");
}

function referencesRequireAtLeastOne(
  decl: TypeAliasDeclaration | InterfaceDeclaration,
  sourceFile: SourceFile,
  visited = new Set<string>(),
): boolean {
  const key = decl.getName();
  if (visited.has(key)) return false;
  visited.add(key);
  const text = decl.getText();
  if (text.includes("RequireAtLeastOne")) return true;
  const typeNodeText =
    "getTypeNode" in decl ? (decl.getTypeNode?.()?.getText() ?? text) : text;
  const referencedNames = new Set(
    Array.from(typeNodeText.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)).map(
      (match) => match[0],
    ),
  );
  for (const name of referencedNames) {
    if (name === key || name === "PropsWithChildren") continue;
    const referencedType = sourceFile.getTypeAlias(name);
    if (
      referencedType &&
      referencesRequireAtLeastOne(referencedType, sourceFile, visited)
    ) {
      return true;
    }
    const referencedInterface = sourceFile.getInterface(name);
    if (
      referencedInterface &&
      referencesRequireAtLeastOne(referencedInterface, sourceFile, visited)
    ) {
      return true;
    }
  }
  return false;
}

function extractPropsFromComponentDeclaration(
  sourceFile: SourceFile,
  localName: string,
  ownerTypeName: string,
): PropModel[] | undefined {
  const propsTypeNames = new Set<string>();
  const variableDecl = sourceFile
    .getVariableDeclarations()
    .find((decl) => decl.getName() === localName);
  const typeNodeText = variableDecl?.getTypeNode()?.getText();
  if (typeNodeText) {
    for (const match of typeNodeText.matchAll(
      /<\s*([A-Za-z0-9_]+Props)\s*>/g,
    )) {
      propsTypeNames.add(match[1]!);
    }
  }
  if (propsTypeNames.size === 0) {
    const suffix = localName.replace(/^[A-Za-z]+Primitive/, "");
    propsTypeNames.add(`${suffix}Props`);
  }
  for (const propsTypeName of propsTypeNames) {
    const typeAlias = sourceFile.getTypeAlias(propsTypeName);
    if (typeAlias) return processTypeOrInterface(typeAlias, ownerTypeName);
    const iface = sourceFile.getInterface(propsTypeName);
    if (iface) return processTypeOrInterface(iface, ownerTypeName);
  }
  return undefined;
}

function discoverPrimitiveBarrelExports(): Map<string, string> {
  if (primitiveBarrelExports) return primitiveBarrelExports;
  const project = getProject();
  const result = new Map<string, string>();
  const indexFile =
    project.getSourceFile(REACT_INDEX) ??
    project.addSourceFileAtPath(REACT_INDEX);
  for (const decl of indexFile.getExportDeclarations()) {
    const namespaceExport = decl.getNamespaceExport();
    if (!namespaceExport) continue;
    const name = namespaceExport.getName();
    const moduleSpec = decl.getModuleSpecifierValue();
    if (name.endsWith("Primitive") && moduleSpec) {
      result.set(name, moduleSpec);
    }
  }
  primitiveBarrelExports = result;
  return result;
}

type SubComponent = {
  exportedName: string;
  declaration: ExportedDeclarations;
};

function discoverSubComponents(primitiveModulePath: string): SubComponent[] {
  const candidatePaths = [
    `${primitiveModulePath}.ts`,
    `${primitiveModulePath}.tsx`,
    path.join(primitiveModulePath, "index.ts"),
    path.join(primitiveModulePath, "index.tsx"),
  ];
  const indexPath = candidatePaths.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!indexPath) return [];
  const project = getProject();
  let sourceFile: SourceFile;
  try {
    sourceFile =
      project.getSourceFile(indexPath) ??
      project.addSourceFileAtPath(indexPath);
  } catch {
    return [];
  }
  const components: SubComponent[] = [];
  for (const [
    exportedName,
    declarations,
  ] of sourceFile.getExportedDeclarations()) {
    // Accept capital and lowercase `unstable_` prefixes — the lowercase form
    // matches legacy primitive-docs (e.g. AttachmentPrimitive.unstable_Thumb).
    // The api-ref typeDocs projection filters lowercase `unstable_` parts
    // back out to match legacy api-surface behaviour.
    const isPart =
      (/^[A-Z]/.test(exportedName) ||
        /^Unstable_[A-Z]/.test(exportedName) ||
        /^unstable_[A-Z]/.test(exportedName)) &&
      !exportedName.includes("Primitive");
    if (!isPart) continue;
    const declaration = declarations.find((decl) => {
      if (Node.isVariableDeclaration(decl)) return true;
      if (Node.isFunctionDeclaration(decl)) return true;
      if (Node.isClassDeclaration(decl)) return true;
      return false;
    });
    if (!declaration) continue;
    components.push({ exportedName, declaration });
  }
  return components;
}

function localNameFor(declaration: ExportedDeclarations): string | undefined {
  const symbolName = declaration.getSymbol()?.getName();
  if (symbolName) return symbolName;
  if (
    Node.isVariableDeclaration(declaration) ||
    Node.isFunctionDeclaration(declaration) ||
    Node.isClassDeclaration(declaration) ||
    Node.isInterfaceDeclaration(declaration) ||
    Node.isTypeAliasDeclaration(declaration) ||
    Node.isModuleDeclaration(declaration)
  ) {
    return declaration.getName();
  }
  return undefined;
}

function extractPrimitivePart(
  primitiveName: string,
  sub: SubComponent,
): PrimitivePartModel | undefined {
  const sourceFile = sub.declaration.getSourceFile();
  const localName = localNameFor(sub.declaration);
  if (!localName) return undefined;
  const ns = findNamespace(sourceFile, localName);
  const propsAlias = ns?.getTypeAliases().find((t) => t.getName() === "Props");
  const element = ns ? extractElementType(ns) : undefined;
  const { description, deprecated } = getPrimitiveComponentMeta(
    sourceFile,
    localName,
  );

  let props: PropModel[] | undefined;
  let isActionButton = false;
  let supportsAsChild = false;
  let isRequireAtLeastOne = false;
  const propsTypeName = primitivePartTypeDocName(
    primitiveName,
    sub.exportedName,
  );

  if (propsAlias) {
    const propsText = propsAlias.getText();
    isActionButton = propsText.includes("ActionButtonProps");
    supportsAsChild = typeSupportsAsChild(propsAlias);
    isRequireAtLeastOne = referencesRequireAtLeastOne(propsAlias, sourceFile);
    // Process the Props alias uniformly — including ActionButton-style parts.
    // The intersection naturally surfaces both PrimitiveButtonProps members
    // (asChild, render, … tagged inheritedFrom: "radix") and the hook-specific
    // params (tagged inheritedFrom: undefined). Each projection then filters
    // according to its policy.
    props = processTypeOrInterface(propsAlias, propsTypeName) ?? [];
    // RequireAtLeastOne: every prop is technically optional individually,
    // but at least one must be supplied. Surface this by marking all props
    // optional in the model so projections render them consistently.
    if (isRequireAtLeastOne) {
      props = props.map((p) => ({ ...p, required: false }));
    }
  } else {
    props = extractPropsFromComponentDeclaration(
      sourceFile,
      localName,
      propsTypeName,
    );
    // Fallback: when neither a Props alias nor a *Props type by name is
    // available (e.g. wrappers built with `Object.assign(Base, ...)` lose
    // the namespace), fall back to inspecting the component's call signature
    // parameter directly. Mirrors legacy api-surface's `primitivePartTypeDoc`
    // behaviour so e.g. `Unstable_TriggerPopover` still gets typed props.
    if (!props) {
      props = processComponentDeclaration(sub.declaration, propsTypeName);
    }
    // Detect asChild from the resolved component props (no namespace alias
    // available, so check the projected props instead).
    if (props?.some((p) => p.name === "asChild")) {
      supportsAsChild = true;
    }
  }

  if (!props) return undefined;

  const sourcePath = path
    .relative(REPO_ROOT, sourceFile.getFilePath())
    .replaceAll("\\", "/");

  const model: PrimitivePartModel = {
    primitiveName,
    partName: sub.exportedName,
    propsTypeName,
    localName,
    supportsAsChild,
    isActionButton,
    isRequireAtLeastOne,
    props,
    sourcePath,
  };
  if (element) model.element = element;
  if (description) model.description = description;
  if (deprecated) model.deprecated = deprecated;
  return model;
}

const _partsCache = new Map<string, PrimitivePartModel[]>();

export function extractPrimitivePartsFor(
  primitiveName: string,
): PrimitivePartModel[] {
  const cached = _partsCache.get(primitiveName);
  if (cached) return cached;
  const primitives = discoverPrimitiveBarrelExports();
  const moduleSpec = primitives.get(primitiveName);
  if (!moduleSpec) {
    _partsCache.set(primitiveName, []);
    return [];
  }
  const primitiveModulePath = path.join(
    REACT_PKG,
    moduleSpec.replace(/^\.\//, ""),
  );
  const subs = discoverSubComponents(primitiveModulePath);
  const result: PrimitivePartModel[] = [];
  // Emit one model per exported part name, even when several exports share
  // the same local declaration. The primitive-docs projection dedupes by
  // localName so it still produces one entry per component, while api-ref
  // gets a typeDocs entry per exported name (matching legacy api-surface).
  for (const sub of subs) {
    try {
      const part = extractPrimitivePart(primitiveName, sub);
      if (part) result.push(part);
    } catch (e) {
      console.warn(
        `  Warning: Failed to extract ${primitiveName}.${sub.exportedName}:`,
        (e as Error).message,
      );
    }
  }
  _partsCache.set(primitiveName, result);
  return result;
}

/** Extract every primitive part across every primitive. Used by
 *  generate-primitive-docs.mts. */
export function extractPrimitiveParts(): PrimitivePartModel[] {
  const result: PrimitivePartModel[] = [];
  for (const primitiveName of discoverPrimitiveBarrelExports().keys()) {
    result.push(...extractPrimitivePartsFor(primitiveName));
  }
  return result;
}
