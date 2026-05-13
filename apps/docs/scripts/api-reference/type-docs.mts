import * as fs from "node:fs";
import * as path from "node:path";
import {
  INTEGRATION_PACKAGES,
  INTEGRATION_TYPE_DOCS_OUTPUT,
  REPO_ROOT,
  TYPE_DOCS_INPUT,
  TYPE_DOCS_OUTPUT,
} from "./paths.mts";
import { type ExportInfo, discoverIntegrationExports } from "./discover.mts";
import {
  extractExportShape,
  extractSupportingTypeShapes,
  isPrimitiveOnlyType,
  type ExtractedShape,
  type InheritedFrom,
  type PropModel,
} from "./extract.mts";
import {
  extractPrimitivePartsFor,
  type PrimitivePartModel,
} from "./primitive-extract.mts";

// ── TypeDoc presentation shape ─────────────────────────────────────────────

export type TypeDocParameter = {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  default?: string;
  deprecated?: string;
  children?: { type?: string; parameters: TypeDocParameter[] }[];
};

export type TypeDoc = {
  type?: string;
  parameters: TypeDocParameter[];
};

export type TypeDocBindings = Map<string, string>;

// ── Projection: PropModel → TypeDocParameter (API reference) ───────────────

// Match legacy api-surface filter exactly. Radix is intentionally NOT
// filtered here — PrimitiveButtonProps members like `asChild`/`render` come
// from @radix-ui/react-primitive and need to surface in api-ref typeDocs for
// ActionButton-style primitive parts. The primitive-docs projection still
// filters radix (and inserts a bare `asChild` row).
const API_REF_FILTER: ReadonlySet<InheritedFrom> = new Set([
  "react",
  "csstype",
  "react-textarea-autosize",
  "tw",
]);

function shouldDropForApiRef(prop: PropModel): boolean {
  // Always show asChild even if its declaration site is third-party.
  if (prop.name === "asChild") return false;
  // Drop the legacy "tw" pseudo-prop by name (used to live on every component
  // before tailwind-variants was internalized).
  if (prop.name === "tw") return true;
  return (
    prop.inheritedFrom !== undefined && API_REF_FILTER.has(prop.inheritedFrom)
  );
}

function isInlineObjectTypeText(typeText: string): boolean {
  const text = typeText.trim();
  return text.startsWith("{") || text.startsWith("| {");
}

function projectChildren(
  children: PropModel["children"],
): TypeDocParameter["children"] | undefined {
  if (!children || children.length === 0) return undefined;
  const out = children
    .map(({ typeName, props }) => {
      const parameters = props
        .filter((child) => !shouldDropForApiRef(child))
        .map(projectPropToTypeDoc);
      return parameters.length > 0 ? { type: typeName, parameters } : undefined;
    })
    .filter(
      (entry): entry is { type: string; parameters: TypeDocParameter[] } =>
        Boolean(entry),
    );
  return out.length > 0 ? out : undefined;
}

function projectPropToTypeDoc(prop: PropModel): TypeDocParameter {
  const children = projectChildren(prop.children);
  // Api-ref consumes `declaredType` (authored type-node where available,
  // falls back to resolved type minus `| undefined`). When children are
  // present and the type text is an inline object literal, the literal is
  // redundant — replace with the child type's name.
  const baseType = prop.declaredType ?? prop.rawType;
  const typeText =
    children && baseType && isInlineObjectTypeText(baseType)
      ? (children[0]?.type ?? baseType)
      : baseType;
  const out: TypeDocParameter = { name: prop.name };
  if (typeText) out.type = typeText;
  if (prop.required !== undefined) out.required = prop.required;
  // Preserve empty descriptions (class members are emitted with `""`).
  if (prop.description !== undefined) out.description = prop.description;
  if (prop.default) out.default = prop.default;
  if (prop.deprecated) out.deprecated = prop.deprecated;
  if (children) out.children = children;
  return out;
}

function shapeToTypeDoc(shape: ExtractedShape): TypeDoc | undefined {
  const parameters = shape.parameters
    .filter((prop) => !shouldDropForApiRef(prop))
    .map(projectPropToTypeDoc);
  // Match legacy: a shape whose every property is filtered as inherited
  // produces no typeDocs entry. Class shapes are exempt — they intentionally
  // emit empty member lists for completeness.
  if (parameters.length === 0 && shape.kind !== "class") return undefined;
  // For class shapes the legacy renderer used the bare type name (no " props"
  // suffix) — keep that. For component shapes it appended " props".
  const typeName =
    shape.kind === "component" ? `${shape.name} props` : shape.name;
  return { type: typeName, parameters };
}

function primitivePartToTypeDoc(part: PrimitivePartModel): TypeDoc | undefined {
  let parameters = part.props
    .filter((prop) => !shouldDropForApiRef(prop))
    .map(projectPropToTypeDoc);

  // Inject a bare asChild row when the type supports it and the projection
  // didn't already carry one. Mirrors primitive-docs behaviour.
  const hasAsChild = parameters.some((p) => p.name === "asChild");
  if (!hasAsChild && (part.supportsAsChild || part.isActionButton)) {
    parameters = [{ name: "asChild" }, ...parameters];
  }

  // Match legacy: parts whose Props are empty (e.g. `Record<string, never>`)
  // produced no typeDocs entry. The MDX renderer falls back to the
  // primitiveDocs entry for these.
  if (parameters.length === 0) return undefined;

  return { type: part.propsTypeName, parameters };
}

// ── Building the typeDocs maps ─────────────────────────────────────────────

export function buildTypeDocs(exports: ExportInfo[]): {
  typeDocs: Map<string, TypeDoc>;
  integrationTypeDocs: Map<string, TypeDoc>;
  integrationsByPackage: Array<{
    slug: string;
    items: ExportInfo[];
    typeDocBindings: TypeDocBindings;
    typeDocNames: Set<string>;
  }>;
} {
  const typeDocs = new Map<string, TypeDoc>();

  // 1. Static input file: types declared in content/types-to-generate/typeDocs.ts.
  for (const [name, shape] of extractSupportingTypeShapes(TYPE_DOCS_INPUT)) {
    const td = shapeToTypeDoc(shape);
    if (td) typeDocs.set(name, td);
  }

  // 2. For each export, lazily extract primitive parts (for primitive
  //    sections) interleaved with per-export shape extraction. This load
  //    order matters: ts-morph's intersection property iteration depends on
  //    when source files are first added to the project, and legacy
  //    api-surface interleaved primitive-part loading inside the export
  //    loop. Mirroring that here keeps property order byte-for-byte stable.
  for (const item of exports) {
    if (item.section === "primitives") {
      for (const part of extractPrimitivePartsFor(item.name)) {
        // Skip lowercase `unstable_*` parts in api-ref typeDocs to match
        // legacy api-surface (which only matched capital `Unstable_`).
        // The primitive-docs projection still emits these.
        if (/^unstable_[A-Z]/.test(part.partName)) continue;
        const name = part.propsTypeName;
        if (typeDocs.has(name)) continue;
        const td = primitivePartToTypeDoc(part);
        if (td) typeDocs.set(name, td);
      }
    }
  }

  // 3. Each export → its own shape (and supporting types from the same file
  //    when the primary shape can't be projected).
  for (const item of exports) {
    if (!item.sourcePath) continue;
    if (typeDocs.has(item.name)) continue;
    const shape = extractExportShape(item);
    const td = shape ? shapeToTypeDoc(shape) : undefined;
    if (td) {
      typeDocs.set(item.name, td);
    } else {
      // Either the shape couldn't be projected, or every property was
      // filtered as inherited. In both cases, fall back to absorbing other
      // supporting type aliases declared in the same file.
      const filePath = path.join(REPO_ROOT, item.sourcePath);
      if (!fs.existsSync(filePath)) continue;
      for (const [name, supportingShape] of extractSupportingTypeShapes(
        filePath,
        item.jsDocLinkResolver
          ? { linkResolver: item.jsDocLinkResolver }
          : undefined,
      )) {
        if (typeDocs.has(name)) continue;
        const supportingTd = shapeToTypeDoc(supportingShape);
        if (supportingTd) typeDocs.set(name, supportingTd);
      }
    }
  }

  // 4. Integration packages: discover, project shapes (skipping primitive
  //    type aliases), namespace bindings.
  const integrationTypeDocs = new Map<string, TypeDoc>();
  const integrationsByPackage: Array<{
    slug: string;
    items: ExportInfo[];
    typeDocBindings: TypeDocBindings;
    typeDocNames: Set<string>;
  }> = [];
  for (const integration of INTEGRATION_PACKAGES) {
    const items = discoverIntegrationExports(
      integration.entry,
      integration.slug,
    );
    const localTypeDocs = new Map<string, TypeDoc>();
    for (const item of items) {
      if (!item.sourcePath) continue;
      if (localTypeDocs.has(item.name)) continue;
      const filePath = path.join(REPO_ROOT, item.sourcePath);
      if (!fs.existsSync(filePath)) continue;
      if (isPrimitiveOnlyType(filePath, item.name)) continue;
      const shape = extractExportShape(item);
      const td = shape ? shapeToTypeDoc(shape) : undefined;
      if (td) localTypeDocs.set(item.name, td);
    }
    const typeDocBindings: TypeDocBindings = new Map(
      [...localTypeDocs.keys()].map((name) => [
        name,
        typeDocBindingForIntegration(integration.slug, name),
      ]),
    );
    for (const [name, typeDoc] of localTypeDocs) {
      integrationTypeDocs.set(
        typeDocBindingForIntegration(integration.slug, name),
        typeDoc,
      );
    }
    integrationsByPackage.push({
      slug: integration.slug,
      items,
      typeDocBindings,
      typeDocNames: new Set(localTypeDocs.keys()),
    });
  }

  return { typeDocs, integrationTypeDocs, integrationsByPackage };
}

export function typeDocBindingForIntegration(
  slug: string,
  name: string,
): string {
  return `${slug.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())}_${name}`;
}

function writeTypeDocsFile(
  outputPath: string,
  typeDocs: Map<string, TypeDoc>,
  bindingForName: (name: string) => string,
): void {
  const output = [
    "// AUTO-GENERATED by scripts/generate-api-reference.mts",
    "// Do not edit manually.",
    "",
    ...[...typeDocs.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([name, type]) =>
          `export const ${bindingForName(name)} = ${JSON.stringify(type, null, 2)};\n`,
      ),
  ].join("\n");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
}

export function writeTypeDocs(typeDocs: Map<string, TypeDoc>): void {
  writeTypeDocsFile(TYPE_DOCS_OUTPUT, typeDocs, (name) => name);
}

export function writeIntegrationTypeDocs(
  integrationTypeDocs: Map<string, TypeDoc>,
): void {
  writeTypeDocsFile(
    INTEGRATION_TYPE_DOCS_OUTPUT,
    integrationTypeDocs,
    (name) => name,
  );
}
