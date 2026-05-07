import {
  Node,
  Project,
  SyntaxKind,
  type ExportDeclaration,
  type ExportSpecifier,
  type JSDoc,
  type Node as TsNode,
} from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";

const REACT_INDEX = path.resolve("../../packages/react/src/index.ts");
const API_REFERENCE_DIR = path.resolve(
  "./content/docs/(reference)/api-reference",
);
const REPO_ROOT = path.resolve("../..");

type Category = "hooks" | "adapters" | "providers" | "runtimes" | "primitives";

type ExportKind =
  | "class"
  | "component"
  | "function"
  | "interface"
  | "namespace"
  | "type"
  | "value";

type ExportInfo = {
  name: string;
  category: Category;
  kind: ExportKind;
  page: string | undefined;
  pageRole: "primary" | "related";
  sourcePath: string | undefined;
  jsDoc: string | undefined;
  deprecated: string | undefined;
  documented: boolean;
  references: string[];
  compositionReferences: string[];
  referencedBy: string[];
};

type PageGroup = {
  page: string;
  exports: ExportInfo[];
};

type DocPlacement = {
  page: string;
  role: ExportInfo["pageRole"];
};

type ExportEntry = {
  name: string;
  exportNode: ExportDeclaration;
  specifier: ExportSpecifier | undefined;
};

const CATEGORY_LABELS: Record<Category, string> = {
  hooks: "Hooks",
  adapters: "Adapters",
  providers: "Providers",
  runtimes: "Runtime/state types",
  primitives: "Primitives",
};

const IGNORED_EXPORTS = new Set([
  "AssistantIf",
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

const RELATIONSHIP_NOISE_EXPORTS = new Set([
  // Foundation hooks appear in almost every implementation. They are useful as
  // API entries, but not as graph edges.
  "useAui",
  "useAuiState",
  "useAuiEvent",
  "useRuntimeAdapters",
  "useThreadViewportStore",
]);

function relative(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  return path.relative(REPO_ROOT, filePath);
}

function getExportEntries(decl: ExportDeclaration): ExportEntry[] {
  const namespaceExport = decl.getNamespaceExport();
  if (namespaceExport) {
    return [
      {
        name: namespaceExport.getName(),
        exportNode: decl,
        specifier: undefined,
      },
    ];
  }

  return decl.getNamedExports().map((named) => {
    const alias = named.getAliasNode()?.getText();
    return {
      name: alias ?? named.getName(),
      exportNode: decl,
      specifier: named,
    };
  });
}

function classifyExport(name: string): Category | undefined {
  if (name.endsWith("Primitive")) return "primitives";
  if (/^(unstable_)?use[A-Z]/.test(name)) return "hooks";
  if (name.endsWith("Provider")) return "providers";
  if (/Adapter(s)?$/.test(name)) return "adapters";
  if (/(Runtime|State)$/.test(name)) return "runtimes";
  return undefined;
}

function inferDocPlacement(
  name: string,
  category: Category,
  sourcePath?: string,
): DocPlacement {
  const source = sourcePath ?? "";
  if (category === "primitives") return { page: "primitives", role: "primary" };

  if (category === "hooks") {
    if (["useAui", "useAuiState", "useAuiEvent"].includes(name)) {
      return { page: "hooks/state", role: "primary" };
    }
    if (/use.*Runtime$/.test(name)) {
      return { page: "hooks/runtimes", role: "primary" };
    }
    if (source.includes("assistant-transport")) {
      return { page: "hooks/assistant-transport", role: "primary" };
    }
    if (source.includes("voice") || name.includes("Voice")) {
      return { page: "hooks/voice", role: "primary" };
    }
    if (name.includes("Interactable") || name.includes("ToolArgs")) {
      return { page: "hooks/interactables", role: "primary" };
    }
    if (
      name.includes("AssistantTool") ||
      name.includes("AssistantData") ||
      name.includes("AssistantInstructions") ||
      name.includes("AssistantContext") ||
      name.includes("InlineRender")
    ) {
      return { page: "hooks/model-context", role: "primary" };
    }
    return { page: "hooks/utilities", role: "primary" };
  }

  if (category === "adapters") {
    if (name.includes("Attachment")) {
      return { page: "adapters/attachments", role: "primary" };
    }
    if (
      name.includes("Thread") ||
      name.includes("History") ||
      name.includes("ExternalStore") ||
      name.includes("MessageFormat")
    ) {
      return { page: "adapters/persistence", role: "primary" };
    }
    if (name.includes("Speech") || name.includes("Dictation")) {
      return { page: "adapters/feedback-speech", role: "primary" };
    }
    if (name.includes("Voice"))
      return { page: "adapters/voice", role: "primary" };
    if (name.includes("Suggestion")) {
      return { page: "adapters/suggestions", role: "primary" };
    }
    if (name.includes("RuntimeAdapter")) {
      return { page: "adapters/runtime", role: "primary" };
    }
    return { page: "adapters", role: "primary" };
  }

  if (category === "providers") {
    if (name === "AssistantRuntimeProvider") {
      return {
        page: "context-providers/assistant-runtime-provider",
        role: "primary",
      };
    }
    if (name === "AuiProvider") {
      return {
        page: "context-providers/assistant-runtime-provider",
        role: "related",
      };
    }
    if (name.includes("Frame")) {
      return {
        page: "context-providers/assistant-frame-provider",
        role: "primary",
      };
    }
    if (name.includes("ModelContext")) {
      return {
        page: "context-providers/model-context-provider",
        role: "primary",
      };
    }
    if (
      name.includes("ByIndexProvider") ||
      name === "RuntimeAdapterProvider" ||
      name === "ThreadListItemRuntimeProvider"
    ) {
      return { page: "context-providers/scoped-providers", role: "related" };
    }
    return { page: "context-providers/scoped-providers", role: "primary" };
  }

  if (category === "runtimes") {
    if (name.includes("Assistant")) {
      return { page: "runtimes/assistant-runtime", role: "primary" };
    }
    if (name.includes("ThreadListItem")) {
      return { page: "runtimes/thread-list-item-runtime", role: "primary" };
    }
    if (name.includes("ThreadList")) {
      return { page: "runtimes/thread-list-runtime", role: "primary" };
    }
    if (name.includes("Thread")) {
      return { page: "runtimes/thread-runtime", role: "primary" };
    }
    if (name.includes("Composer")) {
      return { page: "runtimes/composer-runtime", role: "primary" };
    }
    if (name.includes("MessagePart")) {
      return { page: "runtimes/message-part-runtime", role: "primary" };
    }
    if (name.includes("Message")) {
      return { page: "runtimes/message-runtime", role: "primary" };
    }
    if (name.includes("Attachment")) {
      return { page: "runtimes/attachment-runtime", role: "primary" };
    }
    if (name.includes("Voice")) {
      return { page: "runtimes/voice-state", role: "primary" };
    }
    if (name.includes("Dictation")) {
      return { page: "runtimes/dictation-state", role: "primary" };
    }
    if (name.includes("Queue")) {
      return { page: "runtimes/queue-state", role: "primary" };
    }
  }

  return { page: category, role: "primary" };
}

function getJsDocCommentText(doc: JSDoc): string | undefined {
  const comment = doc.getComment();
  let text: string | undefined;
  if (typeof comment === "string") {
    text = comment;
  } else if (Array.isArray(comment)) {
    text = comment.map((part) => part.getText()).join("");
  }
  return text?.trim() || undefined;
}

function extractJsDoc(node: TsNode | undefined): {
  jsDoc: string | undefined;
  deprecated: string | undefined;
} {
  if (!node) return { jsDoc: undefined, deprecated: undefined };

  const getDocs = (target: TsNode): JSDoc[] => {
    if (
      Node.isInterfaceDeclaration(target) ||
      Node.isTypeAliasDeclaration(target) ||
      Node.isClassDeclaration(target) ||
      Node.isFunctionDeclaration(target) ||
      Node.isVariableStatement(target)
    ) {
      return target.getJsDocs();
    }
    if (Node.isVariableDeclaration(target)) {
      return target.getVariableStatement()?.getJsDocs() ?? [];
    }
    return [];
  };

  const docs = getDocs(node);
  const doc = docs[0];
  const jsDoc = doc ? getJsDocCommentText(doc) : undefined;
  const deprecated = doc
    ?.getTags()
    .find((tag) => tag.getTagName() === "deprecated")
    ?.getComment()
    ?.toString()
    .trim();

  return { jsDoc, deprecated };
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

  const match = comments.match(/@deprecated\s+([^*\n]+)/);
  return match?.[1]?.trim() || "true";
}

function classifyKind(node: TsNode | undefined, name: string): ExportKind {
  if (!node) return "value";
  if (name.endsWith("Provider")) return "component";
  if (Node.isClassDeclaration(node)) return "class";
  if (Node.isInterfaceDeclaration(node)) return "interface";
  if (Node.isTypeAliasDeclaration(node)) return "type";
  if (Node.isFunctionDeclaration(node)) return "function";
  if (Node.isModuleDeclaration(node)) return "namespace";
  if (Node.isVariableDeclaration(node)) {
    if (/^[A-Z]/.test(name)) return "component";
    if (/^use[A-Z]/.test(name)) return "function";
  }
  return "value";
}

function resolveDeclaration(entry: ExportEntry): TsNode | undefined {
  const symbol =
    entry.specifier?.getSymbol()?.getAliasedSymbol() ??
    entry.specifier?.getSymbol() ??
    entry.exportNode.getNamespaceExport()?.getSymbol()?.getAliasedSymbol() ??
    entry.exportNode.getNamespaceExport()?.getSymbol();

  const resolved = symbol?.getDeclarations()[0];
  if (!resolved) return undefined;
  if (Node.isExportSpecifier(resolved)) {
    return resolved.getSymbol()?.getAliasedSymbol()?.getDeclarations()[0];
  }
  return resolved;
}

function readMdxFiles(dir: string): string {
  let content = "";
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      content += readMdxFiles(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      content += `\n${fs.readFileSync(entryPath, "utf8")}`;
    }
  }
  return content;
}

function isMentioned(content: string, name: string): boolean {
  return new RegExp(
    `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
  ).test(content);
}

function discoverExports(project: Project, docsContent: string): ExportInfo[] {
  const sourceFile = project.addSourceFileAtPath(REACT_INDEX);
  const exports: ExportInfo[] = [];
  const seen = new Set<string>();

  const addExport = ({
    name,
    resolved,
    deprecated,
  }: {
    name: string;
    resolved: TsNode | undefined;
    deprecated?: string | undefined;
  }) => {
    if (seen.has(name)) return;
    if (IGNORED_EXPORTS.has(name)) return;
    const category = classifyExport(name);
    if (!category) return;

    const { jsDoc, deprecated: declarationDeprecated } = extractJsDoc(resolved);
    const sourcePath = relative(resolved?.getSourceFile().getFilePath());
    const kind = classifyKind(resolved, name);
    const placement = inferDocPlacement(name, category, sourcePath);

    seen.add(name);
    exports.push({
      name,
      category,
      kind,
      page: placement.page,
      pageRole: placement.role,
      sourcePath,
      jsDoc,
      deprecated: deprecated ?? declarationDeprecated,
      documented: isMentioned(docsContent, name),
      references: [],
      compositionReferences: [],
      referencedBy: [],
    });
  };

  for (const decl of sourceFile.getExportDeclarations()) {
    for (const entry of getExportEntries(decl)) {
      const { name } = entry;
      const resolved = resolveDeclaration(entry);
      addExport({
        name,
        resolved,
        deprecated: exportEntryDeprecated(entry),
      });
    }
  }

  // Include star exports such as `export * from "./context"` that don't appear
  // as named export specifiers in the barrel but are still part of the public
  // package surface.
  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    addExport({ name, resolved: declarations[0] });
  }

  return exports.sort((a, b) => a.name.localeCompare(b.name));
}

function declarationForExport(
  project: Project,
  item: ExportInfo,
): TsNode | undefined {
  if (!item.sourcePath) return undefined;
  const filePath = path.resolve(REPO_ROOT, item.sourcePath);
  const sourceFile =
    project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);

  const declarations = sourceFile.getDescendants().filter((node) => {
    if (
      Node.isVariableDeclaration(node) ||
      Node.isFunctionDeclaration(node) ||
      Node.isClassDeclaration(node) ||
      Node.isInterfaceDeclaration(node) ||
      Node.isTypeAliasDeclaration(node)
    ) {
      return node.getName() === item.name;
    }
    return false;
  });

  return declarations[0];
}

function nodeTextForReferences(project: Project, item: ExportInfo): string {
  const declaration = declarationForExport(project, item);
  return declaration ? declarationText(declaration) : "";
}

function nodeTextForCompositionReferences(
  project: Project,
  item: ExportInfo,
): string {
  const declaration = declarationForExport(project, item);
  return declaration ? expandedDeclarationText(declaration) : "";
}

function declarationText(node: TsNode): string {
  if (Node.isVariableDeclaration(node)) {
    return node.getVariableStatement()?.getText() ?? node.getText();
  }
  return node.getText();
}

function declarationName(node: TsNode): string | undefined {
  if (
    Node.isVariableDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isClassDeclaration(node) ||
    Node.isInterfaceDeclaration(node) ||
    Node.isTypeAliasDeclaration(node)
  ) {
    return node.getName();
  }
  return undefined;
}

function shouldExpandDeclaration(node: TsNode): boolean {
  const filePath = node.getSourceFile().getFilePath();
  if (!path.relative(REPO_ROOT, filePath).startsWith("packages/")) return false;
  return (
    Node.isVariableDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isClassDeclaration(node) ||
    Node.isInterfaceDeclaration(node) ||
    Node.isTypeAliasDeclaration(node)
  );
}

function referencedDeclarations(node: TsNode): TsNode[] {
  const declarations: TsNode[] = [];
  for (const identifier of node.getDescendantsOfKind(SyntaxKind.Identifier)) {
    const declaration =
      identifier.getSymbol()?.getAliasedSymbol()?.getDeclarations()[0] ??
      identifier.getSymbol()?.getDeclarations()[0];
    if (!declaration) continue;
    if (declaration === node) continue;
    if (!shouldExpandDeclaration(declaration)) continue;
    declarations.push(declaration);
  }
  return declarations;
}

function expandedDeclarationText(root: TsNode): string {
  const queue: Array<{ node: TsNode; depth: number }> = [
    { node: root, depth: 0 },
  ];
  const seen = new Set<string>();
  const text: string[] = [];

  for (const entry of queue) {
    const { node, depth } = entry;
    const name = declarationName(node);
    const key = `${node.getSourceFile().getFilePath()}:${name ?? node.getPos()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    text.push(declarationText(node));

    // Follow one layer of implementation helpers, plus one layer inside those
    // helpers. This catches exported APIs composed through local/internal
    // wrappers without turning the audit into a full call graph.
    if (depth >= 2) continue;
    for (const declaration of referencedDeclarations(node)) {
      queue.push({ node: declaration, depth: depth + 1 });
    }
  }

  return text.join("\n");
}

function attachReferenceGraph(project: Project, exports: ExportInfo[]): void {
  const byName = new Map(exports.map((item) => [item.name, item]));
  const publicNames = exports.map((item) => item.name);

  const referencedPublicNames = (item: ExportInfo, text: string) => {
    return publicNames
      .filter((name) => {
        if (name === item.name) return false;
        if (RELATIONSHIP_NOISE_EXPORTS.has(name)) return false;
        const target = byName.get(name);
        if (!target) return false;

        // Hook-to-hook calls are often implementation plumbing. Keep hook
        // relationships when the target is not another hook; those show a hook's
        // public runtime/adapter/type dependencies.
        if (item.category === "hooks" && target.category === "hooks") {
          return false;
        }

        return isMentioned(text, name);
      })
      .sort();
  };

  for (const item of exports) {
    const text = nodeTextForReferences(project, item);
    item.references = text ? referencedPublicNames(item, text) : [];

    for (const name of item.references) {
      byName.get(name)?.referencedBy.push(item.name);
    }

    if (item.kind === "component") {
      const compositionText = nodeTextForCompositionReferences(project, item);
      item.compositionReferences = compositionText
        ? referencedPublicNames(item, compositionText)
        : [];
    }
  }

  for (const item of exports) item.referencedBy.sort();
}

function printMissingByCategory(exports: ExportInfo[]): void {
  for (const category of Object.keys(CATEGORY_LABELS) as Category[]) {
    const items = exports.filter((item) => item.category === category);
    const missing = items.filter((item) => !item.documented);
    const stable = missing.filter((item) => !item.deprecated);
    const deprecated = missing.filter((item) => item.deprecated);

    console.log(`\n${CATEGORY_LABELS[category]}`);
    console.log("-".repeat(CATEGORY_LABELS[category].length));
    console.log(`Documented: ${items.length - missing.length}`);
    console.log(`Missing: ${missing.length}`);

    if (stable.length > 0) {
      console.log("\nMissing stable exports:");
      for (const item of stable) {
        console.log(`  - ${item.name} (${item.kind}, ${item.page})`);
      }
    }

    if (deprecated.length > 0) {
      console.log("\nMissing deprecated exports:");
      for (const item of deprecated) {
        console.log(`  - ${item.name} (${item.kind}, ${item.page})`);
      }
    }
  }
}

function printPageProposal(exports: ExportInfo[]): void {
  console.log("\nProposed API Reference Pages");
  console.log("----------------------------");
  for (const { page, exports: items } of groupByPage(exports)) {
    const primary = items.filter((item) => item.pageRole === "primary");
    if (primary.length === 0) continue;

    console.log(`\n${page}`);
    for (const item of primary.sort((a, b) => a.name.localeCompare(b.name))) {
      const flags = [
        item.kind,
        item.documented ? "documented" : "missing",
        item.deprecated ? "deprecated" : undefined,
        item.jsDoc ? undefined : "missing-jsdoc",
      ].filter(Boolean);
      console.log(`  - ${item.name} [${flags.join(", ")}]`);
    }
  }
}

function groupByPage(exports: ExportInfo[]): PageGroup[] {
  const byPage = new Map<string, ExportInfo[]>();
  for (const item of exports) {
    const page = item.page ?? item.category;
    const list = byPage.get(page) ?? [];
    list.push(item);
    byPage.set(page, list);
  }

  return [...byPage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([page, items]) => ({
      page,
      exports: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function primaryExportsForPage(items: ExportInfo[]): ExportInfo[] {
  const stable = items.filter(
    (item) => item.pageRole === "primary" && !item.deprecated,
  );
  if (stable.length > 0) return stable;
  const primary = items.filter((item) => item.pageRole === "primary");
  if (primary.length > 0) return primary;
  const relatedStable = items.filter((item) => !item.deprecated);
  return relatedStable.length > 0 ? relatedStable : items;
}

function relatedExportsForPage(items: ExportInfo[]): ExportInfo[] {
  const stable = items.filter(
    (item) => item.pageRole === "related" && !item.deprecated,
  );
  return stable.length > 0 ? stable : items;
}

function printDocGroupSuggestions(exports: ExportInfo[]): void {
  const byName = new Map(exports.map((item) => [item.name, item]));

  console.log("\nDoc Group Suggestions");
  console.log("---------------------");

  for (const { page, exports: items } of groupByPage(exports)) {
    const primary = primaryExportsForPage(items);
    const covered = relatedExportsForPage(items);
    const relatedNames = primary.flatMap((item) => [
      ...item.references,
      ...(primary.length === 1 ? item.compositionReferences : []),
    ]);
    const related = [...new Set(relatedNames)]
      .map((name) => byName.get(name))
      .filter((item): item is ExportInfo => {
        if (!item) return false;
        if (item.deprecated) return false;
        if (item.category === "hooks") return false;
        return item.page !== page;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\n${page}`);
    if (primary.some((item) => item.pageRole === "primary")) {
      console.log(`  Primary: ${primary.map((item) => item.name).join(", ")}`);
    }

    if (covered.some((item) => item.pageRole === "related")) {
      console.log(
        `  Covered related exports: ${covered
          .filter((item) => item.pageRole === "related")
          .map((item) => item.name)
          .join(", ")}`,
      );
    }

    const deprecated = items.filter((item) => item.deprecated);
    if (deprecated.length > 0) {
      console.log(
        `  Deprecated aliases: ${deprecated
          .map((item) => item.name)
          .join(", ")}`,
      );
    }

    if (related.length > 0) {
      console.log(
        `  Related exported building blocks: ${related
          .map((item) => item.name)
          .join(", ")}`,
      );
    }
  }
}

function printRelationships(exports: ExportInfo[]): void {
  const relationships = exports.filter((item) => item.references.length > 0);

  console.log("\nSource-Derived Relationships");
  console.log("----------------------------");
  for (const item of relationships) {
    console.log(`- ${item.name}: uses ${item.references.join(", ")}`);
  }
}

function printMissingJsDoc(exports: ExportInfo[]): void {
  const missing = exports.filter(
    (item) =>
      !item.jsDoc &&
      !item.deprecated &&
      item.category !== "primitives" &&
      !item.name.startsWith("unstable_"),
  );
  console.log("\nMissing Source JSDoc");
  console.log("--------------------");
  console.log(`Count: ${missing.length}`);
  for (const item of missing) {
    console.log(`  - ${item.name} (${item.sourcePath ?? "unknown source"})`);
  }
}

console.log("Auditing API reference graph...");

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  skipAddingFilesFromTsConfig: false,
});

const docsContent = readMdxFiles(API_REFERENCE_DIR);
const exports = discoverExports(project, docsContent);
attachReferenceGraph(project, exports);

printMissingByCategory(exports);
printPageProposal(exports);
printDocGroupSuggestions(exports);
printRelationships(exports);
printMissingJsDoc(exports);

const missingCount = exports.filter((item) => !item.documented).length;
console.log("\nSummary");
console.log("-------");
console.log(`Tracked public exports: ${exports.length}`);
console.log(`Missing references: ${missingCount}`);
