import {
  Node,
  type ExportDeclaration,
  type ExportSpecifier,
  type Node as TsNode,
} from "ts-morph";
import * as path from "node:path";
import {
  REACT_GENERATIVE_UI_INDEX,
  REACT_GENERATIVE_UI_SLACK_INDEX,
  REACT_INDEX,
  REPO_ROOT,
} from "./paths.mts";
import {
  GENERATIVE_UI_PACKAGE_EXPORTS,
  classifyExport,
  relatedOrSupportingRole,
} from "./classify.mts";
import {
  chooseDeclaration,
  extractJsDoc,
  extractSignature,
  getAllExportedNames,
  getProject,
  renderJsDocLinks,
  type JsDocRenderOptions,
} from "./extract.mts";

export type ApiSection =
  | "tools"
  | "model-context"
  | "transport"
  | "external-store"
  | "voice"
  | "generative-ui"
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
  sourcePath?: string | undefined;
  jsDoc?: string | undefined;
  jsDocExamples?: string[] | undefined;
  deprecated?: string | undefined;
  signature?: string | undefined;
  classificationRule: string;
  classificationConfidence: "strong" | "medium" | "fallback";
  classificationReason: string;
  jsDocRenderOptions?: JsDocRenderOptions;
};

export const SECTION_ORDER = [
  "tools",
  "model-context",
  "transport",
  "external-store",
  "voice",
  "generative-ui",
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
  deprecated?: string | undefined;
};

type ClassifiedExportInput = DiscoveredExportInput & {
  sourcePath?: string | undefined;
  kind: ExportKind;
  placement: ReturnType<typeof classifyExport>;
};

type ApiReferenceLinkItem = Pick<ExportInfo, "name" | "section" | "page">;

const MANUAL_API_REFERENCE_LINKS = new Map([
  [
    "AISDKToolkit",
    "/docs/api-reference/integrations/react-ai-sdk#aisdktoolkit",
  ],
  [
    "JSONGenerativeUI.present",
    "/docs/api-reference/generative-ui/json-generative-ui#jsongenerativeui",
  ],
  [
    "JSONGenerativeUI.promptUser",
    "/docs/api-reference/generative-ui/json-generative-ui#jsongenerativeui",
  ],
  [
    "AssistantState",
    "/docs/api-reference/primitives/assistant-if#assistantstate",
  ],
]);

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
    const name = cleanLinkTarget(target);
    const manualHref = MANUAL_API_REFERENCE_LINKS.get(name);
    if (manualHref) return manualHref;

    const item = itemByName.get(name);
    return item ? apiReferenceHref(item) : undefined;
  };
}

/** Predicate over every discovered export name — including supporting types
 *  that get no standalone anchor. Lets the JSDoc renderer tell a legitimately
 *  anchorless reference apart from a broken link (see JsDocRenderOptions).
 *  Closes over the caller's (already cached) set rather than copying it. */
function createKnownExportPredicate(
  known: ReadonlySet<string>,
): (target: string) => boolean {
  return (target: string): boolean => known.has(cleanLinkTarget(target));
}

function isBetterDonor(
  candidate: ClassifiedExportInput,
  current: ClassifiedExportInput,
): boolean {
  const primary = (item: ClassifiedExportInput) =>
    item.placement.role === "primary" ? 0 : 1;
  if (primary(candidate) !== primary(current)) {
    return primary(candidate) < primary(current);
  }
  const strong = (item: ClassifiedExportInput) =>
    item.placement.confidence === "strong" ? 0 : 1;
  if (strong(candidate) !== strong(current)) {
    return strong(candidate) < strong(current);
  }
  return candidate.name.localeCompare(current.name) < 0;
}

function classifyExportInputs(
  inputs: DiscoveredExportInput[],
): ClassifiedExportInput[] {
  const classified = inputs.map((input) => {
    const sourcePath = relativeToRepo(
      input.resolved?.getSourceFile().getFilePath(),
    );
    const kind = classifyKind(input.resolved, input.name);
    const placement = classifyExport({ name: input.name, kind, sourcePath });
    return { ...input, sourcePath, kind, placement };
  });

  // Unplaceable exports inherit a confidently-classified file-mate's location.
  const donorBySource = new Map<string, ClassifiedExportInput>();
  for (const item of classified) {
    if (!item.sourcePath || item.placement.confidence === "fallback") continue;
    const current = donorBySource.get(item.sourcePath);
    if (!current || isBetterDonor(item, current)) {
      donorBySource.set(item.sourcePath, item);
    }
  }

  return classified.map((item) => {
    if (item.placement.confidence !== "fallback" || !item.sourcePath) {
      return item;
    }
    const donor = donorBySource.get(item.sourcePath);
    if (!donor) return item;
    return {
      ...item,
      placement: {
        ...donor.placement,
        role: relatedOrSupportingRole(item.kind),
        rule: "fallback:co-location",
        confidence: "medium",
        reason: `inherited from co-located ${donor.name}`,
      },
    };
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

let reactApiInputs: ClassifiedExportInput[] | undefined;
let reactGenerativeUIApiInputs: ClassifiedExportInput[] | undefined;
let mainApiInputs: ClassifiedExportInput[] | undefined;
let mainApiLinkItems: ApiReferenceLinkItem[] | undefined;
let reactApiRenderOptions: JsDocRenderOptions | undefined;

function getReactApiInputs(): ClassifiedExportInput[] {
  reactApiInputs ??= classifyExportInputs(collectExportInputs(REACT_INDEX));
  return reactApiInputs;
}

function getReactGenerativeUIApiInputs(): ClassifiedExportInput[] {
  reactGenerativeUIApiInputs ??= classifyExportInputs([
    ...collectExportInputs(REACT_GENERATIVE_UI_INDEX),
    ...collectExportInputs(REACT_GENERATIVE_UI_SLACK_INDEX),
  ]).filter((item) => GENERATIVE_UI_PACKAGE_EXPORTS.has(item.name));
  return reactGenerativeUIApiInputs;
}

function getMainApiInputs(): ClassifiedExportInput[] {
  mainApiInputs ??= [
    ...getReactApiInputs(),
    ...getReactGenerativeUIApiInputs(),
  ];
  return mainApiInputs;
}

function getMainApiLinkItems(): ApiReferenceLinkItem[] {
  mainApiLinkItems ??= linkItemsFor(getMainApiInputs());
  return mainApiLinkItems;
}

/** Bundled JSDoc render options (link resolver + known-export predicate) for
 *  the react public API, lazily built once. Reused by the primitive-docs
 *  generator so primitive prop JSDoc links resolve the same way the
 *  api-reference pass resolves them. */
export function getReactApiRenderOptions(): JsDocRenderOptions {
  reactApiRenderOptions ??= {
    linkResolver: createApiReferenceLinkResolver(getMainApiLinkItems()),
    isKnownExport: createKnownExportPredicate(getAllExportedNames()),
  };
  return reactApiRenderOptions;
}

function buildExportInfo(
  {
    name,
    resolved,
    deprecated,
    sourcePath,
    kind,
    placement,
  }: ClassifiedExportInput,
  renderOptions: JsDocRenderOptions,
  overrides: Partial<
    Pick<
      ExportInfo,
      | "section"
      | "page"
      | "pageRole"
      | "classificationRule"
      | "classificationConfidence"
      | "classificationReason"
    >
  > = {},
): ExportInfo {
  const docs = extractJsDoc(resolved, renderOptions);
  const signature = extractSignature(resolved, name);
  const resolvedDeprecated = deprecated
    ? renderJsDocLinks(deprecated, `${name} export @deprecated`, renderOptions)
    : docs.deprecated;
  return {
    name,
    section: overrides.section ?? placement.section,
    kind,
    page: overrides.page ?? placement.page,
    pageRole: overrides.pageRole ?? placement.role,
    sourcePath,
    jsDoc: docs.jsDoc,
    jsDocExamples: docs.examples,
    deprecated: resolvedDeprecated,
    signature,
    classificationRule: overrides.classificationRule ?? placement.rule,
    classificationConfidence:
      overrides.classificationConfidence ?? placement.confidence,
    classificationReason: overrides.classificationReason ?? placement.reason,
    jsDocRenderOptions: renderOptions,
  };
}

export function discoverExports(): ExportInfo[] {
  const inputs = getMainApiInputs();
  const renderOptions = getReactApiRenderOptions();
  return inputs.map((input) => buildExportInfo(input, renderOptions));
}

export function discoverIntegrationExports(
  entryPath: string,
  page: string,
): ExportInfo[] {
  const inputs = classifyExportInputs(collectExportInputs(entryPath)).filter(
    ({ kind }) => kind !== "interface" && kind !== "type",
  );
  // Links resolve to where these exports render — their integration page — not
  // to the raw placement buildExportInfo overrides below.
  const renderOptions: JsDocRenderOptions = {
    linkResolver: createApiReferenceLinkResolver([
      ...getMainApiLinkItems(),
      // inputs already excludes interface/type kinds (the only ones that ever
      // get a "supporting-type" role), so every entry here renders on the page.
      ...inputs.map((item) => ({
        name: item.name,
        section: "integrations" as const,
        page,
      })),
    ]),
    isKnownExport: createKnownExportPredicate(getAllExportedNames()),
  };

  return inputs.map((input) =>
    buildExportInfo(input, renderOptions, {
      section: "integrations",
      page,
      pageRole: "primary",
      classificationRule: "integration:package",
      classificationConfidence: "strong",
      classificationReason: "package-level integration export",
    }),
  );
}
