import {
  Node,
  type ExportDeclaration,
  type ExportSpecifier,
  type Node as TsNode,
} from "ts-morph";
import * as path from "node:path";
import { REACT_INDEX, REPO_ROOT } from "./paths.mts";
import { classifyExport } from "./classify.mts";
import {
  chooseDeclaration,
  extractJsDoc,
  extractSignature,
  getProject,
  setJsDocLinkResolver,
} from "./extract.mts";

export type ApiSection =
  | "tools"
  | "model-context"
  | "transport"
  | "external-store"
  | "voice"
  | "primitives"
  | "hooks"
  | "adapters"
  | "runtimes"
  | "context-providers"
  | "integrations"
  | "utilities";

export type ExportKind =
  | "class"
  | "component"
  | "function"
  | "interface"
  | "namespace"
  | "type"
  | "value";

export type ExportInfo = {
  name: string;
  section: ApiSection;
  kind: ExportKind;
  page: string;
  pageRole: "primary" | "related" | "supporting-type";
  sourcePath?: string;
  jsDoc?: string;
  deprecated?: string;
  signature?: string;
  classificationRule: string;
  classificationConfidence: "strong" | "medium" | "fallback";
  classificationReason: string;
};

export const SECTION_ORDER = [
  "tools",
  "model-context",
  "transport",
  "external-store",
  "voice",
  "primitives",
  "hooks",
  "adapters",
  "runtimes",
  "context-providers",
  "integrations",
  "utilities",
] as const satisfies readonly ApiSection[];

export const REACT_API_SECTIONS = SECTION_ORDER.filter(
  (section) => section !== "integrations",
);

const IGNORED_EXPORTS = new Set([
  "AssistantEventCallback",
  "AssistantEventName",
  "AssistantEventPayload",
  "AssistantEventScope",
  "AssistantEventSelector",
  "AssistantState",
  "DevToolsProviderApi",
  "FrameMessageType",
  "LanguageModelV1CallSettings",
  "Unstable_UseMentionAdapterOptions",
  "Unstable_UseSlashCommandAdapterOptions",
]);

type ExportEntry = {
  name: string;
  exportNode: ExportDeclaration;
  specifier?: ExportSpecifier;
};

function getExportEntries(decl: ExportDeclaration): ExportEntry[] {
  const namespaceExport = decl.getNamespaceExport();
  if (namespaceExport) {
    return [{ name: namespaceExport.getName(), exportNode: decl }];
  }
  return decl.getNamedExports().map((specifier) => ({
    name: specifier.getAliasNode()?.getText() ?? specifier.getName(),
    exportNode: decl,
    specifier,
  }));
}

function classifyKind(node: TsNode | undefined, name: string): ExportKind {
  if (!node) return "value";
  if (Node.isClassDeclaration(node)) return "class";
  if (name.endsWith("Provider")) return "component";
  if (Node.isInterfaceDeclaration(node)) return "interface";
  if (Node.isTypeAliasDeclaration(node)) return "type";
  if (Node.isFunctionDeclaration(node)) return "function";
  if (Node.isModuleDeclaration(node)) return "namespace";
  if (Node.isVariableDeclaration(node)) {
    if (/^[A-Z]/.test(name)) return "component";
    if (/^(unstable_)?use[A-Z]/.test(name)) return "function";
  }
  if (Node.isBindingElement(node) && /^(unstable_)?use[A-Z]/.test(name)) {
    return "function";
  }
  return "value";
}

function resolveDeclaration(entry: ExportEntry): TsNode | undefined {
  const symbols = [
    entry.specifier?.getSymbol()?.getAliasedSymbol(),
    entry.specifier?.getSymbol(),
    entry.exportNode.getNamespaceExport()?.getSymbol()?.getAliasedSymbol(),
    entry.exportNode.getNamespaceExport()?.getSymbol(),
  ];
  for (const symbol of symbols) {
    const declaration = chooseDeclaration(symbol?.getDeclarations() ?? []);
    if (declaration) return declaration;
  }
  return undefined;
}

function getLeadingCommentText(node: TsNode): string {
  return node
    .getLeadingCommentRanges()
    .map((range) => range.getText())
    .join("\n");
}

function exportEntryDeprecated(entry: ExportEntry): string | undefined {
  const comments = [
    entry.specifier ? getLeadingCommentText(entry.specifier) : "",
    getLeadingCommentText(entry.exportNode),
  ].join("\n");
  if (!comments.includes("@deprecated")) return undefined;
  return comments.match(/@deprecated\s+([^*\n]+)/)?.[1]?.trim() || "true";
}

function relativeToRepo(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  return path.relative(REPO_ROOT, filePath);
}

type DiscoveredExportInput = {
  name: string;
  resolved: TsNode | undefined;
  deprecated?: string;
};

type ClassifiedExportInput = DiscoveredExportInput & {
  sourcePath?: string;
  kind: ExportKind;
  placement: ReturnType<typeof classifyExport>;
};

type ApiReferenceLinkItem = Pick<ExportInfo, "name" | "section" | "page">;

function collectExportInputs(entryPath: string): DiscoveredExportInput[] {
  const project = getProject();
  const sourceFile =
    project.getSourceFile(entryPath) ?? project.addSourceFileAtPath(entryPath);
  const seen = new Set<string>();
  const exports: DiscoveredExportInput[] = [];

  const addExport = (input: DiscoveredExportInput) => {
    if (seen.has(input.name) || IGNORED_EXPORTS.has(input.name)) return;
    seen.add(input.name);
    exports.push(input);
  };

  for (const decl of sourceFile.getExportDeclarations()) {
    for (const entry of getExportEntries(decl)) {
      addExport({
        name: entry.name,
        resolved: resolveDeclaration(entry),
        deprecated: exportEntryDeprecated(entry),
      });
    }
  }
  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    addExport({ name, resolved: chooseDeclaration(declarations) });
  }
  return exports.sort((a, b) => a.name.localeCompare(b.name));
}

function headingAnchor(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

function apiReferenceHref(item: Pick<ExportInfo, "section" | "page" | "name">) {
  return `/docs/api-reference/${item.section}/${item.page}#${headingAnchor(item.name)}`;
}

function cleanLinkTarget(target: string): string {
  return target.trim().replace(/^`|`$/g, "").replace(/\(\)$/, "");
}

function createApiReferenceLinkResolver(items: ApiReferenceLinkItem[]) {
  const itemByName = new Map(items.map((item) => [item.name, item]));
  return (target: string): string | undefined => {
    const item = itemByName.get(cleanLinkTarget(target));
    return item ? apiReferenceHref(item) : undefined;
  };
}

function classifyExportInputs(
  inputs: DiscoveredExportInput[],
): ClassifiedExportInput[] {
  return inputs.map((input) => {
    const sourcePath = relativeToRepo(
      input.resolved?.getSourceFile().getFilePath(),
    );
    const kind = classifyKind(input.resolved, input.name);
    const placement = classifyExport({ name: input.name, kind, sourcePath });
    return { ...input, sourcePath, kind, placement };
  });
}

function linkItemsFor(inputs: ClassifiedExportInput[]): ApiReferenceLinkItem[] {
  return inputs
    .filter((item) => item.placement.role !== "supporting-type")
    .map((item) => ({
      name: item.name,
      section: item.placement.section,
      page: item.placement.page,
    }));
}

let reactApiLinkItems: ApiReferenceLinkItem[] | undefined;

function getReactApiLinkItems(): ApiReferenceLinkItem[] {
  reactApiLinkItems ??= linkItemsFor(
    classifyExportInputs(collectExportInputs(REACT_INDEX)),
  );
  return reactApiLinkItems;
}

function buildReactExportInfo({
  name,
  resolved,
  deprecated,
  sourcePath,
  kind,
  placement,
}: ClassifiedExportInput): ExportInfo {
  const docs = extractJsDoc(resolved);
  const signature = extractSignature(resolved, name);
  return {
    name,
    section: placement.section,
    kind,
    page: placement.page,
    pageRole: placement.role,
    sourcePath,
    jsDoc: docs.jsDoc,
    deprecated: deprecated ?? docs.deprecated,
    signature,
    classificationRule: placement.rule,
    classificationConfidence: placement.confidence,
    classificationReason: placement.reason,
  };
}

export function discoverExports(): ExportInfo[] {
  const inputs = classifyExportInputs(collectExportInputs(REACT_INDEX));
  reactApiLinkItems = linkItemsFor(inputs);
  setJsDocLinkResolver(createApiReferenceLinkResolver(reactApiLinkItems));
  return inputs.map(buildReactExportInfo);
}

export function discoverIntegrationExports(
  entryPath: string,
  page: string,
): ExportInfo[] {
  const inputs = classifyExportInputs(collectExportInputs(entryPath)).filter(
    ({ kind }) => kind !== "interface" && kind !== "type",
  );

  setJsDocLinkResolver(
    createApiReferenceLinkResolver([
      ...getReactApiLinkItems(),
      ...linkItemsFor(inputs),
    ]),
  );

  return inputs.map(({ name, resolved, deprecated, sourcePath, kind }) => {
    const docs = extractJsDoc(resolved);
    const signature = extractSignature(resolved, name);
    return {
      name,
      section: "integrations",
      kind,
      page,
      pageRole: "primary",
      sourcePath,
      jsDoc: docs.jsDoc,
      deprecated: deprecated ?? docs.deprecated,
      signature,
      classificationRule: "integration:package",
      classificationConfidence: "strong",
      classificationReason: "package-level integration export",
    };
  });
}
