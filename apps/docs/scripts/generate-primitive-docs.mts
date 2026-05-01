import {
  Project,
  Node,
  SyntaxKind,
  type SourceFile,
  type ModuleDeclaration,
  type TypeAliasDeclaration,
  type InterfaceDeclaration,
  type PropertySignature,
  type Symbol as TsMorphSymbol,
  type ExportedDeclarations,
} from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Config ──────────────────────────────────────────────────────────────────

const REACT_PKG = path.resolve("../../packages/react/src");
const CORE_PKG = path.resolve("../../packages/core/src");
const PRIMITIVES_DIR = path.join(REACT_PKG, "primitives");
const REACT_INDEX = path.join(REACT_PKG, "index.ts");
const OUTPUT_FILE = path.resolve("./generated/primitiveDocs.ts");

// ── Helpers ─────────────────────────────────────────────────────────────────

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  skipAddingFilesFromTsConfig: true,
});

// Add all primitive source files
project.addSourceFilesAtPaths([
  path.join(PRIMITIVES_DIR, "**/*.{ts,tsx}"),
  path.join(CORE_PKG, "react/primitives/**/*.{ts,tsx}"),
  path.join(REACT_PKG, "utils/createActionButton.tsx"),
]);

type PropDef = {
  name: string;
  type?: string;
  description?: string;
  default?: string;
  required?: boolean;
  deprecated?: string;
  children?: Array<{ type?: string; parameters: PropDef[] }>;
};

type PartDef = {
  element?: string;
  description?: string;
  deprecated?: string;
  props: PropDef[];
};

type PrimitiveDef = Record<string, PartDef>;

// ── Step 1: Discover primitives from barrel export ──────────────────────────

function discoverPrimitives(): Map<string, string> {
  const indexPath = REACT_INDEX;
  const sourceFile = project.addSourceFileAtPath(indexPath);
  const result = new Map<string, string>();

  for (const decl of sourceFile.getExportDeclarations()) {
    const moduleSpec = decl.getModuleSpecifierValue();
    if (!moduleSpec) continue;

    for (const named of decl.getNamedExports()) {
      const alias = named.getAliasNode()?.getText() ?? named.getName();
      // Only namespace re-exports like `export * as ComposerPrimitive from "./composer"`
      if (alias.endsWith("Primitive")) {
        result.set(alias, moduleSpec);
      }
    }
  }

  // Also handle `export * as X from "..."` syntax
  for (const star of sourceFile.getExportDeclarations()) {
    const namespaceExport = star.getNamespaceExport();
    if (namespaceExport) {
      const name = namespaceExport.getName();
      const moduleSpec = star.getModuleSpecifierValue();
      if (name.endsWith("Primitive") && moduleSpec) {
        result.set(name, moduleSpec);
      }
    }
  }

  return result;
}

// ── Step 2: Discover sub-components from per-primitive index ────────────────

type SubComponent = {
  exportedName: string; // e.g. "Root", "Input"
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
    if (!/^[A-Z]/.test(exportedName) && !/^unstable_[A-Z]/.test(exportedName))
      continue;

    const declaration = declarations.find((decl) => {
      const kind = decl.getKind();
      return (
        kind === SyntaxKind.VariableDeclaration ||
        kind === SyntaxKind.FunctionDeclaration ||
        kind === SyntaxKind.ClassDeclaration
      );
    });
    if (!declaration) continue;

    components.push({
      exportedName,
      declaration,
    });
  }

  return components;
}

// ── Step 3: Extract props from a namespace ──────────────────────────────────

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

    // Extract element type from resolved DOM element aliases like:
    // HTMLTextAreaElement → "textarea"
    // HTMLButtonElement → "button"
    // ActionButtonElement → "button"
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

function getComponentJsDoc(
  sourceFile: SourceFile,
  localName: string,
): { description?: string; deprecated?: string } {
  // Find the main exported const (the component itself) and get its JSDoc
  for (const varDecl of sourceFile.getVariableDeclarations()) {
    if (varDecl.getName() === localName) {
      const statement = varDecl.getVariableStatement();
      if (statement) {
        const jsDocs = statement.getJsDocs();
        if (jsDocs.length > 0) {
          const doc = jsDocs[0]!;
          let description: string | undefined;
          let deprecated: string | undefined;

          const comment = doc.getComment();
          if (typeof comment === "string") {
            // Get just the first sentence/paragraph, skip @tags
            const lines = comment.split("\n");
            const descLines: string[] = [];
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("@")) break;
              if (trimmed) descLines.push(trimmed);
              else if (descLines.length > 0) break; // stop at first blank line
            }
            description = descLines.join(" ") || undefined;
          }

          // Extract @deprecated tag
          for (const tag of doc.getTags()) {
            if (tag.getTagName() === "deprecated") {
              deprecated = tag.getComment()?.toString().trim() || "true";
            }
          }

          return { description, deprecated };
        }
      }
    }
  }
  return {};
}

function isInheritedProp(prop: TsMorphSymbol): boolean {
  const declarations = prop.getDeclarations();
  if (declarations.length === 0) return false;

  for (const decl of declarations) {
    const sourceFile = decl.getSourceFile();
    const filePath = sourceFile.getFilePath();

    // Props from React types, DOM types, or Radix primitives
    if (
      filePath.includes("node_modules/@types/react") ||
      filePath.includes("node_modules/react-textarea-autosize") ||
      filePath.includes("node_modules/@radix-ui") ||
      filePath.includes("node_modules/radix-ui") ||
      filePath.includes("csstype")
    ) {
      return true;
    }
  }
  return false;
}

function extractJsDocMeta(decl: Node): {
  description?: string;
  default?: string;
  deprecated?: string;
} {
  if (!Node.isPropertySignature(decl) && !Node.isPropertyDeclaration(decl)) {
    return {};
  }

  const jsDocs = decl.getJsDocs?.();
  if (!jsDocs || jsDocs.length === 0) return {};

  const doc = jsDocs[0]!;
  const meta: {
    description?: string;
    default?: string;
    deprecated?: string;
  } = {};

  const comment = doc.getComment();
  if (typeof comment === "string") {
    meta.description = comment.trim();
  }

  for (const tag of doc.getTags()) {
    const tagName = tag.getTagName();
    if (tagName === "default") {
      meta.default = tag.getComment()?.toString().trim();
    }
    if (tagName === "deprecated") {
      meta.deprecated = tag.getComment()?.toString().trim() || "true";
    }
  }

  return meta;
}

function extractPropsFromType(
  typeAlias: TypeAliasDeclaration | InterfaceDeclaration,
  sourceFile: SourceFile,
): PropDef[] {
  const type = typeAlias.getType();
  const props: PropDef[] = [];

  // Handle Record<string, never> (empty props)
  const typeText = typeAlias.getType().getText();
  if (typeText === "Record<string, never>") return [];

  // Detect RequireAtLeastOne by following only the type aliases/interfaces that
  // this props declaration actually references. Scanning the whole source file
  // is too broad and can misclassify unrelated props in the same file.
  const referencesRequireAtLeastOne = (
    decl: TypeAliasDeclaration | InterfaceDeclaration,
    visited = new Set<string>(),
  ): boolean => {
    const key = decl.getName();
    if (visited.has(key)) return false;
    visited.add(key);

    const text = decl.getText();
    if (text.includes("RequireAtLeastOne")) return true;

    const typeNodeText = decl.getTypeNode?.()?.getText() ?? text;
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
        referencesRequireAtLeastOne(referencedType, visited)
      ) {
        return true;
      }
      const referencedInterface = sourceFile.getInterface(name);
      if (
        referencedInterface &&
        referencesRequireAtLeastOne(referencedInterface, visited)
      ) {
        return true;
      }
    }

    return false;
  };
  const isRequireAtLeastOne = referencesRequireAtLeastOne(typeAlias);

  const properties = type.getProperties();

  for (const prop of properties) {
    // Skip inherited HTML/React/Radix props
    if (isInheritedProp(prop)) continue;

    const name = prop.getName();

    // Skip internal/private props
    if (name.startsWith("__")) continue;

    const declarations = prop.getDeclarations();
    if (declarations.length === 0) continue;
    const decl = declarations[0]!;

    // Get prop type
    let propType: string;
    try {
      propType = prop.getTypeAtLocation(decl).getText();
      propType = cleanTypeText(propType);
    } catch {
      propType = "unknown";
    }

    const jsDoc = extractJsDocMeta(decl);

    // Determine if required
    const isOptional = isRequireAtLeastOne
      ? true // RequireAtLeastOne means at least one is needed, not all
      : Node.isPropertySignature(decl)
        ? (decl as PropertySignature).hasQuestionToken()
        : true;

    const propDef: PropDef = { name };

    if (propType && propType !== "unknown") {
      propDef.type = propType;
    }
    if (!isOptional) {
      propDef.required = true;
    }
    if (jsDoc.description) {
      propDef.description = jsDoc.description;
    }
    if (jsDoc.default) {
      propDef.default = jsDoc.default;
    }
    if (jsDoc.deprecated) {
      propDef.deprecated = jsDoc.deprecated;
    }

    // Handle nested component props
    if (name === "components" && propType.includes("{")) {
      const children = extractComponentsChildren(prop, decl);
      if (children) {
        propDef.children = children;
      }
    } else if (isObjectPropWithDocumentableProperties(prop, decl)) {
      const children = extractObjectChildren(prop, decl, propType);
      if (children) {
        propDef.children = children;
      }
    }

    props.push(propDef);
  }

  return props;
}

function isObjectPropWithDocumentableProperties(
  prop: TsMorphSymbol,
  decl: Node,
): boolean {
  if (!Node.isPropertySignature(decl)) return false;
  const typeNode = decl.getTypeNode();
  if (!typeNode || !Node.isTypeLiteral(typeNode)) return false;

  const type = prop.getTypeAtLocation(decl);
  if (type.getCallSignatures().length > 0) return false;

  const properties = type.getProperties();
  if (properties.length === 0) return false;

  return properties.every((childProp) =>
    childProp
      .getDeclarations()
      .some((childDecl) => Node.isPropertySignature(childDecl)),
  );
}

function extractObjectChildren(
  prop: TsMorphSymbol,
  decl: Node,
  typeName: string,
): Array<{ type?: string; parameters: PropDef[] }> | undefined {
  const type = prop.getTypeAtLocation(decl);
  const properties = type.getProperties();
  if (properties.length === 0) return undefined;

  const childProps: PropDef[] = [];
  for (const childProp of properties) {
    const childDecl = childProp.getDeclarations()[0];
    if (!childDecl) continue;
    if (isInheritedProp(childProp)) continue;

    const childName = childProp.getName();
    if (childName.startsWith("__")) continue;

    let childType: string;
    try {
      childType = cleanTypeText(
        childProp.getTypeAtLocation(childDecl).getText(),
      );
    } catch {
      childType = "unknown";
    }

    const childJsDoc = extractJsDocMeta(childDecl);

    const childDef: PropDef = { name: childName };
    if (childType) childDef.type = childType;
    if (childJsDoc.description) childDef.description = childJsDoc.description;
    if (childJsDoc.default) childDef.default = childJsDoc.default;
    if (childJsDoc.deprecated) childDef.deprecated = childJsDoc.deprecated;
    if (
      Node.isPropertySignature(childDecl) &&
      !(childDecl as PropertySignature).hasQuestionToken()
    ) {
      childDef.required = true;
    }

    childProps.push(childDef);
  }

  if (childProps.length === 0) return undefined;
  return [{ type: typeName, parameters: childProps }];
}

function extractComponentsChildren(
  prop: TsMorphSymbol,
  decl: Node,
): Array<{ type?: string; parameters: PropDef[] }> | undefined {
  const type = prop.getTypeAtLocation(decl);
  const properties = type.getProperties();
  if (properties.length === 0) return undefined;

  const childProps: PropDef[] = [];
  for (const childProp of properties) {
    const childDecl = childProp.getDeclarations()[0];
    if (!childDecl) continue;

    const childName = childProp.getName();
    let childType: string;
    try {
      childType = cleanTypeText(
        childProp.getTypeAtLocation(childDecl).getText(),
      );
    } catch {
      childType = "unknown";
    }

    let childDesc: string | undefined;
    if (Node.isPropertySignature(childDecl)) {
      const jsDocs = (childDecl as PropertySignature).getJsDocs?.();
      if (jsDocs && jsDocs.length > 0) {
        const comment = jsDocs[0]!.getComment();
        if (typeof comment === "string") {
          childDesc = comment.trim();
        }
      }
    }

    const childDef: PropDef = { name: childName };
    if (childType) childDef.type = childType;
    if (childDesc) childDef.description = childDesc;

    childProps.push(childDef);
  }

  if (childProps.length === 0) return undefined;
  return [{ parameters: childProps }];
}

function extractActionButtonProps(
  sourceFile: SourceFile,
  localName: string,
): PropDef[] {
  // For ActionButtonProps<typeof useHook>, we need to find the hook's
  // parameter type and extract its properties.

  // Find the hook function — it's typically in the same file
  // The namespace's Props = ActionButtonProps<typeof useXxx>
  const ns = findNamespace(sourceFile, localName);
  if (!ns) return [];

  const propsAlias = ns.getTypeAliases().find((t) => t.getName() === "Props");
  if (!propsAlias) return [];

  const typeText = propsAlias.getText();

  // Extract hook name from ActionButtonProps<typeof useXxx>
  const hookMatch = typeText.match(/typeof\s+(\w+)/);
  if (!hookMatch) return [];

  const hookName = hookMatch[1]!;

  // Find the hook function in the file
  for (const varDecl of sourceFile.getVariableDeclarations()) {
    if (varDecl.getName() !== hookName) continue;

    const initializer = varDecl.getInitializer();
    if (!initializer) continue;

    // The hook is typically:
    // const useXxx = ({ propA, propB }: { propA?: Type; propB?: Type } = {}) => { ... }
    // We need to find the parameter type
    if (
      Node.isArrowFunction(initializer) ||
      Node.isFunctionExpression(initializer)
    ) {
      const params = initializer.getParameters();
      if (params.length === 0) return []; // No custom props

      const firstParam = params[0]!;
      const paramType = firstParam.getType();
      const properties = paramType.getProperties();
      const props: PropDef[] = [];

      for (const prop of properties) {
        const declarations = prop.getDeclarations();
        if (declarations.length === 0) continue;
        const decl = declarations[0]!;

        const name = prop.getName();
        let type: string;
        try {
          type = cleanTypeText(prop.getTypeAtLocation(decl).getText());
          // Remove " | undefined" suffix for optional params
          type = type.replace(/\s*\|\s*undefined$/, "");
        } catch {
          type = "unknown";
        }

        let description: string | undefined;
        let defaultValue: string | undefined;

        if (Node.isPropertySignature(decl) || Node.isBindingElement(decl)) {
          // Try to get JSDoc from the type literal
          if (Node.isPropertySignature(decl)) {
            const jsDocs = (decl as PropertySignature).getJsDocs?.();
            if (jsDocs && jsDocs.length > 0) {
              const comment = jsDocs[0]!.getComment();
              if (typeof comment === "string") {
                description = comment.trim();
              }
              for (const tag of jsDocs[0]!.getTags()) {
                if (tag.getTagName() === "default") {
                  defaultValue = tag.getComment()?.toString().trim();
                }
              }
            }
          }

          // Check for default value in destructuring pattern
          if (Node.isBindingElement(decl)) {
            const init = decl.getInitializer();
            if (init) {
              defaultValue = init.getText();
            }
          }
        }

        const isOptional = Node.isPropertySignature(decl)
          ? (decl as PropertySignature).hasQuestionToken()
          : true;

        const propDef: PropDef = { name };
        if (type) propDef.type = type;
        if (!isOptional) propDef.required = true;
        if (description) propDef.description = description;
        if (defaultValue) propDef.default = defaultValue;

        props.push(propDef);
      }

      return props;
    }
  }

  return [];
}

function cleanTypeText(typeText: string): string {
  // Remove import(...) paths
  let cleaned = typeText.replace(/import\(".*?"\)\./g, "");
  // Simplify long union types
  if (cleaned.length > 120) {
    // Truncate very long inline object types at a token boundary
    cleaned = cleaned.replace(/\{[^{}]{100,}\}/g, (match) => {
      // Find a clean break point (after a semicolon or comma) near char 80
      let cutoff = 80;
      const semicolonIdx = match.lastIndexOf(";", cutoff);
      const commaIdx = match.lastIndexOf(",", cutoff);
      const breakIdx = Math.max(semicolonIdx, commaIdx);
      if (breakIdx > 20) cutoff = breakIdx + 1;
      return `${match.substring(0, cutoff)} ... }`;
    });
  }
  return cleaned;
}

// ── Step 5: Process a single component ──────────────────────────────────────

function extractPropsFromComponentDeclaration(
  sourceFile: SourceFile,
  localName: string,
): PropDef[] | undefined {
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
    if (typeAlias) return extractPropsFromType(typeAlias, sourceFile);

    const iface = sourceFile.getInterface(propsTypeName);
    if (iface) return extractPropsFromType(iface, sourceFile);
  }

  return undefined;
}

function typeSupportsAsChild(
  typeAlias: TypeAliasDeclaration | InterfaceDeclaration,
): boolean {
  return typeAlias
    .getType()
    .getProperties()
    .some((prop) => prop.getName() === "asChild");
}

function processComponent(sub: SubComponent): PartDef | undefined {
  const sourceFile = sub.declaration.getSourceFile();
  const localName =
    sub.declaration.getSymbol()?.getName() ??
    ("getName" in sub.declaration
      ? (sub.declaration as any).getName?.()
      : undefined);
  if (!localName) return undefined;

  const ns = findNamespace(sourceFile, localName);
  const propsAlias = ns?.getTypeAliases().find((t) => t.getName() === "Props");
  const element = ns ? extractElementType(ns) : undefined;
  const { description, deprecated } = getComponentJsDoc(sourceFile, localName);

  let props: PropDef[] | undefined;
  let isActionButton = false;
  let supportsAsChild = false;

  if (propsAlias) {
    const propsText = propsAlias.getText();
    isActionButton = propsText.includes("ActionButtonProps");
    supportsAsChild = typeSupportsAsChild(propsAlias);
    props = isActionButton
      ? extractActionButtonProps(sourceFile, localName)
      : extractPropsFromType(propsAlias, sourceFile);
  } else {
    props = extractPropsFromComponentDeclaration(sourceFile, localName);
  }

  if (!props) return undefined;

  // Add asChild when the actual props type includes it. We intentionally
  // inspect the component's type information instead of sniffing source-file
  // imports so provider components like Popover.Root don't get misclassified.
  const hasAsChild =
    !isActionButton &&
    props.every((p) => p.name !== "asChild") &&
    supportsAsChild;
  if (hasAsChild) {
    props.unshift({ name: "asChild" });
  }

  // For action buttons, always add asChild
  if (isActionButton && props.every((p) => p.name !== "asChild")) {
    props.unshift({ name: "asChild" });
  }

  const result: PartDef = { props };
  if (element) result.element = element;
  if (description) result.description = description;
  if (deprecated) result.deprecated = deprecated;
  return result;
}

// ── Step 6: Process all primitives ──────────────────────────────────────────

function processAllPrimitives(): Record<string, PrimitiveDef> {
  const primitives = discoverPrimitives();
  const result: Record<string, PrimitiveDef> = {};

  for (const [primitiveName, moduleSpec] of primitives) {
    const primitiveModulePath = path.join(
      REACT_PKG,
      moduleSpec.replace("./", ""),
    );
    const subComponents = discoverSubComponents(primitiveModulePath);

    if (subComponents.length === 0) continue;

    const parts: PrimitiveDef = {};
    const seen = new Set<string>();

    for (const sub of subComponents) {
      const localName =
        sub.declaration.getSymbol()?.getName() ??
        ("getName" in sub.declaration
          ? (sub.declaration as any).getName?.()
          : undefined);
      if (localName && seen.has(localName)) continue;
      if (localName) seen.add(localName);

      try {
        const part = processComponent(sub);
        if (part) {
          parts[sub.exportedName] = part;
        }
      } catch (e) {
        console.warn(
          `  Warning: Failed to process ${primitiveName}.${sub.exportedName}:`,
          (e as Error).message,
        );
      }
    }

    if (Object.keys(parts).length > 0) {
      result[primitiveName] = parts;
    }
  }

  return result;
}

// ── Step 7: Generate output ─────────────────────────────────────────────────

function generateOutput(primitives: Record<string, PrimitiveDef>): string {
  const lines: string[] = [
    "// AUTO-GENERATED by scripts/generate-primitive-docs.mts",
    "// Do not edit manually.",
    "",
  ];

  for (const [name, parts] of Object.entries(primitives)) {
    lines.push(`export const ${name} = ${JSON.stringify(parts, null, 2)};\n`);
  }

  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log("Generating primitive docs...");
const primitives = processAllPrimitives();

const output = generateOutput(primitives);
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, output);

const totalParts = Object.values(primitives).reduce(
  (sum, parts) => sum + Object.keys(parts).length,
  0,
);
console.log(
  `Generated docs for ${Object.keys(primitives).length} primitives with ${totalParts} parts → ${OUTPUT_FILE}`,
);
