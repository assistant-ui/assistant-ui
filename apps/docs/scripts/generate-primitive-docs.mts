import * as fs from "node:fs";
import * as path from "node:path";
import { PRIMITIVE_DOCS_OUTPUT } from "./api-reference/paths.mts";
import { getReactApiRenderOptions } from "./api-reference/discover.mts";
import {
  extractPrimitiveParts,
  type InheritedFrom,
  type PrimitivePartModel,
  type PropModel,
} from "./api-reference/primitive-extract.mts";

// ── Projection: PrimitivePartModel[] \u2192 grouped doc shape ──────────────────

type RenderedProp = {
  name: string;
  type?: string;
  description?: string;
  default?: string;
  required?: boolean;
  deprecated?: string;
  children?: Array<{ type?: string; parameters: RenderedProp[] }>;
};

type RenderedPart = {
  element?: string;
  description?: string;
  deprecated?: string;
  props: RenderedProp[];
};

type GroupedPrimitives = Record<string, Record<string, RenderedPart>>;

const PRIMITIVE_FILTER: ReadonlySet<InheritedFrom> = new Set([
  "react",
  "csstype",
  "react-textarea-autosize",
  "radix",
]);

function shouldDropForPrimitive(prop: PropModel): boolean {
  if (prop.name.startsWith("__")) return true;
  // `tw` is a polluting global JSX prop from `@vercel/og` types pulled in by
  // the Next.js tsconfig. Legacy primitive-docs ran with
  // `skipAddingFilesFromTsConfig: true` so it never saw this prop; we drop
  // it by name here to preserve that behaviour.
  if (prop.name === "tw") return true;
  return (
    prop.inheritedFrom !== undefined && PRIMITIVE_FILTER.has(prop.inheritedFrom)
  );
}

/** Truncate very long inline object types at a token boundary. Mirrors the
 *  legacy primitive-docs cleanTypeText behaviour exactly. */
function presentPrimitiveType(rawType: string | undefined): string | undefined {
  if (!rawType) return undefined;
  if (rawType.length <= 120) return rawType;
  return rawType.replace(/\{[^{}]{100,}\}/g, (match) => {
    let cutoff = 80;
    const semicolonIdx = match.lastIndexOf(";", cutoff);
    const commaIdx = match.lastIndexOf(",", cutoff);
    const breakIdx = Math.max(semicolonIdx, commaIdx);
    if (breakIdx > 20) cutoff = breakIdx + 1;
    return `${match.substring(0, cutoff)} ... }`;
  });
}

/** Project one level of children. Legacy primitive-docs only expanded
 *  children one level deep (no recursion), and emitted children for the
 *  `components` prop without a wrapping `type` field. */
function projectChildrenShallow(
  children: PropModel["children"],
  parentPropName: string,
): RenderedProp["children"] | undefined {
  if (!children) return undefined;
  const omitType = parentPropName === "components";
  const out = children
    .map(({ typeName, props }) => {
      const parameters = props
        .filter((child) => !shouldDropForPrimitive(child))
        .map((child) => projectProp(child, false));
      if (parameters.length === 0) return undefined;
      return omitType ? { parameters } : { type: typeName, parameters };
    })
    .filter((entry): entry is { type?: string; parameters: RenderedProp[] } =>
      Boolean(entry),
    );
  return out.length > 0 ? out : undefined;
}

function isInlineObjectTypeText(typeText: string | undefined): boolean {
  if (!typeText) return false;
  const text = typeText.trim();
  return text.startsWith("{") || text.startsWith("| {");
}

function projectProp(prop: PropModel, allowChildren = true): RenderedProp {
  // Legacy primitive-docs only expanded children when:
  //   - prop is named `components` AND its type text contained `{`, OR
  //   - the prop's type-node was an inline object literal.
  // Use rawType as a proxy for both checks.
  const rawText = prop.rawType ?? "";
  const shouldExpand =
    allowChildren &&
    ((prop.name === "components" && rawText.includes("{")) ||
      isInlineObjectTypeText(prop.rawType));
  const children = shouldExpand
    ? projectChildrenShallow(prop.children, prop.name)
    : undefined;
  const type = presentPrimitiveType(prop.rawType);
  const out: RenderedProp = { name: prop.name };
  if (type !== undefined) out.type = type;
  if (prop.description) out.description = prop.description;
  if (prop.default) out.default = prop.default;
  if (prop.required) out.required = true;
  if (prop.deprecated) out.deprecated = prop.deprecated;
  if (children) out.children = children;
  return out;
}

function projectPart(part: PrimitivePartModel): RenderedPart {
  let props: RenderedProp[];

  if (part.isActionButton) {
    // Legacy primitive-docs only documented hook-specific params for
    // ActionButton parts. Both `render` (locally declared in WithRenderProp)
    // and the rest of PrimitiveButtonProps are excluded here; `asChild` is
    // re-injected below as a bare row. Also strip trailing `| undefined`
    // from hook param types to match legacy ActionButton output.
    props = part.props
      .filter((p) => !shouldDropForPrimitive(p))
      .filter((p) => p.name !== "render" && p.name !== "asChild")
      .map(projectProp)
      .map((p) =>
        p.type ? { ...p, type: p.type.replace(/\s*\|\s*undefined$/, "") } : p,
      );
    props = [{ name: "asChild" }, ...props];
  } else {
    props = part.props
      .filter((p) => !shouldDropForPrimitive(p))
      .map(projectProp);
    // Inject a bare asChild when the part supports it and the projection
    // didn't already carry one.
    if (part.supportsAsChild && !props.some((p) => p.name === "asChild")) {
      props = [{ name: "asChild" }, ...props];
    }
  }

  const out: RenderedPart = { props };
  if (part.element) out.element = part.element;
  if (part.description) out.description = part.description;
  if (part.deprecated) out.deprecated = part.deprecated;
  return out;
}

function projectToPrimitiveDocs(
  parts: PrimitivePartModel[],
): GroupedPrimitives {
  const result: GroupedPrimitives = {};
  // First-wins per (primitiveName, localName) so that `Content` aliased to
  // `Parts` doesn't emit a duplicate entry. Order matches barrel order from
  // the underlying source file.
  const seen = new Map<string, Set<string>>();
  for (const part of parts) {
    const seenLocals = seen.get(part.primitiveName) ?? new Set();
    if (seenLocals.has(part.localName)) continue;
    seenLocals.add(part.localName);
    seen.set(part.primitiveName, seenLocals);
    let primitive = result[part.primitiveName];
    if (!primitive) {
      primitive = {};
      result[part.primitiveName] = primitive;
    }
    primitive[part.partName] = projectPart(part);
  }
  return result;
}

function serialize(grouped: GroupedPrimitives): string {
  const lines: string[] = [
    "// AUTO-GENERATED by scripts/generate-primitive-docs.mts",
    "// Do not edit manually.",
    "",
  ];
  for (const [name, parts] of Object.entries(grouped)) {
    lines.push(`export const ${name} = ${JSON.stringify(parts, null, 2)};\n`);
  }
  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log("Generating primitive docs...");
const parts = extractPrimitiveParts(getReactApiRenderOptions());
const grouped = projectToPrimitiveDocs(parts);
const output = serialize(grouped);

fs.mkdirSync(path.dirname(PRIMITIVE_DOCS_OUTPUT), { recursive: true });
fs.writeFileSync(PRIMITIVE_DOCS_OUTPUT, output);

const totalParts = Object.values(grouped).reduce(
  (sum, p) => sum + Object.keys(p).length,
  0,
);
console.log(
  `Generated docs for ${Object.keys(grouped).length} primitives with ${totalParts} parts \u2192 ${PRIMITIVE_DOCS_OUTPUT}`,
);
