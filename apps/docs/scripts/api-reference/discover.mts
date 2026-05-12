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

type ExportBuilder = (input: DiscoveredExportInput) => ExportInfo | undefined;

function collectExports(
  entryPath: string,
  buildExport: ExportBuilder,
): ExportInfo[] {
  const project = getProject();
  const sourceFile =
    project.getSourceFile(entryPath) ?? project.addSourceFileAtPath(entryPath);
  const seen = new Set<string>();
  const exports: ExportInfo[] = [];

  const addExport = (input: DiscoveredExportInput) => {
    if (seen.has(input.name) || IGNORED_EXPORTS.has(input.name)) return;
    const info = buildExport(input);
    if (!info) return;
    seen.add(input.name);
    exports.push(info);
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

export function discoverExports(): ExportInfo[] {
  return collectExports(REACT_INDEX, ({ name, resolved, deprecated }) => {
    const sourcePath = relativeToRepo(resolved?.getSourceFile().getFilePath());
    const docs = extractJsDoc(resolved);
    const kind = classifyKind(resolved, name);
    const placement = classifyExport({ name, kind, sourcePath });
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
  });
}

export function discoverIntegrationExports(
  entryPath: string,
  page: string,
): ExportInfo[] {
  return collectExports(entryPath, ({ name, resolved, deprecated }) => {
    const sourcePath = relativeToRepo(resolved?.getSourceFile().getFilePath());
    const kind = classifyKind(resolved, name);
    if (kind === "interface" || kind === "type") return undefined;
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
