import {
  Project,
  Node,
  SyntaxKind,
  type SourceFile,
  type ModuleDeclaration,
  type TypeAliasDeclaration,
  type PropertySignature,
  type Symbol as TsMorphSymbol,
} from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Config ──────────────────────────────────────────────────────────────────

const REACT_PKG = path.resolve("../../packages/react/src");
const CORE_PKG = path.resolve("../../packages/core/src");
const PRIMITIVES_DIR = path.join(REACT_PKG, "primitives");
const OUTPUT_FILE = path.resolve("./generated/primitiveDocs.ts");

// Props inherited from HTML elements that we don't want to document
const INHERITED_ELEMENT_PROP_SOURCES = new Set([
  "HTMLAttributes",
  "ButtonHTMLAttributes",
  "FormHTMLAttributes",
  "TextareaHTMLAttributes",
  "InputHTMLAttributes",
  "AriaAttributes",
  "DOMAttributes",
  "RefAttributes",
  "TextareaAutosizeProps",
  "ComponentPropsWithoutRef",
  "ComponentPropsWithRef",
  "PrimitiveButtonProps",
  "PrimitiveDivProps",
  "PrimitiveFormProps",
  "PrimitiveSpanProps",
]);

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
  const indexPath = path.join(PRIMITIVES_DIR, "index.ts");
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
  localName: string; // e.g. "ComposerPrimitiveRoot", "ComposerPrimitiveInput"
  sourceModule: string; // e.g. "./ComposerRoot"
};

function discoverSubComponents(
  primitiveDir: string,
): SubComponent[] {
  const indexPath = path.join(primitiveDir, "index.ts");
  if (!fs.existsSync(indexPath)) return [];

  let sourceFile: SourceFile;
  try {
    sourceFile = project.getSourceFile(indexPath) ?? project.addSourceFileAtPath(indexPath);
  } catch {
    return [];
  }

  const components: SubComponent[] = [];

  for (const decl of sourceFile.getExportDeclarations()) {
    const moduleSpec = decl.getModuleSpecifierValue();
    if (!moduleSpec) continue;

    for (const named of decl.getNamedExports()) {
      const localName = named.getName();
      const alias = named.getAliasNode()?.getText() ?? localName;
      components.push({
        exportedName: alias,
        localName,
        sourceModule: moduleSpec,
      });
    }
  }

  return components;
}

// ── Step 3: Resolve source file for a sub-component ─────────────────────────

function resolveSourceFile(
  primitiveDir: string,
  sourceModule: string,
): SourceFile | undefined {
  // Try local resolution first
  const extensions = [".tsx", ".ts"];
  for (const ext of extensions) {
    const filePath = path.join(primitiveDir, sourceModule + ext);
    if (fs.existsSync(filePath)) {
      return project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    }
  }

  return undefined;
}

// ── Step 4: Extract props from a namespace ──────────────────────────────────

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

    // Extract element type from patterns like:
    // ComponentRef<typeof Primitive.form> → "form"
    // HTMLTextAreaElement → "textarea"
    // HTMLButtonElement → "button"
    // ActionButtonElement → "button"
    const primitiveMatch = typeText.match(/Primitive\.(\w+)/);
    if (primitiveMatch) return primitiveMatch[1]!;

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

function getComponentJsDoc(sourceFile: SourceFile, localName: string): { description?: string; deprecated?: string } {
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

function extractPropsFromType(
  typeAlias: TypeAliasDeclaration,
  sourceFile: SourceFile,
): PropDef[] {
  const type = typeAlias.getType();
  const props: PropDef[] = [];

  // Handle Record<string, never> (empty props)
  const typeText = typeAlias.getType().getText();
  if (typeText === "Record<string, never>") return [];

  // Handle PropsWithChildren (just children, no custom props)
  if (typeText.startsWith("PropsWithChildren")) return [];

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

    // Get JSDoc
    let description: string | undefined;
    let defaultValue: string | undefined;
    let deprecated: string | undefined;

    if (Node.isPropertySignature(decl) || Node.isPropertyDeclaration(decl)) {
      const jsDocs = (decl as PropertySignature).getJsDocs?.();
      if (jsDocs && jsDocs.length > 0) {
        const doc = jsDocs[0]!;
        const comment = doc.getComment();
        if (typeof comment === "string") {
          description = comment.trim();
        }

        for (const tag of doc.getTags()) {
          const tagName = tag.getTagName();
          if (tagName === "default") {
            defaultValue = tag.getComment()?.toString().trim();
          }
          if (tagName === "deprecated") {
            deprecated = tag.getComment()?.toString().trim() || "true";
          }
        }
      }
    }

    // Determine if required
    const isOptional = Node.isPropertySignature(decl)
      ? (decl as PropertySignature).hasQuestionToken()
      : true;

    const propDef: PropDef = { name };

    if (propType && propType !== "unknown") {
      propDef.type = propType;
    }
    if (!isOptional) {
      propDef.required = true;
    }
    if (description) {
      propDef.description = description;
    }
    if (defaultValue) {
      propDef.default = defaultValue;
    }
    if (deprecated) {
      propDef.deprecated = deprecated;
    }

    // Handle nested component props
    if (name === "components" && propType.includes("{")) {
      const children = extractComponentsChildren(prop, decl);
      if (children) {
        propDef.children = children;
      }
    }

    props.push(propDef);
  }

  return props;
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
      childType = cleanTypeText(childProp.getTypeAtLocation(childDecl).getText());
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
    if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
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
    // Keep it but truncate very long inline object types
    cleaned = cleaned.replace(/\{[^{}]{100,}\}/g, (match) => {
      // Keep the first few properties
      const abbreviated = match.substring(0, 80) + "... }";
      return abbreviated;
    });
  }
  return cleaned;
}

// ── Step 5: Process a single component ──────────────────────────────────────

function resolveComponentSourceFile(
  primitiveDir: string,
  sub: SubComponent,
): SourceFile | undefined {
  // First, try resolving the local source file
  const localFile = resolveSourceFile(primitiveDir, sub.sourceModule);
  if (!localFile) return undefined;

  // Check if the local file has the namespace we need
  const ns = findNamespace(localFile, sub.localName);
  if (ns) return localFile;

  // The local file might be a re-export from another package (e.g., @assistant-ui/core/react)
  // Check all export declarations for re-exports
  for (const exportDecl of localFile.getExportDeclarations()) {
    const moduleSpec = exportDecl.getModuleSpecifierValue();
    if (!moduleSpec) continue;

    // Check if this export includes our component name
    const hasNamedExport = exportDecl.getNamedExports().some(
      (named) => named.getName() === sub.localName
    );
    if (!hasNamedExport) continue;

    if (moduleSpec.startsWith("@assistant-ui/core")) {
      // Resolve from core package — @assistant-ui/core/react → packages/core/src/react
      const corePath = moduleSpec.replace("@assistant-ui/core", CORE_PKG);
      const found = findSourceInDirectory(corePath, sub.localName);
      if (found) return found;

      // Also try resolving as a barrel export — search subdirectories
      const coreDir = path.join(CORE_PKG, "react/primitives");
      if (fs.existsSync(coreDir)) {
        for (const subdir of fs.readdirSync(coreDir)) {
          const subdirPath = path.join(coreDir, subdir);
          if (!fs.statSync(subdirPath).isDirectory()) continue;
          const found = findSourceInDirectory(subdirPath, sub.localName);
          if (found) return found;
        }
      }
    }
  }

  return undefined;
}

function processComponent(
  primitiveDir: string,
  sub: SubComponent,
): PartDef | undefined {
  const sourceFile = resolveComponentSourceFile(primitiveDir, sub);
  if (!sourceFile) return undefined;

  const ns = findNamespace(sourceFile, sub.localName);
  if (!ns) return undefined;

  const propsAlias = ns.getTypeAliases().find((t) => t.getName() === "Props");
  if (!propsAlias) return undefined;

  const element = extractElementType(ns);
  const { description, deprecated } = getComponentJsDoc(sourceFile, sub.localName);

  // Check if this is an ActionButtonProps type
  const propsText = propsAlias.getText();
  const isActionButton = propsText.includes("ActionButtonProps");

  let props: PropDef[];
  if (isActionButton) {
    props = extractActionButtonProps(sourceFile, sub.localName);
  } else {
    props = extractPropsFromType(propsAlias, sourceFile);
  }

  // Add asChild if the component renders a Radix primitive element
  // (check if the source file imports from @radix-ui/react-primitive)
  const hasAsChild =
    !isActionButton &&
    props.every((p) => p.name !== "asChild") &&
    sourceFile.getText().includes("@radix-ui/react-primitive");
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

function findSourceInDirectory(
  dirPath: string,
  componentName: string,
): SourceFile | undefined {
  const extensions = [".tsx", ".ts"];
  for (const ext of extensions) {
    // Try exact filename match
    const filePath = path.join(dirPath, componentName + ext);
    if (fs.existsSync(filePath)) {
      return project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    }
  }

  // Search all files in directory for the namespace
  if (!fs.existsSync(dirPath)) return undefined;
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const sf = project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    if (findNamespace(sf, componentName)) return sf;
  }

  return undefined;
}

// ── Step 6: Process all primitives ──────────────────────────────────────────

function processAllPrimitives(): Record<string, PrimitiveDef> {
  const primitives = discoverPrimitives();
  const result: Record<string, PrimitiveDef> = {};

  for (const [primitiveName, moduleSpec] of primitives) {
    const primitiveDir = path.join(PRIMITIVES_DIR, moduleSpec.replace("./", ""));
    const subComponents = discoverSubComponents(primitiveDir);

    if (subComponents.length === 0) continue;

    const parts: PrimitiveDef = {};
    const seen = new Set<string>();

    for (const sub of subComponents) {
      // Skip duplicate exports (e.g., Content is alias for Parts)
      if (seen.has(sub.localName)) continue;
      seen.add(sub.localName);

      try {
        const part = processComponent(primitiveDir, sub);
        if (part) {
          parts[sub.exportedName] = part;
        }
      } catch (e) {
        console.warn(`  Warning: Failed to process ${primitiveName}.${sub.exportedName}:`, (e as Error).message);
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
