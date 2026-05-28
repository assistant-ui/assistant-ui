import * as fs from "node:fs";
import * as path from "node:path";
import {
  API_REFERENCE_DIR,
  INTEGRATION_PACKAGES,
  REPO_ROOT,
} from "./paths.mts";
import {
  REACT_API_SECTIONS,
  SECTION_ORDER,
  type ApiSection,
  type ExportInfo,
} from "./discover.mts";
import {
  primitivePartTypeDocName,
  readPrimitiveParts,
} from "./primitive-extract.mts";
import type { TypeDoc, TypeDocBindings } from "./type-docs.mts";

// ── MDX rendering ──────────────────────────────────────────────────────────

const GENERATED_PAGE_MARKER =
  "{/* AUTO-GENERATED PAGE by scripts/generate-api-reference.mts */}";
const SKIP_AUTO_GENERATION_MARKER =
  "{/* api-reference:skip-auto-generation */}";
const API_REFERENCE_START = "{/* api-reference:start */}";
const API_REFERENCE_END = "{/* api-reference:end */}";

type AuthoredSlot = {
  kind: "api-manual" | "api-example";
  name?: string;
  content: string;
};

type PageSlots = {
  manual?: string;
  namedManual: Map<string, string>;
  examples: Map<string, string>;
  explicit: AuthoredSlot[];
};

type AuthoredFrontmatter = {
  title?: string;
  description?: string;
};

type AuthoredPageParts = {
  frontmatter: AuthoredFrontmatter;
  slots: PageSlots;
  skipAutoGeneration: boolean;
};

type PageSummary = { slug: string; title: string; description: string };

function frontmatter(title: string, description: string): string {
  return [
    "---",
    `title: ${yamlScalar(title)}`,
    `description: ${yamlScalar(description)}`,
    "---",
    "",
  ].join("\n");
}

function yamlScalar(value: string): string {
  return /^[A-Za-z0-9<][A-Za-z0-9 .,@'()&+<>/-]*$/.test(value)
    ? value
    : JSON.stringify(value);
}

function titleForPage(page: string, exports: ExportInfo[]): string {
  const primary = exports.filter((item) => item.pageRole === "primary");
  if (primary.length === 1) return primary[0]!.name;
  return titleCaseSlug(page);
}

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const SECTION_TITLE_OVERRIDES: Partial<Record<ApiSection, string>> = {
  "generative-ui": "Generative UI",
};

function sectionTitle(section: ApiSection): string {
  return SECTION_TITLE_OVERRIDES[section] ?? titleCaseSlug(section);
}

function mdxEscape(value: string): string {
  return value
    .split(/(```[\s\S]*?```|`[^`]*`)/g)
    .map((part) =>
      part.startsWith("`")
        ? part
        : part
            .replaceAll("{", "\\{")
            .replaceAll("}", "\\}")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;"),
    )
    .join("");
}

function renderJsDocExample(value: string): string {
  const trimmed = value.trim();
  const example = trimmed.includes("```")
    ? trimmed
    : ["```tsx", trimmed, "```"].join("\n");
  return mdxEscape(example);
}

function mdxCommentMarker(name: string, boundary: "start" | "end"): string {
  return `{/* ${name}:${boundary} */}`;
}

function extractManualSlot(source: string): string | undefined {
  const regex =
    /\{\/\*\s*api-manual:start\s*\*\/\}([\s\S]*?)\{\/\*\s*api-manual:end\s*\*\/\}/;
  const match = source.match(regex);
  return match
    ? [
        mdxCommentMarker("api-manual", "start"),
        (match[1] ?? "").trim(),
        mdxCommentMarker("api-manual", "end"),
      ].join("\n")
    : undefined;
}

function extractNamedManualSlots(source: string): Map<string, string> {
  const slots = new Map<string, string>();
  const regex =
    /\{\/\*\s*api-manual:([^:\s]+):start\s*\*\/\}([\s\S]*?)\{\/\*\s*api-manual:\1:end\s*\*\/\}/g;
  for (const match of source.matchAll(regex)) {
    const name = match[1]!;
    slots.set(
      name,
      [
        mdxCommentMarker(`api-manual:${name}`, "start"),
        (match[2] ?? "").trim(),
        mdxCommentMarker(`api-manual:${name}`, "end"),
      ].join("\n"),
    );
  }
  return slots;
}

function apiReferencePagePath(section: ApiSection, slug: string): string {
  return path.join(API_REFERENCE_DIR, section, `${slug}.mdx`);
}

function exampleSlot(name: string, content: string): string {
  return [
    mdxCommentMarker(`api-example:${name}`, "start"),
    content.trim(),
    mdxCommentMarker(`api-example:${name}`, "end"),
  ].join("\n");
}

function extractExampleSlots(source: string): Map<string, string> {
  const examples = new Map<string, string>();
  const regex =
    /\{\/\*\s*api-example:([^:\s]+):start\s*\*\/\}([\s\S]*?)\{\/\*\s*api-example:\1:end\s*\*\/\}/g;
  for (const match of source.matchAll(regex)) {
    const name = match[1]!;
    examples.set(name, exampleSlot(name, match[2] ?? ""));
  }
  return examples;
}

function assertPairedMdxMarkers(filePath: string, source: string): void {
  const startMarkerRegex = /\{\/\*\s*([^*]+?):start\s*\*\/\}/g;
  const unclosed = [...source.matchAll(startMarkerRegex)]
    .map((match) => match[1]!.trim())
    .filter((name) => !source.includes(mdxCommentMarker(name, "end")));
  if (unclosed.length === 0) return;
  throw new Error(
    `Unclosed marker found in ${path.relative(
      REPO_ROOT,
      filePath,
    )}, generation stopped: ${unclosed.join(", ")}`,
  );
}

function unquoteFrontmatterScalar(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return trimmed.startsWith('"')
        ? JSON.parse(trimmed)
        : trimmed.slice(1, -1).replaceAll("''", "'");
    } catch {
      throw new Error(`Invalid quoted frontmatter scalar: ${value}`);
    }
  }
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    throw new Error(`Unsupported frontmatter scalar: ${value}`);
  }
  return trimmed;
}

function readFrontmatter(
  filePath: string,
  source: string,
): AuthoredFrontmatter {
  if (!source.startsWith("---\n")) return {};
  const end = source.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error(
      `Malformed frontmatter in ${path.relative(REPO_ROOT, filePath)}`,
    );
  }
  const fm: AuthoredFrontmatter = {};
  for (const line of source.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!match) {
      throw new Error(
        `Unsupported frontmatter line in ${path.relative(REPO_ROOT, filePath)}: ${line}`,
      );
    }
    const [, key, value] = match;
    if (key === "title" || key === "description") {
      fm[key] = unquoteFrontmatterScalar(value ?? "");
    }
  }
  return fm;
}

function emptyPageSlots(): PageSlots {
  return {
    namedManual: new Map(),
    examples: new Map(),
    explicit: [],
  };
}

function readAuthoredPageParts(
  section: ApiSection,
  slug: string,
  items: ExportInfo[],
): AuthoredPageParts | undefined {
  const filePath = apiReferencePagePath(section, slug);
  let source: string;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return undefined;
    throw error;
  }
  assertPairedMdxMarkers(filePath, source);
  const fm = readFrontmatter(filePath, source);
  const manual = extractManualSlot(source);
  const namedManual = extractNamedManualSlots(source);
  const explicitExamples = extractExampleSlots(source);
  const examples = new Map(explicitExamples);
  const itemNames = new Set(
    items.flatMap((item) => [
      item.name,
      ...(item.section === "primitives"
        ? readPrimitiveParts(item.name).map((part) => `${item.name}.${part}`)
        : []),
    ]),
  );
  for (const name of examples.keys()) {
    if (!itemNames.has(name)) {
      console.warn(
        `Warning: api-example:${name} in ${path.relative(REPO_ROOT, filePath)} does not match an export on this page`,
      );
    }
  }
  const explicit: AuthoredSlot[] = [];
  if (manual) explicit.push({ kind: "api-manual", content: manual });
  for (const [name, content] of namedManual) {
    explicit.push({ kind: "api-manual", name, content });
  }
  for (const [name, content] of explicitExamples) {
    explicit.push({ kind: "api-example", name, content });
  }
  return {
    frontmatter: fm,
    slots: { manual, namedManual, examples, explicit },
    skipAutoGeneration: source.includes(SKIP_AUTO_GENERATION_MARKER),
  };
}

function assertPreservedSlots(
  filePath: string,
  slots: PageSlots,
  nextSource: string,
): void {
  const missing = slots.explicit.filter(
    (slot) => !nextSource.includes(slot.content),
  );
  if (missing.length === 0) return;
  throw new Error(
    `Refusing to write ${path.relative(
      REPO_ROOT,
      filePath,
    )} because generated output dropped authored slots: ${missing
      .map((slot) => (slot.name ? `${slot.kind}:${slot.name}` : slot.kind))
      .join(", ")}`,
  );
}

function isUnstableName(name: string): boolean {
  return name.startsWith("unstable_") || name.startsWith("Unstable_");
}

function exportSortKey(item: ExportInfo): [number, string] {
  if (item.deprecated) return [isUnstableName(item.name) ? 3 : 2, item.name];
  if (isUnstableName(item.name)) return [1, item.name];
  return [0, item.name];
}

function sortExportsForPage(items: ExportInfo[]): ExportInfo[] {
  return [...items].sort((a, b) => {
    if (a.pageRole !== b.pageRole) {
      const roleOrder = { primary: 0, related: 1, "supporting-type": 2 };
      return roleOrder[a.pageRole] - roleOrder[b.pageRole];
    }
    const [aGroup, aName] = exportSortKey(a);
    const [bGroup, bName] = exportSortKey(b);
    if (aGroup !== bGroup) return aGroup - bGroup;
    return aName.localeCompare(bName);
  });
}

function exportSection(
  item: ExportInfo,
  typeDocNames: Set<string>,
  slots: PageSlots,
  headingLevel = 2,
  typeDocBindings: TypeDocBindings = new Map(),
): string[] {
  if (!hasGeneratedEntryContent(item, typeDocNames, slots)) return [];
  const heading = "#".repeat(headingLevel);
  const lines = [`${heading} ${item.name}`, ""];
  if (item.deprecated) {
    lines.push(
      `<Callout type="warn">`,
      `<strong>Deprecated.</strong> ${mdxEscape(item.deprecated)}`,
      `</Callout>`,
      "",
    );
  }
  if (item.jsDoc) {
    lines.push(mdxEscape(item.jsDoc), "");
  }
  const example = slots.examples.get(item.name);
  if (example) {
    lines.push(example, "");
  } else if (item.jsDocExamples) {
    for (const jsDocExample of item.jsDocExamples) {
      lines.push(renderJsDocExample(jsDocExample), "");
    }
  }
  if (typeDocNames.has(item.name)) {
    lines.push(
      `<ParametersTable {...${typeDocBindings.get(item.name) ?? item.name}} />`,
      "",
    );
  } else if (item.signature) {
    lines.push(["```ts", item.signature, "```"].join("\n"), "");
  }
  const manual = slots.namedManual.get(item.name);
  if (manual) lines.push(manual, "");
  return lines;
}

function hasGeneratedEntryContent(
  item: ExportInfo,
  typeDocNames: Set<string>,
  slots: PageSlots,
): boolean {
  return Boolean(
    item.jsDoc ||
    item.jsDocExamples?.length ||
    item.deprecated ||
    typeDocNames.has(item.name) ||
    item.signature ||
    slots.namedManual.has(item.name) ||
    slots.examples.has(item.name),
  );
}

function isRenderedApiEntry(
  item: ExportInfo,
  typeDocNames: Set<string>,
  slots: PageSlots,
): boolean {
  return (
    item.pageRole !== "supporting-type" &&
    hasGeneratedEntryContent(item, typeDocNames, slots)
  );
}

function generatePrimitivePage(
  item: ExportInfo,
  companions: ExportInfo[],
  typeDocNames: Set<string>,
  slots: PageSlots,
  title: string,
  description: string,
): string {
  const guideFile = path.join(
    REPO_ROOT,
    "apps/docs/content/docs/primitives",
    `${item.page}.mdx`,
  );
  const guideLine = fs.existsSync(guideFile)
    ? `For examples and usage patterns, see [${titleForPage(item.page, [item]).replace(/Primitive$/, "")}](/docs/primitives/${item.page}).`
    : undefined;
  return generateApiPage({
    title,
    description,
    imports: generatedImportsForPage([item, ...companions], typeDocNames),
    guideLine,
    slots,
    reference: generatePrimitiveReferenceRegion(
      item,
      companions,
      typeDocNames,
      slots,
    ),
  });
}

function generatePrimitiveReferenceRegion(
  item: ExportInfo,
  companions: ExportInfo[],
  typeDocNames: Set<string>,
  slots: PageSlots,
): string {
  const parts = readPrimitiveParts(item.name);
  const lines = ["## API Reference", ""];
  if (parts.length > 0) {
    for (const part of parts) {
      lines.push(`### ${part}`, "");
      const partName = `${item.name}.${part}`;
      const example = slots.examples.get(partName);
      if (example) lines.push(example, "");
      lines.push(primitiveParametersTable(item.name, part, typeDocNames), "");
      const manual = slots.namedManual.get(partName);
      if (manual) lines.push(manual, "");
    }
  } else {
    lines.push(...exportSection(item, typeDocNames, slots, 3));
  }
  if (typeDocNames.has(item.name)) {
    lines.push(
      `### ${item.name}`,
      "",
      `<ParametersTable {...${item.name}} />`,
      "",
    );
    const manual = slots.namedManual.get(item.name);
    if (manual) lines.push(manual, "");
  }
  // Helpers bound to a specific primitive part (e.g. groupPartByType for
  // <MessagePrimitive.GroupedParts>) render after the primitive's own parts so
  // they live beside the part they configure instead of in a fallback drawer.
  for (const companion of sortExportsForPage(companions).filter((entry) =>
    isRenderedApiEntry(entry, typeDocNames, slots),
  )) {
    lines.push(...exportSection(companion, typeDocNames, slots, 3));
  }
  return lines.join("\n").trimEnd();
}

function primitiveParametersTable(
  primitiveName: string,
  part: string,
  typeDocNames: Set<string>,
): string {
  const binding = `${primitiveName}Docs.${part}`;
  const typeDocName = primitivePartTypeDocName(primitiveName, part);
  const table = typeDocNames.has(typeDocName)
    ? `<ParametersTable {...${typeDocName}} />`
    : [
        `{${binding}?.props && (`,
        `  <ParametersTable type={${binding}?.element} parameters={${binding}.props} />`,
        `)}`,
      ].join("\n");
  return [
    `{${binding}?.deprecated && (`,
    `  <Callout type="warn">`,
    `    <strong>Deprecated.</strong> {${binding}.deprecated}`,
    `  </Callout>`,
    `)}`,
    "",
    `{${binding}?.description}`,
    "",
    `{${binding}?.element && (`,
    `  <p>This primitive renders a <code>{\`<\${${binding}?.element}>\`}</code> element unless <code>asChild</code> is set.</p>`,
    `)}`,
    "",
    table,
  ].join("\n");
}

function generateReferenceRegion(
  items: ExportInfo[],
  typeDocNames: Set<string>,
  slots: PageSlots,
  typeDocBindings: TypeDocBindings = new Map(),
): string {
  return [
    "## API Reference",
    "",
    ...sortExportsForPage(items)
      .filter((item) => isRenderedApiEntry(item, typeDocNames, slots))
      .flatMap((item) =>
        exportSection(item, typeDocNames, slots, 3, typeDocBindings),
      ),
  ]
    .join("\n")
    .trimEnd();
}

function generatedReferenceRegion(content: string): string {
  return [
    API_REFERENCE_START,
    "{/* AUTO-GENERATED by scripts/generate-api-reference.mts */}",
    "{/* Do not edit this block manually. */}",
    "",
    content.trim(),
    API_REFERENCE_END,
  ].join("\n");
}

function generateApiPage({
  title,
  description,
  imports,
  guideLine,
  slots,
  reference,
}: {
  title: string;
  description: string;
  imports: string;
  guideLine?: string;
  slots: PageSlots;
  reference: string;
}): string {
  const lines = [
    frontmatter(title, description),
    imports,
    "",
    GENERATED_PAGE_MARKER,
    "{/* Do not edit manually. */}",
    "",
  ];
  if (guideLine) lines.push(guideLine, "");
  if (slots.manual) lines.push(slots.manual, "");
  lines.push(generatedReferenceRegion(reference));
  return `${lines.join("\n")}\n`;
}

function generatedImportsForPage(
  items: ExportInfo[],
  typeDocNames: Set<string>,
): string {
  const visibleItems = items.filter(
    (item) => item.pageRole !== "supporting-type",
  );
  const primitives = visibleItems
    .filter((item) => item.section === "primitives")
    .map((item) => ({ name: item.name, parts: readPrimitiveParts(item.name) }));
  const typeImports = visibleItems
    .filter((item) => typeDocNames.has(item.name))
    .map((item) => item.name);
  const primitivePartTypeImports = primitives.flatMap((item) =>
    item.parts
      .map((part) => primitivePartTypeDocName(item.name, part))
      .filter((name) => typeDocNames.has(name)),
  );
  const primitiveImports = primitives
    .filter((item) => item.parts.length > 0)
    .map((item) => item.name);

  return generatedImports({
    typeDocNames: [...typeImports, ...primitivePartTypeImports],
    primitiveDocNames: primitiveImports,
  });
}

function generatedIntegrationImports(typeDocBindings: TypeDocBindings): string {
  const bindings = [...typeDocBindings.values()].sort();
  if (bindings.length === 0) return "";
  return `import { ${bindings.join(", ")} } from "@/generated/integrationTypeDocs";`;
}

function generatedImports({
  typeDocNames,
  primitiveDocNames,
}: {
  typeDocNames: string[];
  primitiveDocNames: string[];
}): string {
  const lines: string[] = [];
  const uniqueTypeDocs = [...new Set(typeDocNames)].sort();
  if (uniqueTypeDocs.length > 0) {
    lines.push(
      `import { ${uniqueTypeDocs.join(", ")} } from "@/generated/typeDocs";`,
    );
  }
  for (const primitiveName of [...new Set(primitiveDocNames)].sort()) {
    lines.push(
      `import { ${primitiveName} as ${primitiveName}Docs } from "@/generated/primitiveDocs";`,
    );
  }
  return lines.join("\n");
}

const PAGE_ORDER_BY_SECTION: Partial<Record<ApiSection, readonly string[]>> = {
  tools: ["toolkits", "component-tools", "rendering", "status"],
  "generative-ui": ["spec", "rendering"],
};

function comparePageSlugs(section: ApiSection, a: string, b: string): number {
  const order = PAGE_ORDER_BY_SECTION[section];
  const aIndex = order?.indexOf(a) ?? -1;
  const bIndex = order?.indexOf(b) ?? -1;
  if (aIndex !== bIndex) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return a.localeCompare(b);
}

function generateSectionOverviewPage(
  section: ApiSection,
  pages: PageSummary[],
  slots: PageSlots,
  title: string,
  description: string,
): string {
  const cards = pages.flatMap((page) => [
    `  <Card title={${JSON.stringify(page.title)}} href={${JSON.stringify(`/docs/api-reference/${section}/${page.slug}`)}}>`,
    `    {${JSON.stringify(page.description)}}`,
    "  </Card>",
  ]);
  return [
    frontmatter(title, description),
    GENERATED_PAGE_MARKER,
    "{/* The page list is generated from exported APIs; edit only the manual prose slot. */}",
    "",
    ...(slots.manual ? [slots.manual, ""] : []),
    "## Pages",
    "",
    "<Cards>",
    ...cards,
    "</Cards>",
    "",
  ].join("\n");
}

function groupedBySectionAndPage(
  exports: ExportInfo[],
): Map<ApiSection, Map<string, ExportInfo[]>> {
  const result = new Map<ApiSection, Map<string, ExportInfo[]>>();
  for (const section of SECTION_ORDER) result.set(section, new Map());
  for (const item of exports) {
    const section = result.get(item.section)!;
    const items = section.get(item.page) ?? [];
    items.push(item);
    section.set(item.page, items);
  }
  for (const pages of result.values()) {
    for (const [page, items] of pages) {
      pages.set(page, sortExportsForPage(items));
    }
  }
  return result;
}

function writeSectionIndex(
  section: ApiSection,
  pages: PageSummary[],
  description: string,
): void {
  fs.writeFileSync(
    path.join(API_REFERENCE_DIR, section, "meta.json"),
    `${JSON.stringify(
      {
        title: sectionTitle(section),
        description,
        pages: ["index", ...pages.map((page) => page.slug)],
      },
      null,
      2,
    )}\n`,
  );
}

function writeSectionOverviewIndex(
  section: ApiSection,
  sectionDir: string,
  pageSummaries: PageSummary[],
  fallbackTitle: string,
): void {
  const indexPath = path.join(sectionDir, "index.mdx");
  const indexAuthored = readAuthoredPageParts(section, "index", []);
  const indexSlots = indexAuthored?.slots ?? emptyPageSlots();
  const indexTitle = authoredTitleOrSeed(
    indexPath,
    indexAuthored?.frontmatter,
    fallbackTitle,
  );
  const indexDescription = authoredDescription(indexAuthored?.frontmatter);
  const indexBody = generateSectionOverviewPage(
    section,
    pageSummaries,
    indexSlots,
    indexTitle,
    indexDescription,
  );
  assertPreservedSlots(indexPath, indexSlots, indexBody);
  fs.writeFileSync(indexPath, indexBody);
  validatePageDescription(indexPath, indexAuthored?.frontmatter, []);
  writeSectionIndex(section, pageSummaries, indexDescription);
}

function writeApiReferenceRoot(): void {
  fs.mkdirSync(API_REFERENCE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(API_REFERENCE_DIR, "meta.json"),
    `${JSON.stringify(
      {
        title: "API Reference",
        pages: ["overview", ...SECTION_ORDER],
      },
      null,
      2,
    )}\n`,
  );
}

function authoredTitleOrSeed(
  filePath: string,
  fm: AuthoredFrontmatter | undefined,
  seed: string,
): string {
  if (fm?.title) return fm.title;
  console.warn(
    `Missing title in ${path.relative(REPO_ROOT, filePath)}. Generated mechanical title: ${seed}`,
  );
  return seed;
}

function authoredDescription(fm: AuthoredFrontmatter | undefined): string {
  return fm?.description?.trim() ?? "";
}

function validatePageDescription(
  filePath: string,
  fm: AuthoredFrontmatter | undefined,
  exports: ExportInfo[],
): void {
  const desc = authoredDescription(fm);
  const primary = exports.find((item) => item.pageRole === "primary");
  if (!desc) {
    console.warn(
      `Missing description in ${path.relative(
        REPO_ROOT,
        filePath,
      )} (new API export: ${primary?.name ?? "?"}).\n` +
        "You must manually write the description frontmatter for new generated pages, matching the style of the other api-reference pages.",
    );
    return;
  }
  const minLen = 50;
  const maxLen = 250;
  if (desc.length < minLen || desc.length > maxLen) {
    console.warn(
      `Description in ${path.relative(
        REPO_ROOT,
        filePath,
      )} is ${desc.length} chars (expected ${minLen}-${maxLen}).`,
    );
  }
}

function pruneGeneratedPage(filePath: string): void {
  let source: string;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return;
    throw error;
  }
  if (source.includes(SKIP_AUTO_GENERATION_MARKER)) return;
  if (source.includes(GENERATED_PAGE_MARKER)) fs.unlinkSync(filePath);
}

function pruneStaleGeneratedPages(
  sectionDir: string,
  expectedSlugs: Set<string>,
): void {
  if (!fs.existsSync(sectionDir)) return;
  for (const entry of fs.readdirSync(sectionDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
    const slug = entry.name.replace(/\.mdx$/, "");
    if (expectedSlugs.has(slug)) continue;
    const filePath = path.join(sectionDir, entry.name);
    pruneGeneratedPage(filePath);
  }
}

export function writeApiReferencePages(
  exports: ExportInfo[],
  typeDocs: Map<string, TypeDoc>,
  integrationsByPackage: Array<{
    slug: string;
    items: ExportInfo[];
    typeDocBindings: TypeDocBindings;
    typeDocNames: Set<string>;
  }>,
): void {
  writeApiReferenceRoot();
  const typeDocNames = new Set(typeDocs.keys());
  const grouped = groupedBySectionAndPage(exports);

  for (const section of REACT_API_SECTIONS) {
    const sectionDir = path.join(API_REFERENCE_DIR, section);
    fs.mkdirSync(sectionDir, { recursive: true });

    const pages = [...(grouped.get(section) ?? new Map()).entries()]
      .filter(([, items]) => items.some((item) => item.pageRole === "primary"))
      .sort(([a], [b]) => comparePageSlugs(section, a, b));

    const pageSummaries: PageSummary[] = [];

    for (const [slug, items] of pages) {
      const filePath = path.join(sectionDir, `${slug}.mdx`);
      const authored = readAuthoredPageParts(section, slug, items);
      const title = authoredTitleOrSeed(
        filePath,
        authored?.frontmatter,
        titleForPage(slug, items),
      );
      const description = authoredDescription(authored?.frontmatter);
      pageSummaries.push({ slug, title, description });

      if (authored?.skipAutoGeneration) {
        console.log(
          `Skipping auto-generation for API page: ${path.relative(REPO_ROOT, filePath)}`,
        );
        continue;
      }

      const slots = authored?.slots ?? emptyPageSlots();
      // A primitive page is anchored by exactly one primary primitive; any
      // other exports on the page (related helpers, supporting types) render
      // as companions after the primitive's parts. This keeps the parts-table
      // layout while letting a part-bound helper share the page.
      const primitivePrimaries =
        section === "primitives"
          ? items.filter((item) => item.pageRole === "primary")
          : [];
      const primitivePrimary =
        primitivePrimaries.length === 1 ? primitivePrimaries[0] : undefined;
      const body = primitivePrimary
        ? generatePrimitivePage(
            primitivePrimary,
            items.filter((item) => item !== primitivePrimary),
            typeDocNames,
            slots,
            title,
            description,
          )
        : generateApiPage({
            title,
            description,
            imports: generatedImportsForPage(items, typeDocNames),
            slots,
            reference: generateReferenceRegion(items, typeDocNames, slots),
          });

      assertPreservedSlots(filePath, slots, body);
      fs.writeFileSync(filePath, body);
      validatePageDescription(filePath, authored?.frontmatter, items);
    }

    writeSectionOverviewIndex(
      section,
      sectionDir,
      pageSummaries,
      `${sectionTitle(section)} API Reference`,
    );
    pruneStaleGeneratedPages(
      sectionDir,
      new Set(["index", ...pageSummaries.map((page) => page.slug)]),
    );
  }

  writeIntegrationPages(integrationsByPackage);
}

function writeIntegrationPages(
  integrationsByPackage: Array<{
    slug: string;
    items: ExportInfo[];
    typeDocBindings: TypeDocBindings;
    typeDocNames: Set<string>;
  }>,
): void {
  const section: ApiSection = "integrations";
  const sectionDir = path.join(API_REFERENCE_DIR, section);
  fs.mkdirSync(sectionDir, { recursive: true });

  const integrationBySlug = new Map(
    INTEGRATION_PACKAGES.map((p) => [p.slug, p]),
  );

  const pageSummaries: PageSummary[] = [];

  for (const {
    slug,
    items,
    typeDocBindings,
    typeDocNames,
  } of integrationsByPackage) {
    const integration = integrationBySlug.get(slug);
    if (!integration) continue;
    const filePath = path.join(sectionDir, `${integration.slug}.mdx`);
    const authored = readAuthoredPageParts(section, integration.slug, items);
    const slots = authored?.slots ?? emptyPageSlots();
    const title = authoredTitleOrSeed(
      filePath,
      authored?.frontmatter,
      integration.packageName,
    );
    const description = authoredDescription(authored?.frontmatter);
    pageSummaries.push({ slug: integration.slug, title, description });
    const reference = generateReferenceRegion(
      items,
      typeDocNames,
      slots,
      typeDocBindings,
    );
    const body = generateApiPage({
      title,
      description,
      imports: generatedIntegrationImports(typeDocBindings),
      slots,
      reference,
    });
    assertPreservedSlots(filePath, slots, body);
    fs.writeFileSync(filePath, body);
    validatePageDescription(filePath, authored?.frontmatter, items);
  }

  writeSectionOverviewIndex(
    section,
    sectionDir,
    pageSummaries,
    "Integrations API Reference",
  );

  pruneStaleGeneratedPages(
    sectionDir,
    new Set([
      "index",
      ...INTEGRATION_PACKAGES.map((integration) => integration.slug),
    ]),
  );
}

function hasRenderableContent(
  item: ExportInfo,
  typeDocNames: Set<string>,
): boolean {
  return Boolean(
    item.jsDoc ||
    item.jsDocExamples?.length ||
    item.deprecated ||
    item.signature ||
    typeDocNames.has(item.name),
  );
}

export function printClassificationDiagnostics(
  exports: ExportInfo[],
  typeDocs: Map<string, TypeDoc>,
): void {
  const typeDocNames = new Set(typeDocs.keys());
  const ruleCounts = new Map<string, number>();
  const renderedFallbacks: ExportInfo[] = [];
  let hiddenFallbackCount = 0;
  let fallbackSupportingTypeCount = 0;
  for (const item of exports) {
    ruleCounts.set(
      item.classificationRule,
      (ruleCounts.get(item.classificationRule) ?? 0) + 1,
    );
    if (item.classificationConfidence !== "fallback") continue;
    if (item.pageRole === "supporting-type") {
      fallbackSupportingTypeCount += 1;
    } else if (hasRenderableContent(item, typeDocNames)) {
      renderedFallbacks.push(item);
    } else {
      hiddenFallbackCount += 1;
    }
  }
  console.log("API reference classification rules:");
  for (const [rule, count] of [...ruleCounts.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.log(`  ${rule}: ${count}`);
  }
  // Only rendered fallbacks are actionable (they show up in the junk drawer and
  // want a real home); list them with source paths. Hidden fallbacks (no
  // rendered content) and supporting types are collapsed to a count.
  if (renderedFallbacks.length > 0) {
    console.log("Fallback-classified exports needing a home:");
    for (const item of renderedFallbacks.sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      console.log(`  ${item.name} (${item.sourcePath ?? "unknown source"})`);
    }
  }
  if (hiddenFallbackCount > 0) {
    console.log(
      `Fallback-classified exports with no rendered content: ${hiddenFallbackCount}`,
    );
  }
  if (fallbackSupportingTypeCount > 0) {
    console.log(
      `Fallback-classified supporting types: ${fallbackSupportingTypeCount}`,
    );
  }
  if (process.env.API_REFERENCE_CLASSIFICATION_VERBOSE === "1") {
    console.log("API reference export classifications:");
    for (const item of [...exports].sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      console.log(
        `  ${item.name}: ${item.section}/${item.page} (${item.pageRole}, ${item.classificationRule})`,
      );
    }
  }
}
