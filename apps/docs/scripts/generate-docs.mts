import {
  Node,
  Project,
  Scope,
  type ExportDeclaration,
  type ExportSpecifier,
  type InterfaceDeclaration,
  type JSDoc,
  type Node as TsNode,
  type SourceFile,
  type Symbol as TsMorphSymbol,
  type Type,
  type TypeAliasDeclaration,
} from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = path.resolve("../..");
const REACT_INDEX = path.join(REPO_ROOT, "packages/react/src/index.ts");
const TYPE_DOCS_INPUT = path.resolve("./content/types-to-generate/typeDocs.ts");
const TYPE_DOCS_OUTPUT = path.resolve("./generated/typeDocs.ts");
const INTEGRATION_TYPE_DOCS_OUTPUT = path.resolve(
  "./generated/integrationTypeDocs.ts",
);
const API_REFERENCE_DIR = path.resolve(
  "./content/docs/(reference)/api-reference",
);
const GENERATED_PAGE_MARKER =
  "{/* AUTO-GENERATED PAGE by scripts/generate-docs.mts */}";
const SKIP_AUTO_GENERATION_MARKER =
  "{/* api-reference:skip-auto-generation */}";
const API_REFERENCE_START = "{/* api-reference:start */}";
const API_REFERENCE_END = "{/* api-reference:end */}";
type ApiSection =
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

type Classification = {
  section: ApiSection;
  page: string;
  role: ExportInfo["pageRole"];
  rule: string;
  confidence: ExportInfo["classificationConfidence"];
  reason: string;
};

type ClassificationInput = {
  name: string;
  kind: ExportKind;
  sourcePath?: string;
};

type ClassificationRule = (
  input: ClassificationInput,
) => Classification | undefined;

type DocPlacement = { page: string; role: ExportInfo["pageRole"] };

type ExportEntry = {
  name: string;
  exportNode: ExportDeclaration;
  specifier?: ExportSpecifier;
};

type ParameterDef = {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  default?: string;
  deprecated?: string;
  children?: Array<{ type?: string; parameters: ParameterDef[] }>;
};

type TypeDoc = {
  type?: string;
  parameters: ParameterDef[];
};

type PageSummary = { slug: string; title: string; description: string };
type TypeDocBindings = Map<string, string>;

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

const PRIMARY_FEATURE_TYPES = new Set([
  "RealtimeVoiceAdapter",
  "VoiceSessionState",
  "VoiceSessionControls",
  "VoiceSessionHelpers",
  "SpeechSynthesisAdapter",
  "DictationAdapter",
  "DictationState",
  "ExternalStoreAdapter",
  "ExternalStoreThreadListAdapter",
  "ExternalThreadQueueAdapter",
  "ExternalThreadProps",
]);

const SECTION_META: Record<
  ApiSection,
  { title: string; description: string; overview: string }
> = {
  tools: {
    title: "Tools",
    description:
      "APIs for defining tools, registering tool UIs, rendering tool calls, and composing toolkits.",
    overview:
      "Tool APIs define the callable capabilities an assistant can use and the React UI used to render tool calls and results.",
  },
  "model-context": {
    title: "Model Context",
    description:
      "APIs for providing model instructions, context, and model context registries.",
    overview:
      "Model context APIs let apps contribute instructions, contextual text, and provider state to the assistant runtime.",
  },
  transport: {
    title: "Transport",
    description:
      "Assistant transport, frame, and protocol APIs for cross-boundary communication.",
    overview:
      "Transport APIs describe the message protocol and frame bridge used to connect assistant-ui to external execution contexts.",
  },
  "external-store": {
    title: "External Store",
    description:
      "External store runtime and message conversion helpers for custom state ownership.",
    overview:
      "External store APIs connect assistant-ui to applications that own their message and thread state outside the built-in runtimes.",
  },
  voice: {
    title: "Voice",
    description:
      "Voice session, speech, and dictation APIs for realtime assistant experiences.",
    overview:
      "Voice APIs connect realtime voice sessions, speech synthesis, and dictation controls to assistant-ui.",
  },
  primitives: {
    title: "Primitives",
    description:
      "Reference for assistant-ui React primitive namespaces, including Thread, Composer, Message, BranchPicker, ActionBar, and their composable parts.",
    overview:
      "Primitives are the composable React components exported from `@assistant-ui/react`. These pages are generated from the public React barrel and the primitive prop metadata.",
  },
  hooks: {
    title: "Hooks",
    description:
      "Reference for assistant-ui React hooks, including reactive state, runtime creation, model context, and utilities for building AI chat components.",
    overview:
      "Hooks are the programmatic layer of `@assistant-ui/react`: reading state, creating runtimes, registering tools, wiring model context, and building custom assistant behavior.",
  },
  adapters: {
    title: "Adapters",
    description:
      "Reference for assistant-ui adapter interfaces and helpers for chat models, persistence, attachments, speech, feedback, suggestions, and runtime composition.",
    overview:
      "Adapters let you replace runtime behavior without replacing the UI. They are usually passed through runtime options or provided by integration packages.",
  },
  runtimes: {
    title: "Runtimes",
    description:
      "Reference for runtime actions and state used by useAui and useAuiState, including typed contracts for controlling assistant-ui in React.",
    overview:
      "Runtime pages document the objects and state exposed through assistant-ui runtimes. Use this section when controlling assistant-ui programmatically or inspecting exact state shapes.",
  },
  "context-providers": {
    title: "Context Providers",
    description:
      "Reference for assistant-ui React context providers that establish runtime, thread, message, and scoped rendering contexts.",
    overview:
      "Context providers establish the scopes that primitives and hooks read from. Most apps use `AssistantRuntimeProvider` directly; lower-level providers are for custom renderers and advanced composition.",
  },
  integrations: {
    title: "Integrations",
    description:
      "Package-level API reference for assistant-ui React integrations, including React AI SDK and Assistant Cloud AI SDK helpers.",
    overview:
      "Integration packages adapt assistant-ui to framework libraries and adjacent React ecosystems. Use these pages when you need package-specific hook names, options, and helper exports.",
  },
  utilities: {
    title: "Utilities",
    description:
      "Miscellaneous public utilities exported by @assistant-ui/react.",
    overview:
      "Utilities are public exports that do not belong to a more specific assistant-ui feature or API shape.",
  },
};

const SECTION_ORDER = Object.keys(SECTION_META) as ApiSection[];
const REACT_API_SECTIONS = SECTION_ORDER.filter(
  (section) => section !== "integrations",
);

const INTEGRATION_PACKAGES = [
  {
    slug: "react-ai-sdk",
    packageName: "@assistant-ui/react-ai-sdk",
    entry: path.join(REPO_ROOT, "packages/react-ai-sdk/src/index.ts"),
    description:
      "Vercel AI SDK integration with chat runtime hooks and transport utilities.",
  },
  {
    slug: "cloud-ai-sdk",
    packageName: "@assistant-ui/cloud-ai-sdk",
    entry: path.join(REPO_ROOT, "packages/cloud-ai-sdk/src/index.ts"),
    description: "AI SDK hooks for assistant-cloud persistence.",
  },
] as const;

const PAGE_META: Partial<
  Record<ApiSection, Record<string, { title: string; description: string }>>
> = {
  tools: {
    definition: {
      title: "Tool Definitions",
      description: "Define assistant tools and compose toolkits.",
    },
    rendering: {
      title: "Tool Rendering",
      description: "Register React renderers for tool calls and data parts.",
    },
    status: {
      title: "Tool Status",
      description: "Read tool argument and execution status from tool UIs.",
    },
  },
  "model-context": {
    context: {
      title: "Model Context",
      description: "Provide model instructions and contextual state.",
    },
    registry: {
      title: "Model Context Registry",
      description: "Register and manage model context providers.",
    },
  },
  transport: {
    "assistant-transport": {
      title: "Assistant Transport",
      description: "Command and protocol types for assistant transport.",
    },
    frame: {
      title: "Assistant Frame",
      description: "Frame bridge APIs and message protocol types.",
    },
  },
  "external-store": {
    runtime: {
      title: "External Store Runtime",
      description: "External store runtime components, options, and adapters.",
    },
    "message-conversion": {
      title: "Message Conversion",
      description: "Convert and bind external message formats.",
    },
  },
  voice: {
    session: {
      title: "Voice Sessions",
      description: "Create and control realtime voice sessions.",
    },
    "speech-dictation": {
      title: "Speech and Dictation",
      description: "Connect speech synthesis and dictation adapters.",
    },
  },
  utilities: {
    miscellaneous: {
      title: "Utilities",
      description:
        "Miscellaneous public utilities exported by @assistant-ui/react.",
    },
  },
  hooks: {
    "assistant-transport": {
      title: "Assistant Transport Hooks",
      description:
        "Hooks for sending commands and reading assistant transport state.",
    },
    "composer-triggers": {
      title: "Composer Trigger Hooks",
      description:
        "Unstable hooks for mention, slash command, and trigger popover behavior.",
    },
    "model-context": {
      title: "Model Context Hooks",
      description:
        "Hooks for registering tools, data renderers, instructions, and model context.",
    },
    primitives: {
      title: "Primitive Hooks",
      description:
        "Hooks for primitive-scoped state, actions, viewport, timing, and message parts.",
    },
    runtimes: {
      title: "Runtime Hooks",
      description: "Hooks for creating assistant runtimes.",
    },
    state: {
      title: "State Hooks",
      description:
        "Hooks for reading assistant state and calling runtime actions.",
    },
    voice: {
      title: "Voice Hooks",
      description: "Hooks for reading voice session state and controls.",
    },
  },
  adapters: {
    attachments: {
      title: "Attachment Adapters",
      description: "Upload and compose file attachment handlers.",
    },
    "feedback-speech": {
      title: "Feedback and Speech Adapters",
      description: "Capture message feedback and connect speech or dictation.",
    },
    model: {
      title: "Model Adapters",
      description:
        "Adapter interfaces for connecting chat models to assistant-ui runtimes.",
    },
    persistence: {
      title: "Persistence Adapters",
      description: "Persist message history and thread lists.",
    },
    runtime: {
      title: "Runtime Adapter Context",
      description: "Provide runtime adapters through React context.",
    },
    suggestions: {
      title: "Suggestion Adapters",
      description: "Provide prompt suggestions to assistant-ui runtimes.",
    },
    voice: {
      title: "Voice Adapters",
      description: "Connect realtime voice sessions to assistant-ui runtimes.",
    },
  },
  runtimes: {
    "assistant-runtime": {
      title: "AssistantRuntime",
      description: "Top-level runtime actions and state for assistant-ui.",
    },
    "attachment-runtime": {
      title: "AttachmentRuntime",
      description: "Runtime actions and state for attachments.",
    },
    "composer-runtime": {
      title: "ComposerRuntime",
      description: "Runtime actions and state for composer input.",
    },
    "message-part-runtime": {
      title: "MessagePartRuntime",
      description: "Runtime actions and state for message parts.",
    },
    "message-runtime": {
      title: "MessageRuntime",
      description: "Runtime actions and state for messages.",
    },
    "thread-list-item-runtime": {
      title: "ThreadListItemRuntime",
      description: "Runtime actions and state for thread list items.",
    },
    "thread-list-runtime": {
      title: "ThreadListRuntime",
      description: "Runtime actions and state for thread lists.",
    },
    "thread-runtime": {
      title: "ThreadRuntime",
      description: "Runtime actions and state for threads.",
    },
  },
};

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

const RUNTIME_CREATION_HOOKS = new Set([
  "useAssistantTransportRuntime",
  "useCloudThreadListRuntime",
  "useExternalStoreRuntime",
  "useLocalRuntime",
  "useLocalThreadRuntime",
  "useRemoteThreadListRuntime",
  "unstable_useRemoteThreadListRuntime",
]);

const STATE_HOOKS = new Set([
  "useAui",
  "useAuiState",
  "useAuiEvent",
  "useAssistantApi",
  "useAssistantState",
  "useAssistantEvent",
]);

const COMPOSER_TRIGGER_HOOKS = new Set([
  "unstable_useMentionAdapter",
  "unstable_useSlashCommandAdapter",
  "unstable_useTriggerPopoverRootContext",
  "unstable_useTriggerPopoverRootContextOptional",
  "unstable_useTriggerPopoverScopeContext",
  "unstable_useTriggerPopoverScopeContextOptional",
  "unstable_useTriggerPopoverTriggers",
  "unstable_useTriggerPopoverTriggersOptional",
]);

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  skipAddingFilesFromTsConfig: false,
});
const primitiveSourceFiles = new Map<string, SourceFile>();

function resolveAliasedDeclaration(declaration: TsNode): TsNode {
  if (Node.isExportSpecifier(declaration)) {
    const aliased = declaration.getSymbol()?.getAliasedSymbol();
    const resolved = aliased?.getDeclarations()[0];
    if (resolved) return resolved;
  }
  return declaration;
}

function cleanTypeText(typeText: string): string {
  return typeText
    .replace(/import\(".*?"\)\./g, "")
    .replace(/^\s*\|\s*/, "")
    .replace(/\s*\|\s*undefined$/, "");
}

function cleanSignatureText(text: string): string {
  return cleanTypeText(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function declarationTypeText(node: TsNode): string {
  if (
    Node.isVariableDeclaration(node) ||
    Node.isParameterDeclaration(node) ||
    Node.isPropertySignature(node) ||
    Node.isPropertyDeclaration(node)
  ) {
    const typeNode = node.getTypeNode();
    if (typeNode) return cleanSignatureText(typeNode.getText());
    return cleanSignatureText(node.getType().getText(node));
  }

  return cleanSignatureText(node.getType().getText(node));
}

function returnTypeText(node: TsNode): string {
  if (Node.isMethodDeclaration(node) || Node.isFunctionDeclaration(node)) {
    const typeNode = node.getReturnTypeNode();
    if (typeNode) return cleanSignatureText(typeNode.getText());
    return cleanSignatureText(node.getReturnType().getText(node));
  }

  return declarationTypeText(node);
}

function parameterSignature(parameter: TsNode): string {
  if (!Node.isParameterDeclaration(parameter)) return parameter.getText();

  const dotDotDot = parameter.isRestParameter() ? "..." : "";
  const name = parameter.getNameNode().getText();
  const optional = parameter.hasQuestionToken() ? "?" : "";
  const type = declarationTypeText(parameter);
  const initializer = parameter.getInitializer()?.getText();
  const defaultValue = initializer ? ` = ${initializer}` : "";

  return `${dotDotDot}${name}${optional}: ${type}${defaultValue}`;
}

function typeParameterText(node: TsNode): string {
  if (
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node)
  ) {
    const params = node.getTypeParameters().map((param) => param.getText());
    return params.length > 0 ? `<${params.join(", ")}>` : "";
  }

  return "";
}

function isPublicClassMember(node: TsNode): boolean {
  if (
    Node.isConstructorDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isPropertyDeclaration(node)
  ) {
    const scope = node.getScope();
    return scope !== Scope.Private && scope !== Scope.Protected;
  }

  return false;
}

function classMemberPrefix(node: TsNode): string {
  if (
    (Node.isMethodDeclaration(node) || Node.isPropertyDeclaration(node)) &&
    node.isStatic()
  ) {
    return "static ";
  }

  return "";
}

function propertySignature(node: TsNode): string | undefined {
  if (!Node.isPropertyDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }

  const name = node.getNameNode().getText();
  const optional = node.hasQuestionToken() ? "?" : "";
  return `${classMemberPrefix(node)}${name}${optional}: ${declarationTypeText(node)};`;
}

function methodSignature(node: TsNode): string | undefined {
  if (!Node.isMethodDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }

  const asyncPrefix = node.isAsync() ? "async " : "";
  const params = node.getParameters().map(parameterSignature).join(", ");
  const returnType = returnTypeText(node);
  return `${classMemberPrefix(node)}${asyncPrefix}${node.getName()}${typeParameterText(node)}(${params}): ${returnType};`;
}

function constructorSignature(node: TsNode): string | undefined {
  if (!Node.isConstructorDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }

  const params = node.getParameters().map(parameterSignature).join(", ");
  return `constructor(${params});`;
}

function classSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isClassDeclaration(node)) return undefined;

  const extendsText = node.getExtends()?.getText();
  const implementsText = node.getImplements().map((item) => item.getText());
  const header = [
    `class ${name}${typeParameterText(node)}`,
    extendsText ? `extends ${extendsText}` : undefined,
    implementsText.length > 0
      ? `implements ${implementsText.join(", ")}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const members = [
    ...node.getConstructors().map(constructorSignature),
    ...node.getProperties().map(propertySignature),
    ...node.getMethods().map(methodSignature),
  ].filter((line): line is string => Boolean(line));

  if (members.length === 0) return `${header} {}`;
  return [`${header} {`, ...members.map((line) => `  ${line}`), "}"].join("\n");
}

function functionSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isFunctionDeclaration(node)) return undefined;

  const asyncPrefix = node.isAsync() ? "async " : "";
  const params = node.getParameters().map(parameterSignature).join(", ");
  return `function ${asyncPrefix}${name}${typeParameterText(node)}(${params}): ${returnTypeText(node)};`;
}

function localTypeSignature(node: TsNode): string | undefined {
  if (Node.isInterfaceDeclaration(node)) {
    return cleanSignatureText(node.getText()).replace(/^export\s+/, "");
  }

  if (Node.isTypeAliasDeclaration(node)) {
    return `type ${node.getName()} = ${cleanSignatureText(node.getTypeNode().getText())};`;
  }

  return undefined;
}

function namespaceSupportingTypes(node: TsNode, name: string): string[] {
  return node
    .getSourceFile()
    .getModules()
    .filter((module) => module.getName() === name)
    .flatMap((module) => {
      const body = module.getBody();
      if (!Node.isModuleBlock(body)) return [];

      const typeLines = body
        .getStatements()
        .map(localTypeSignature)
        .filter((line): line is string => Boolean(line));

      if (typeLines.length === 0) return [];

      return [
        [
          `namespace ${name} {`,
          ...typeLines.map((line) =>
            line
              .split("\n")
              .map((innerLine) => `  ${innerLine}`)
              .join("\n"),
          ),
          "}",
        ].join("\n"),
      ];
    });
}

function referencedLocalTypes(node: TsNode, typeText: string): string[] {
  const referencedNames = [
    ...new Set(
      typeText.match(/\b[A-Z][A-Za-z0-9_]*(?:Props|Adapters)\b/g) ?? [],
    ),
  ];
  if (referencedNames.length === 0) return [];

  return referencedNames.flatMap((name) =>
    [
      ...(node.getSourceFile().getExportedDeclarations().get(name) ?? []),
      ...node
        .getSourceFile()
        .getImportDeclarations()
        .flatMap((importDecl) => importDecl.getNamedImports())
        .filter((namedImport) => namedImport.getName() === name)
        .flatMap((namedImport) => {
          const symbol = namedImport.getNameNode().getSymbol();
          return symbol?.getAliasedSymbol()?.getDeclarations() ?? [];
        }),
    ]
      .map(resolveAliasedDeclaration)
      .map(localTypeSignature)
      .filter((line): line is string => Boolean(line)),
  );
}

function variableSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isVariableDeclaration(node)) return undefined;
  const typeText = declarationTypeText(node);
  const namespaceTypes = namespaceSupportingTypes(node, name);
  return [
    ...referencedLocalTypes(node, [typeText, ...namespaceTypes].join("\n")),
    ...namespaceTypes,
    `const ${name}: ${typeText};`,
  ].join("\n\n");
}

function bindingElementSignature(
  node: TsNode,
  name: string,
): string | undefined {
  if (!Node.isBindingElement(node)) return undefined;
  return `const ${name}: ${cleanSignatureText(node.getType().getText(node))};`;
}

function typeSignature(node: TsNode, name: string): string | undefined {
  if (Node.isInterfaceDeclaration(node)) {
    return cleanSignatureText(node.getText());
  }

  if (Node.isTypeAliasDeclaration(node)) {
    return `type ${name} = ${cleanSignatureText(node.getTypeNode().getText())};`;
  }

  return undefined;
}

function extractSignature(
  node: TsNode | undefined,
  name: string,
): string | undefined {
  if (!node) return undefined;
  const signature =
    classSignature(node, name) ??
    functionSignature(node, name) ??
    variableSignature(node, name) ??
    bindingElementSignature(node, name) ??
    typeSignature(node, name);

  return signature ? cleanSignatureText(signature) : undefined;
}

function getJsDocCommentText(doc: JSDoc): string | undefined {
  const comment = doc.getComment();
  let text: string | undefined;
  if (typeof comment === "string") {
    text = comment;
  } else if (Array.isArray(comment)) {
    text = comment.map((part) => part.getText()).join("");
  }
  if (!text) return undefined;

  const cleaned = text
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n")
    .replace(
      /\{@link\s+([^}\s]+)(?:\s+([^}]+))?\}/g,
      (_, link, label) => label?.trim() || link,
    )
    .replace(/\s+([.,;:])/g, "$1")
    .trim();

  return cleaned || undefined;
}

function jsDocTag(doc: JSDoc | undefined, name: string): string | undefined {
  return doc
    ?.getTags()
    .find((tag) => tag.getTagName() === name)
    ?.getComment()
    ?.toString()
    .trim();
}

function getJsDocs(node: TsNode | undefined): JSDoc[] {
  if (!node) return [];
  if (
    Node.isInterfaceDeclaration(node) ||
    Node.isTypeAliasDeclaration(node) ||
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isVariableStatement(node)
  ) {
    return node.getJsDocs();
  }
  if (Node.isVariableDeclaration(node)) {
    return node.getVariableStatement()?.getJsDocs() ?? [];
  }
  return [];
}

function extractJsDoc(node: TsNode | undefined): {
  jsDoc?: string;
  deprecated?: string;
} {
  const doc = getJsDocs(node)[0];
  return {
    jsDoc: doc ? getJsDocCommentText(doc) : undefined,
    deprecated: jsDocTag(doc, "deprecated"),
  };
}

function propertyJsDocMeta(node: TsNode | undefined): {
  description?: string;
  default?: string;
  deprecated?: string;
} {
  if (!node || !("getJsDocs" in node)) return {};
  const doc = node.getJsDocs?.()[0];
  if (!doc) return {};

  return {
    description: getJsDocCommentText(doc),
    default: jsDocTag(doc, "default"),
    deprecated: jsDocTag(doc, "deprecated"),
  };
}

function propertyDeclarationsJsDocMeta(declarations: TsNode[]): {
  description?: string;
  default?: string;
  deprecated?: string;
} {
  return declarations.reduce<{
    description?: string;
    default?: string;
    deprecated?: string;
  }>((meta, declaration) => {
    const declarationMeta = propertyJsDocMeta(declaration);
    return {
      description: meta.description ?? declarationMeta.description,
      default: meta.default ?? declarationMeta.default,
      deprecated: meta.deprecated ?? declarationMeta.deprecated,
    };
  }, {});
}

function processTypeOrInterface(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
  typeName: string,
): TypeDoc | undefined {
  return processTypeProperties(declaration.getType(), typeName, declaration);
}

function isInheritedParameterProp(prop: TsMorphSymbol): boolean {
  const declarations = prop.getDeclarations();
  if (declarations.length === 0) return false;

  return declarations.every((decl) => {
    const filePath = decl.getSourceFile().getFilePath();
    return (
      filePath.includes("node_modules/@types/react") ||
      filePath.includes("node_modules/react-textarea-autosize") ||
      filePath.includes("node_modules/csstype") ||
      filePath.includes("node_modules/tw-")
    );
  });
}

function typeDisplayName(type: Type, fallback: string): string {
  const name = type.getAliasSymbol()?.getName() ?? type.getSymbol()?.getName();
  if (!name || name === "__type") return fallback;
  return name;
}

function isInlineObjectTypeText(typeText: string): boolean {
  const text = typeText.trim();
  return text.startsWith("{") || text.startsWith("| {");
}

function parameterTypeLabel(
  typeText: string,
  children: ParameterDef["children"] | undefined,
  fallback: string,
): string {
  if (children && isInlineObjectTypeText(typeText)) return fallback;
  return typeText;
}

function propertyTypePath(ownerTypeName: string, propertyName: string): string {
  return `${ownerTypeName}["${propertyName}"]`;
}

function nonNullableUnionTypes(type: Type): Type[] {
  if (!type.isUnion()) return [type];
  return type
    .getUnionTypes()
    .filter((unionType) => !unionType.isUndefined() && !unionType.isNull());
}

function typeIncludesUndefined(type: Type): boolean {
  return (
    type.isUndefined() || type.getUnionTypes().some((t) => t.isUndefined())
  );
}

function isPrimitiveType(type: Type): boolean {
  return (
    type.isString() ||
    type.isNumber() ||
    type.isBoolean() ||
    type.isStringLiteral() ||
    type.isNumberLiteral() ||
    type.isBooleanLiteral() ||
    type.isUndefined() ||
    type.isNull()
  );
}

function symbolHasNonNeverDeclaration(symbol: TsMorphSymbol): boolean {
  return symbol.getDeclarations().some((declaration) => {
    const typeText =
      Node.isPropertySignature(declaration) ||
      Node.isPropertyDeclaration(declaration)
        ? declarationTypeText(declaration)
        : symbol.getTypeAtLocation(declaration).getText(declaration);
    return cleanTypeText(typeText) !== "never";
  });
}

function documentableProperties(type: Type): TsMorphSymbol[] {
  const directProperties = type.getProperties();
  if (!type.isUnion() || directProperties.length > 0) return directProperties;

  const types = nonNullableUnionTypes(type);
  if (types.length > 3) return directProperties;

  const properties = new Map<string, TsMorphSymbol>();

  for (const currentType of types) {
    for (const prop of currentType.getProperties()) {
      const name = prop.getName();
      const existing = properties.get(name);
      if (
        !existing ||
        (!symbolHasNonNeverDeclaration(existing) &&
          symbolHasNonNeverDeclaration(prop))
      ) {
        properties.set(name, prop);
      }
    }
  }

  if (properties.size > 30) return directProperties;

  return [...properties.values()];
}

function shouldExpandChildType(type: Type, typeText: string): boolean {
  if (type.isArray() || type.isTuple()) {
    return false;
  }

  const candidateTypes = nonNullableUnionTypes(type);
  if (candidateTypes.length === 0) return false;

  if (candidateTypes.every(isPrimitiveType)) {
    return false;
  }

  if (
    type.isUnion() &&
    candidateTypes.some((unionType) => isPrimitiveType(unionType))
  ) {
    return false;
  }

  if (type.getCallSignatures().length > 0) return false;
  if (typeText.includes("ReactNode") || typeText.startsWith("React.")) {
    return false;
  }

  const childProps = documentableProperties(type)
    .filter((childProp) => !isInheritedParameterProp(childProp))
    .filter((childProp) => !childProp.getName().startsWith("__"));

  return childProps.length > 0 && childProps.length <= 30;
}

function processTypeChildren(
  type: Type,
  typeName: string,
  location: TsNode,
  depth: number,
): ParameterDef["children"] | undefined {
  if (depth >= 3) return undefined;
  const childDoc = processTypeProperties(type, typeName, location, depth + 1);
  if (!childDoc || childDoc.parameters.length === 0) return undefined;
  return [childDoc];
}

function parameterFromProperty(
  prop: TsMorphSymbol,
  location: TsNode,
  depth: number,
  ownerTypeName: string,
): ParameterDef | undefined {
  if (isInheritedParameterProp(prop)) return undefined;

  const name = prop.getName();
  if (name.startsWith("__")) return undefined;
  if (name === "tw") return undefined;

  const declarations = prop.getDeclarations();
  const decl =
    declarations.find((declaration) => {
      const typeText =
        Node.isPropertySignature(declaration) ||
        Node.isPropertyDeclaration(declaration)
          ? declarationTypeText(declaration)
          : prop.getTypeAtLocation(declaration).getText(declaration);
      return cleanTypeText(typeText) !== "never";
    }) ?? declarations[0];
  if (
    name === "children" &&
    decl?.getSourceFile().getFilePath().includes("node_modules/")
  ) {
    return undefined;
  }
  const propType = decl
    ? prop.getTypeAtLocation(decl)
    : prop.getTypeAtLocation(location);
  const typeText = cleanTypeText(
    decl && (Node.isPropertySignature(decl) || Node.isPropertyDeclaration(decl))
      ? declarationTypeText(decl)
      : propType.getText(decl ?? location),
  );
  const childTypeName = typeDisplayName(
    propType,
    propertyTypePath(ownerTypeName, name),
  );
  const children = shouldExpandChildType(propType, typeText)
    ? processTypeChildren(propType, childTypeName, decl ?? location, depth)
    : undefined;
  const param: ParameterDef = {
    name,
    type: parameterTypeLabel(typeText, children, childTypeName),
  };

  if (prop.isOptional() || typeIncludesUndefined(propType)) {
    param.required = false;
  } else if (
    decl &&
    ((Node.isPropertySignature(decl) && !decl.hasQuestionToken()) ||
      (Node.isPropertyDeclaration(decl) && !decl.hasQuestionToken()))
  ) {
    param.required = true;
  } else {
    param.required = !prop.isOptional();
  }

  const jsDoc = propertyDeclarationsJsDocMeta(declarations);
  if (jsDoc.description) param.description = jsDoc.description;
  if (jsDoc.default) param.default = jsDoc.default;
  if (jsDoc.deprecated) param.deprecated = jsDoc.deprecated;

  if (children) param.children = children;

  return param;
}

function processTypeProperties(
  type: Type,
  typeName: string,
  location: TsNode,
  depth = 0,
): TypeDoc | undefined {
  const properties = documentableProperties(type)
    .map((prop) => parameterFromProperty(prop, location, depth, typeName))
    .filter((param): param is ParameterDef => Boolean(param));
  if (properties.length === 0) return undefined;

  return {
    type: typeName,
    parameters: properties,
  };
}

function parameterFromSignatureParameter(
  parameter: TsMorphSymbol,
  location: TsNode,
  depth: number,
): ParameterDef | undefined {
  const decl = parameter.getDeclarations()[0];
  const parameterType = decl
    ? parameter.getTypeAtLocation(decl)
    : parameter.getTypeAtLocation(location);
  const typeText = cleanTypeText(parameterType.getText(decl ?? location));
  let name = parameter.getName();
  if (decl && Node.isParameterDeclaration(decl)) {
    const nameNode = decl.getNameNode();
    if (Node.isObjectBindingPattern(nameNode)) {
      name = typeText.endsWith("Props") ? "props" : "options";
    }
  }
  const param: ParameterDef = {
    name,
    type: typeText,
    required: !parameter.isOptional(),
  };

  if (decl && Node.isParameterDeclaration(decl)) {
    param.required =
      !decl.hasQuestionToken() &&
      !decl.hasInitializer() &&
      !decl.isRestParameter();
  }

  const jsDoc = propertyJsDocMeta(decl);
  if (jsDoc.description) param.description = jsDoc.description;
  if (jsDoc.default) param.default = jsDoc.default;
  if (jsDoc.deprecated) param.deprecated = jsDoc.deprecated;

  if (shouldExpandChildType(parameterType, typeText)) {
    param.children = processTypeChildren(
      parameterType,
      typeDisplayName(parameterType, typeText),
      decl ?? location,
      depth,
    );
  }

  return param;
}

function processCallableDeclaration(
  declaration: TsNode,
  typeName: string,
): TypeDoc | undefined {
  const signature = declaration.getType().getCallSignatures()[0];
  if (!signature) return undefined;

  const parameters = signature
    .getParameters()
    .map((parameter) =>
      parameterFromSignatureParameter(parameter, declaration, 0),
    )
    .filter((param): param is ParameterDef => Boolean(param));

  if (parameters.length === 0) return undefined;
  return { type: typeName, parameters };
}

function getComponentPropsType(declaration: TsNode): Type | undefined {
  const type = declaration.getType();
  const parameter = type.getCallSignatures()[0]?.getParameters()[0];
  const parameterDeclaration = parameter?.getDeclarations()[0];
  if (parameterDeclaration) {
    return parameter.getTypeAtLocation(parameterDeclaration);
  }

  return undefined;
}

function processComponentDeclaration(
  declaration: TsNode,
  typeName: string,
): TypeDoc | undefined {
  const propsType = getComponentPropsType(declaration);
  if (!propsType) return undefined;
  return processTypeProperties(propsType, `${typeName} props`, declaration);
}

function classTypeDoc(
  declaration: TsNode,
  typeName: string,
): TypeDoc | undefined {
  if (!Node.isClassDeclaration(declaration)) return undefined;

  const parameters: ParameterDef[] = [];

  for (const ctor of declaration.getConstructors()) {
    if (!isPublicClassMember(ctor)) continue;
    parameters.push({
      name: "constructor",
      type: `(${ctor.getParameters().map(parameterSignature).join(", ")}) => ${typeName}`,
      description: "",
    });
  }

  for (const property of declaration.getProperties()) {
    if (!isPublicClassMember(property)) continue;
    parameters.push({
      name: `${classMemberPrefix(property)}${property.getName()}`,
      type: declarationTypeText(property),
      description: "",
    });
  }

  for (const method of declaration.getMethods()) {
    if (!isPublicClassMember(method)) continue;
    parameters.push({
      name: `${classMemberPrefix(method)}${method.getName()}`,
      type: `(${method.getParameters().map(parameterSignature).join(", ")}) => ${returnTypeText(method)}`,
      description: "",
    });
  }

  if (parameters.length === 0) return undefined;
  return { type: typeName, parameters };
}

function processExportDeclaration(
  declaration: TsNode | undefined,
  item: ExportInfo,
): TypeDoc | undefined {
  if (!declaration) return undefined;
  if (
    Node.isInterfaceDeclaration(declaration) ||
    Node.isTypeAliasDeclaration(declaration)
  ) {
    return processTypeOrInterface(declaration, item.name);
  }
  if (item.kind === "component") {
    return processComponentDeclaration(declaration, item.name);
  }
  if (item.kind === "function") {
    return processCallableDeclaration(declaration, item.name);
  }
  return classTypeDoc(declaration, item.name);
}

function addTypeDocsFromSourceFile(
  typeDocs: Map<string, TypeDoc>,
  sourceFilePath: string,
): void {
  const sourceFile =
    project.getSourceFile(sourceFilePath) ??
    project.addSourceFileAtPath(sourceFilePath);

  sourceFile.getExportedDeclarations().forEach((declarations, name) => {
    for (const rawDeclaration of declarations) {
      const declaration = resolveAliasedDeclaration(rawDeclaration);
      if (
        Node.isInterfaceDeclaration(declaration) ||
        Node.isTypeAliasDeclaration(declaration)
      ) {
        const typeInfo = processTypeOrInterface(declaration, name);
        if (typeInfo) typeDocs.set(name, typeInfo);
      }
    }
  });
}

function primitivePartTypeDocName(primitiveName: string, part: string): string {
  return `${primitiveName}${part}Props`;
}

function primitiveModuleSourceFile(primitiveName: string) {
  const cached = primitiveSourceFiles.get(primitiveName);
  if (cached) return cached;

  const index =
    project.getSourceFile(REACT_INDEX) ??
    project.addSourceFileAtPath(REACT_INDEX);
  const exportDecl = index
    .getExportDeclarations()
    .find((decl) => decl.getNamespaceExport()?.getName() === primitiveName);
  const moduleSpec = exportDecl?.getModuleSpecifierValue();
  if (!moduleSpec) return undefined;

  const modulePath = path.join(
    REPO_ROOT,
    "packages/react/src",
    moduleSpec.replace(/^\.\//, ""),
  );
  const sourcePath = [`${modulePath}.ts`, `${modulePath}.tsx`].find((file) =>
    fs.existsSync(file),
  );
  if (!sourcePath) return undefined;

  const sourceFile =
    project.getSourceFile(sourcePath) ??
    project.addSourceFileAtPath(sourcePath);
  primitiveSourceFiles.set(primitiveName, sourceFile);
  return sourceFile;
}

function primitivePartTypeDoc(
  primitiveName: string,
  part: string,
): TypeDoc | undefined {
  const sourceFile = primitiveModuleSourceFile(primitiveName);
  const declaration = chooseDeclaration(
    sourceFile?.getExportedDeclarations().get(part) ?? [],
  );
  if (!declaration) return undefined;

  const localName =
    declaration.getSymbol()?.getName() ??
    ("getName" in declaration ? declaration.getName?.() : undefined);
  if (!localName) return undefined;

  const namespace = declaration
    .getSourceFile()
    .getModules()
    .find((module) => module.getName() === localName);
  const propsType = namespace
    ?.getTypeAliases()
    .find((typeAlias) => typeAlias.getName() === "Props");
  const typeName = primitivePartTypeDocName(primitiveName, part);

  if (propsType) {
    return processTypeOrInterface(propsType, typeName);
  }

  const componentDoc = processComponentDeclaration(declaration, typeName);
  return componentDoc ? { ...componentDoc, type: typeName } : undefined;
}

function addPrimitivePartTypeDocs(
  typeDocs: Map<string, TypeDoc>,
  item: ExportInfo,
): void {
  if (item.section !== "primitives") return;

  for (const part of readPrimitiveParts(item.name)) {
    const name = primitivePartTypeDocName(item.name, part);
    if (typeDocs.has(name)) continue;
    const typeInfo = primitivePartTypeDoc(item.name, part);
    if (typeInfo) typeDocs.set(name, typeInfo);
  }
}

function writeTypeDocs(exports: ExportInfo[]): Set<string> {
  const typeDocs = new Map<string, TypeDoc>();

  addTypeDocsFromSourceFile(typeDocs, TYPE_DOCS_INPUT);
  for (const item of exports) {
    addPrimitivePartTypeDocs(typeDocs, item);
    if (!item.sourcePath) continue;
    if (typeDocs.has(item.name)) continue;
    const filePath = path.join(REPO_ROOT, item.sourcePath);
    if (!fs.existsSync(filePath)) continue;
    const sourceFile =
      project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    const declaration = chooseDeclaration(
      sourceFile.getExportedDeclarations().get(item.name) ?? [],
    );
    const typeInfo = processExportDeclaration(declaration, item);
    if (typeInfo) {
      typeDocs.set(item.name, typeInfo);
    } else {
      addTypeDocsFromSourceFile(typeDocs, filePath);
    }
  }

  writeTypeDocsFile(TYPE_DOCS_OUTPUT, typeDocs, (name) => name);
  return new Set(typeDocs.keys());
}

function typeDocBindingForIntegration(slug: string, name: string): string {
  return `${slug.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())}_${name}`;
}

function writeTypeDocsFile(
  outputPath: string,
  typeDocs: Map<string, TypeDoc>,
  bindingForName: (name: string) => string,
): void {
  const output = [
    "// AUTO-GENERATED by scripts/generate-docs.mts",
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

function collectExportTypeDocs(exports: ExportInfo[]): Map<string, TypeDoc> {
  const typeDocs = new Map<string, TypeDoc>();

  for (const item of exports) {
    if (!item.sourcePath) continue;
    if (typeDocs.has(item.name)) continue;
    const filePath = path.join(REPO_ROOT, item.sourcePath);
    if (!fs.existsSync(filePath)) continue;
    const sourceFile =
      project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    const declaration = chooseDeclaration(
      sourceFile.getExportedDeclarations().get(item.name) ?? [],
    );
    if (
      Node.isTypeAliasDeclaration(declaration) &&
      nonNullableUnionTypes(declaration.getType()).every(isPrimitiveType)
    ) {
      continue;
    }

    const typeInfo = processExportDeclaration(declaration, item);
    if (typeInfo) {
      typeDocs.set(item.name, typeInfo);
    }
  }

  return typeDocs;
}

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

function kebabCase(value: string): string {
  return value
    .replace(/^unstable_/, "unstable-")
    .replace(/Primitive$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function supportingTypeRole(kind: ExportKind): ExportInfo["pageRole"] {
  return kind === "interface" || kind === "type"
    ? "supporting-type"
    : "primary";
}

function pageForToolExport(name: string): string {
  if (name === "DataRenderers") {
    return "rendering";
  }
  if (
    name.includes("ToolArgs") ||
    name.includes("ToolExecution") ||
    name.includes("ToolCall")
  ) {
    return "status";
  }
  if (
    name.includes("ToolUI") ||
    name.includes("DataUI") ||
    name === "makeAssistantDataUI" ||
    name === "useAssistantDataUI"
  ) {
    return "rendering";
  }
  return "definition";
}

function classification(
  section: ApiSection,
  page: string,
  role: ExportInfo["pageRole"],
  rule: string,
  confidence: Classification["confidence"],
  reason: string,
): Classification {
  return { section, page, role, rule, confidence, reason };
}

function toolsRule(input: ClassificationInput): Classification | undefined {
  const { name, kind } = input;
  if (
    name === "tool" ||
    name === "Tool" ||
    name === "Toolkit" ||
    name === "ToolDefinition" ||
    name === "makeAssistantTool" ||
    name === "makeAssistantToolUI" ||
    name === "makeAssistantDataUI" ||
    name === "useAssistantTool" ||
    name === "useAssistantToolUI" ||
    name === "useAssistantDataUI" ||
    name === "useToolArgsStatus" ||
    name === "Tools" ||
    name === "DataRenderers" ||
    name.includes("AssistantTool") ||
    name.includes("AssistantDataUI") ||
    name.includes("ToolArgs") ||
    name.includes("ToolExecution") ||
    name.includes("ToolCall")
  ) {
    return classification(
      "tools",
      pageForToolExport(name),
      name === "Toolkit" || name === "ToolDefinition"
        ? "primary"
        : supportingTypeRole(kind),
      "feature:tools",
      "strong",
      "tool definition, toolkit, rendering, or status export",
    );
  }
}

function transportRule(input: ClassificationInput): Classification | undefined {
  const { name } = input;
  if (
    name.includes("AssistantTransport") ||
    name.includes("SendCommands") ||
    name.includes("Frame") ||
    name.startsWith("Serialized") ||
    name === "FRAME_MESSAGE_CHANNEL"
  ) {
    return classification(
      "transport",
      name.includes("Frame") ||
        name.startsWith("Serialized") ||
        name === "FRAME_MESSAGE_CHANNEL"
        ? "frame"
        : "assistant-transport",
      "primary",
      "feature:transport",
      "strong",
      "assistant transport, frame, or protocol export",
    );
  }
}

function externalStoreRule(
  input: ClassificationInput,
): Classification | undefined {
  const { name, kind } = input;
  if (
    name.includes("ExternalStore") ||
    name.includes("ExternalThread") ||
    name.includes("ExternalMessage") ||
    name.includes("MessageConverter") ||
    name === "getExternalStoreMessages" ||
    name === "bindExternalStoreMessage" ||
    name === "unstable_convertExternalMessages" ||
    name === "unstable_createMessageConverter"
  ) {
    return classification(
      "external-store",
      name.includes("Message") || name.includes("Converter")
        ? "message-conversion"
        : "runtime",
      PRIMARY_FEATURE_TYPES.has(name) ? "primary" : supportingTypeRole(kind),
      "feature:external-store",
      "strong",
      "external store runtime or message conversion export",
    );
  }
}

function modelContextRule(
  input: ClassificationInput,
): Classification | undefined {
  const { name, kind } = input;
  if (
    name.includes("ModelContext") ||
    name.includes("AssistantContext") ||
    name.includes("AssistantInstructions") ||
    name.includes("InlineRender") ||
    name === "mergeModelContexts" ||
    name === "ModelContextRegistry"
  ) {
    return classification(
      "model-context",
      name.includes("Registry") ? "registry" : "context",
      supportingTypeRole(kind),
      "feature:model-context",
      "strong",
      "model context, instructions, context, or registry export",
    );
  }
}

function voiceRule(input: ClassificationInput): Classification | undefined {
  const { name, kind } = input;
  if (
    name.includes("Voice") ||
    name.includes("Speech") ||
    name.includes("Dictation") ||
    name === "createVoiceSession"
  ) {
    return classification(
      "voice",
      name.includes("Speech") || name.includes("Dictation")
        ? "speech-dictation"
        : "session",
      PRIMARY_FEATURE_TYPES.has(name) ? "primary" : supportingTypeRole(kind),
      "feature:voice",
      "strong",
      "voice, speech, or dictation export",
    );
  }
}

function kindRule(input: ClassificationInput): Classification | undefined {
  const { name, kind, sourcePath } = input;
  let section: ApiSection | undefined;
  let forcedPrimary = false;
  if (
    name === "AuiIf" ||
    name === "AssistantIf" ||
    name.endsWith("Primitive")
  ) {
    section = "primitives";
  } else if (/^(unstable_)?use[A-Z]/.test(name)) {
    section = "hooks";
  } else if (name.endsWith("Provider")) {
    section = "context-providers";
  } else if (/Adapter(s)?$/.test(name)) {
    section = "adapters";
  } else if (/(Runtime|State)$/.test(name)) {
    section = "runtimes";
  } else if (
    [
      "ChatModelRunOptions",
      "ChatModelRunResult",
      "ChatModelRunUpdate",
      "CreateStartRunConfig",
      "CreateResumeRunConfig",
      "LanguageModelConfig",
    ].includes(name)
  ) {
    section = "adapters";
    forcedPrimary = true;
  }

  if (!section) return undefined;
  const placement = inferKindDocPlacement(name, section, sourcePath);
  if (!placement) return undefined;
  return classification(
    section,
    placement.page,
    forcedPrimary ? "primary" : placement.role,
    `kind:${section}`,
    "medium",
    `${section} export matched by public API shape`,
  );
}

function fallbackRule(input: ClassificationInput): Classification {
  return classification(
    "utilities",
    "miscellaneous",
    supportingTypeRole(input.kind),
    "fallback:utilities",
    "fallback",
    "no feature or kind rule matched",
  );
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  toolsRule,
  transportRule,
  externalStoreRule,
  modelContextRule,
  voiceRule,
  kindRule,
];

function classifyExport(input: ClassificationInput): Classification {
  for (const rule of CLASSIFICATION_RULES) {
    const result = rule(input);
    if (result) return result;
  }
  return fallbackRule(input);
}

function inferKindDocPlacement(
  name: string,
  section: ApiSection,
  sourcePath?: string,
): DocPlacement | undefined {
  const source = sourcePath ?? "";
  if (section === "primitives") {
    if (name === "AuiIf") return { page: "assistant-if", role: "primary" };
    if (name === "AssistantIf")
      return { page: "assistant-if", role: "related" };
    return { page: kebabCase(name), role: "primary" };
  }

  if (section === "hooks") {
    if (STATE_HOOKS.has(name)) {
      return { page: "state", role: "primary" };
    }
    if (RUNTIME_CREATION_HOOKS.has(name)) {
      return { page: "runtimes", role: "primary" };
    }
    if (COMPOSER_TRIGGER_HOOKS.has(name)) {
      return { page: "composer-triggers", role: "primary" };
    }
    if (source.includes("assistant-transport")) {
      return { page: "assistant-transport", role: "primary" };
    }
    if (source.includes("voice") || name.includes("Voice")) {
      return { page: "voice", role: "primary" };
    }
    if (
      name.includes("AssistantTool") ||
      name.includes("AssistantData") ||
      name.includes("AssistantInstructions") ||
      name.includes("AssistantContext") ||
      name.includes("InlineRender") ||
      name.includes("Interactable") ||
      name.includes("ToolArgs") ||
      source.includes("model-context")
    ) {
      return { page: "model-context", role: "primary" };
    }
    if (
      source.includes("/primitives/") ||
      source.includes("/legacy-runtime/hooks/") ||
      source.includes("/runtimes/cloud/") ||
      name.includes("Attachment") ||
      name.includes("Composer") ||
      name.includes("Message") ||
      name.includes("Quote") ||
      name.includes("RuntimeAdapters") ||
      name.includes("Scroll") ||
      name.includes("Thread") ||
      name.includes("Viewport")
    ) {
      return { page: "primitives", role: "primary" };
    }
    return undefined;
  }

  if (section === "adapters") {
    if (
      name === "ChatModelAdapter" ||
      name.includes("ChatModel") ||
      name.includes("LanguageModel") ||
      name.includes("RunConfig")
    ) {
      return { page: "model", role: "primary" };
    }
    if (name === "FeedbackAdapter") {
      return { page: "feedback-speech", role: "primary" };
    }
    if (name.includes("Attachment"))
      return { page: "attachments", role: "primary" };
    if (
      name.includes("Thread") ||
      name.includes("History") ||
      name.includes("ExternalStore") ||
      name.includes("MessageFormat")
    ) {
      return { page: "persistence", role: "primary" };
    }
    if (name.includes("Speech") || name.includes("Dictation")) {
      return { page: "feedback-speech", role: "primary" };
    }
    if (name.includes("Voice")) return { page: "voice", role: "primary" };
    if (name.includes("Suggestion"))
      return { page: "suggestions", role: "primary" };
    if (name.includes("RuntimeAdapter"))
      return { page: "runtime", role: "primary" };
    return undefined;
  }

  if (section === "context-providers") {
    if (name === "AssistantRuntimeProvider") {
      return { page: "assistant-runtime-provider", role: "primary" };
    }
    if (name === "AuiProvider") {
      return { page: "assistant-runtime-provider", role: "related" };
    }
    if (name.includes("Frame"))
      return { page: "assistant-frame-provider", role: "primary" };
    if (name.includes("ModelContext")) {
      return { page: "model-context-provider", role: "primary" };
    }
    return { page: "scoped-providers", role: "primary" };
  }

  if (section === "runtimes") {
    if (name === "PartState" || name === "EnrichedPartState") {
      return { page: "message-part-runtime", role: "primary" };
    }
    if (name.includes("Assistant"))
      return { page: "assistant-runtime", role: "primary" };
    if (name.includes("ThreadListItem")) {
      return { page: "thread-list-item-runtime", role: "primary" };
    }
    if (name.includes("ThreadList")) {
      return { page: "thread-list-runtime", role: "primary" };
    }
    if (name.includes("Thread"))
      return { page: "thread-runtime", role: "primary" };
    if (name.includes("Composer"))
      return { page: "composer-runtime", role: "primary" };
    if (name.includes("MessagePart")) {
      return { page: "message-part-runtime", role: "primary" };
    }
    if (name.includes("Message"))
      return { page: "message-runtime", role: "primary" };
    if (name.includes("Attachment")) {
      return { page: "attachment-runtime", role: "primary" };
    }
    if (name.includes("Voice")) return { page: "voice-state", role: "primary" };
    if (name.includes("Dictation"))
      return { page: "dictation-state", role: "primary" };
    if (name.includes("Queue")) return { page: "queue-state", role: "primary" };
  }

  return undefined;
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

function declarationPriority(node: TsNode): number {
  if (Node.isBindingElement(node)) return 0;
  if (Node.isVariableDeclaration(node)) return 0;
  if (Node.isClassDeclaration(node)) return 1;
  if (Node.isFunctionDeclaration(node)) return 2;
  if (Node.isInterfaceDeclaration(node)) return 3;
  if (Node.isTypeAliasDeclaration(node)) return 4;
  if (Node.isModuleDeclaration(node)) return 5;
  return 6;
}

function chooseDeclaration(declarations: TsNode[]): TsNode | undefined {
  return declarations
    .map(resolveAliasedDeclaration)
    .sort((a, b) => declarationPriority(a) - declarationPriority(b))[0];
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

function discoverExports(): ExportInfo[] {
  const sourceFile = project.addSourceFileAtPath(REACT_INDEX);
  const seen = new Set<string>();
  const exports: ExportInfo[] = [];

  const addExport = (
    name: string,
    resolved: TsNode | undefined,
    deprecated?: string,
  ) => {
    if (seen.has(name) || IGNORED_EXPORTS.has(name)) return;

    const sourcePath = relativeToRepo(resolved?.getSourceFile().getFilePath());
    const docs = extractJsDoc(resolved);
    const kind = classifyKind(resolved, name);
    const placement = classifyExport({ name, kind, sourcePath });
    const signature = extractSignature(resolved, name);

    seen.add(name);
    exports.push({
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
    });
  };

  for (const decl of sourceFile.getExportDeclarations()) {
    for (const entry of getExportEntries(decl)) {
      addExport(
        entry.name,
        resolveDeclaration(entry),
        exportEntryDeprecated(entry),
      );
    }
  }

  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    addExport(name, chooseDeclaration(declarations));
  }

  return exports.sort((a, b) => a.name.localeCompare(b.name));
}

function discoverIntegrationExports(
  entryPath: string,
  page: string,
): ExportInfo[] {
  const sourceFile =
    project.getSourceFile(entryPath) ?? project.addSourceFileAtPath(entryPath);
  const seen = new Set<string>();
  const exports: ExportInfo[] = [];

  const addExport = (
    name: string,
    resolved: TsNode | undefined,
    deprecated?: string,
  ) => {
    if (seen.has(name) || IGNORED_EXPORTS.has(name)) return;

    const sourcePath = relativeToRepo(resolved?.getSourceFile().getFilePath());
    const docs = extractJsDoc(resolved);
    const kind = classifyKind(resolved, name);
    if (kind === "interface" || kind === "type") return;

    const signature = extractSignature(resolved, name);

    seen.add(name);
    exports.push({
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
    });
  };

  for (const decl of sourceFile.getExportDeclarations()) {
    for (const entry of getExportEntries(decl)) {
      addExport(
        entry.name,
        resolveDeclaration(entry),
        exportEntryDeprecated(entry),
      );
    }
  }

  return exports.sort((a, b) => a.name.localeCompare(b.name));
}

function readPrimitiveParts(primitiveName: string): string[] {
  const sourceFile = primitiveModuleSourceFile(primitiveName);
  if (!sourceFile) return [];

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
  const fallbackParts = [...sourceFile.getExportedDeclarations().keys()]
    .filter(isPrimitivePart)
    .filter((name) => !orderedParts.includes(name))
    .sort((a, b) => a.localeCompare(b));

  return [...new Set([...orderedParts, ...fallbackParts])].sort((a, b) => {
    if (a === "Root") return -1;
    if (b === "Root") return 1;
    return 0;
  });
}

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
  return /^[A-Za-z0-9<][A-Za-z0-9 .,/@'()&+<>/-]*$/.test(value)
    ? value
    : JSON.stringify(value);
}

function titleForPage(
  page: string,
  exports: ExportInfo[],
  section?: ApiSection,
): string {
  const override = section ? PAGE_META[section]?.[page]?.title : undefined;
  if (override) return override;
  const primary = exports.filter((item) => item.pageRole === "primary");
  if (primary.length === 1) {
    const name = primary[0]!.name;
    if (name.endsWith("Primitive")) return name;
    return name;
  }
  return page
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function descriptionForPage(
  page: string,
  exports: ExportInfo[],
  section?: ApiSection,
): string {
  const override = section
    ? PAGE_META[section]?.[page]?.description
    : undefined;
  if (override) return override;
  const primary = exports.filter((item) => item.pageRole === "primary");
  if (primary.length === 1 && primary[0]!.jsDoc)
    return firstSentence(primary[0]!.jsDoc);
  return `Reference for ${titleForPage(page, exports, section)}.`;
}

function firstSentence(text: string): string {
  return text.split(/\n\n|(?<=\.)\s/)[0]!.trim();
}

function mdxEscape(value: string): string {
  return value
    .split(/(`+[^`]*`+)/g)
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

function codeFence(value: string): string {
  return ["```tsx", value, "```"].join("\n");
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

function firstCodeFence(source: string): string | undefined {
  return source.match(/```[\s\S]*?```/)?.[0];
}

function headingBlock(source: string, heading: string): string | undefined {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(
      `^#{2,4}\\s+${escaped}\\s*$([\\s\\S]*?)(?=^#{2,4}\\s+|\\{\\/\\* api-reference:start \\*\\/|$(?![\\s\\S]))`,
      "m",
    ),
  );
  return match?.[1]?.trim();
}

function mergeLegacyExamples(
  section: ApiSection,
  slug: string,
  source: string,
  examples: Map<string, string>,
): Map<string, string> {
  const addCodeFence = (name: string, block: string | undefined) => {
    if (examples.has(name)) return;
    const code = block ? firstCodeFence(block) : undefined;
    if (code) examples.set(name, exampleSlot(name, code));
  };

  if (section === "hooks" && slug === "state") {
    addCodeFence("useAuiState", headingBlock(source, "useAuiState"));
    addCodeFence("useAui", headingBlock(source, "useAui"));
    addCodeFence("useAuiEvent", headingBlock(source, "useAuiEvent"));
  }

  if (section === "adapters" && slug === "persistence") {
    addCodeFence(
      "ThreadHistoryAdapter",
      headingBlock(source, "Thread History"),
    );
    addCodeFence(
      "RemoteThreadListAdapter",
      headingBlock(source, "Remote Thread Lists"),
    );
  }

  if (section === "runtimes" && slug === "thread-runtime") {
    addCodeFence(
      "ThreadRuntime",
      headingBlock(source, "`useAui` (Thread Actions)"),
    );
    addCodeFence(
      "ThreadState",
      headingBlock(source, "`useAuiState` (Thread State)"),
    );
    addCodeFence(
      "ThreadViewportState",
      headingBlock(source, "`useThreadViewport`"),
    );
  }

  if (
    section === "context-providers" &&
    slug === "assistant-runtime-provider"
  ) {
    addCodeFence("AssistantRuntimeProvider", source);
  }

  return examples;
}

function readPageSlots(
  section: ApiSection,
  slug: string,
  items: ExportInfo[],
): PageSlots {
  const filePath = apiReferencePagePath(section, slug);
  if (!fs.existsSync(filePath)) {
    return {
      namedManual: new Map(),
      examples: new Map(),
      explicit: [],
    };
  }

  const source = fs.readFileSync(filePath, "utf8");
  assertPairedMdxMarkers(filePath, source);
  const manual = extractManualSlot(source);
  const namedManual = extractNamedManualSlots(source);
  const explicitExamples = extractExampleSlots(source);
  const examples = mergeLegacyExamples(
    section,
    slug,
    source,
    new Map(explicitExamples),
  );
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
    manual,
    namedManual,
    examples,
    explicit,
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
    if (a.pageRole !== b.pageRole) return a.pageRole === "primary" ? -1 : 1;
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
  if (!hasGeneratedEntryContent(item, typeDocNames, slots)) {
    return [];
  }

  const heading = "#".repeat(headingLevel);
  const lines = [`${heading} ${item.name}`, ""];
  if (item.deprecated) {
    lines.push(`Deprecated: ${mdxEscape(item.deprecated)}`, "");
  }
  if (item.jsDoc) {
    lines.push(mdxEscape(item.jsDoc), "");
  }
  const example = slots.examples.get(item.name);
  if (example) {
    lines.push(example, "");
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
  typeDocNames: Set<string>,
  slots: PageSlots,
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
    title: item.name,
    description: descriptionForPage(item.page, [item]),
    imports: generatedImportsForPage([item], typeDocNames),
    guideLine,
    slots,
    reference: generatePrimitiveReferenceRegion(item, typeDocNames, slots),
  });
}

function generatePrimitiveReferenceRegion(
  item: ExportInfo,
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
    "{/* AUTO-GENERATED by scripts/generate-docs.mts */}",
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
  return lines.join("\n");
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

function generateCompositionPage(): string {
  return [
    frontmatter(
      "Composition",
      "How to compose primitives with custom components using asChild.",
    ),
    GENERATED_PAGE_MARKER,
    "{/* Do not edit manually. */}",
    "",
    "`assistant-ui` primitives forward props, merge classes, and chain event handlers. Use `asChild` when you want a primitive to render your own component instead of its default element.",
    "",
    codeFence(
      [
        `import { ComposerPrimitive } from "@assistant-ui/react";`,
        "",
        `// Use the primitive's default button.`,
        `<ComposerPrimitive.Send>Send</ComposerPrimitive.Send>;`,
        "",
        `// Render your own button while keeping primitive behavior.`,
        `<ComposerPrimitive.Send asChild>`,
        `  <Button>Send</Button>`,
        `</ComposerPrimitive.Send>;`,
      ].join("\n"),
    ),
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

function writeSectionIndex(section: ApiSection, pages: PageSummary[]): void {
  const meta = SECTION_META[section];

  fs.writeFileSync(
    path.join(API_REFERENCE_DIR, section, "meta.json"),
    `${JSON.stringify(
      {
        title: meta.title,
        description: meta.description,
        overview: meta.overview,
        pages: pages.map((page) => page.slug),
      },
      null,
      2,
    )}\n`,
  );
}

function writeApiReferenceRoot(): void {
  fs.mkdirSync(API_REFERENCE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(API_REFERENCE_DIR, "meta.json"),
    `${JSON.stringify(
      {
        title: "API Reference",
        pages: ["overview", ...SECTION_ORDER.map((section) => section)],
      },
      null,
      2,
    )}\n`,
  );
}

function isGeneratedFile(filePath: string): boolean {
  return (
    fs.existsSync(filePath) &&
    fs.readFileSync(filePath, "utf8").includes(GENERATED_PAGE_MARKER)
  );
}

function shouldSkipAutoGeneration(filePath: string): boolean {
  return (
    fs.existsSync(filePath) &&
    fs.readFileSync(filePath, "utf8").includes(SKIP_AUTO_GENERATION_MARKER)
  );
}

function writeGeneratedFile(filePath: string, content: string): boolean {
  if (fs.existsSync(filePath) && !isGeneratedFile(filePath)) return false;
  fs.writeFileSync(filePath, content);
  return true;
}

function isGeneratedOrManagedApiPage(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const source = fs.readFileSync(filePath, "utf8");
  return source.includes(GENERATED_PAGE_MARKER);
}

function pruneGeneratedPage(filePath: string): void {
  if (shouldSkipAutoGeneration(filePath)) return;
  if (isGeneratedOrManagedApiPage(filePath)) {
    fs.unlinkSync(filePath);
  }
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

function writeApiReferencePages(
  exports: ExportInfo[],
  typeDocNames: Set<string>,
): void {
  writeApiReferenceRoot();
  const grouped = groupedBySectionAndPage(exports);

  for (const section of REACT_API_SECTIONS) {
    const sectionDir = path.join(API_REFERENCE_DIR, section);
    fs.mkdirSync(sectionDir, { recursive: true });

    const pages = [...(grouped.get(section) ?? new Map()).entries()]
      .filter(([, items]) => items.some((item) => item.pageRole === "primary"))
      .sort(([a], [b]) => a.localeCompare(b));

    const pageSummaries: PageSummary[] = [];

    for (const [slug, items] of pages) {
      const title = titleForPage(slug, items, section);
      const description = descriptionForPage(slug, items, section);
      pageSummaries.push({ slug, title, description });

      const filePath = path.join(sectionDir, `${slug}.mdx`);
      if (shouldSkipAutoGeneration(filePath)) {
        console.log(
          `Skipping auto-generation for API page: ${path.relative(REPO_ROOT, filePath)}`,
        );
        continue;
      }

      const imports = generatedImportsForPage(items, typeDocNames);
      const slots = readPageSlots(section, slug, items);
      const isSinglePrimitive = section === "primitives" && items.length === 1;
      const reference =
        isSinglePrimitive && items[0]
          ? generatePrimitiveReferenceRegion(items[0], typeDocNames, slots)
          : generateReferenceRegion(items, typeDocNames, slots);

      const body =
        isSinglePrimitive && items[0]
          ? generatePrimitivePage(items[0], typeDocNames, slots)
          : generateApiPage({ title, description, imports, slots, reference });

      assertPreservedSlots(filePath, slots, body);
      fs.writeFileSync(filePath, body);
    }

    if (section === "primitives") {
      writeGeneratedFile(
        path.join(sectionDir, "composition.mdx"),
        generateCompositionPage(),
      );
      pageSummaries.push({
        slug: "composition",
        title: "Composition",
        description:
          "How to compose primitives with custom components using asChild.",
      });
    }

    writeSectionIndex(section, pageSummaries);
    pruneStaleGeneratedPages(
      sectionDir,
      new Set(pageSummaries.map((page) => page.slug)),
    );
  }
}

function writeIntegrationPages(): void {
  const section = "integrations";
  const sectionDir = path.join(API_REFERENCE_DIR, section);
  fs.mkdirSync(sectionDir, { recursive: true });
  const allTypeDocs = new Map<string, TypeDoc>();

  for (const integration of INTEGRATION_PACKAGES) {
    const items = discoverIntegrationExports(
      integration.entry,
      integration.slug,
    );
    const typeDocs = collectExportTypeDocs(items);
    const typeDocBindings: TypeDocBindings = new Map(
      [...typeDocs.keys()].map((name) => [
        name,
        typeDocBindingForIntegration(integration.slug, name),
      ]),
    );
    for (const [name, typeDoc] of typeDocs) {
      allTypeDocs.set(
        typeDocBindingForIntegration(integration.slug, name),
        typeDoc,
      );
    }

    const filePath = path.join(sectionDir, `${integration.slug}.mdx`);
    const slots = readPageSlots(section, integration.slug, items);
    const reference = generateReferenceRegion(
      items,
      new Set(typeDocs.keys()),
      slots,
      typeDocBindings,
    );
    const body = generateApiPage({
      title: integration.packageName,
      description: integration.description,
      imports: generatedIntegrationImports(typeDocBindings),
      slots,
      reference,
    });

    assertPreservedSlots(filePath, slots, body);
    fs.writeFileSync(filePath, body);
  }

  writeSectionIndex(
    section,
    INTEGRATION_PACKAGES.map((integration) => ({
      slug: integration.slug,
      title: integration.packageName,
      description: integration.description,
    })),
  );
  writeTypeDocsFile(INTEGRATION_TYPE_DOCS_OUTPUT, allTypeDocs, (name) => name);
  pruneStaleGeneratedPages(
    sectionDir,
    new Set(INTEGRATION_PACKAGES.map((integration) => integration.slug)),
  );
}

function printClassificationDiagnostics(exports: ExportInfo[]): void {
  const ruleCounts = new Map<string, number>();
  const fallbackExports: string[] = [];
  const fallbackSupportingTypes: string[] = [];

  for (const item of exports) {
    ruleCounts.set(
      item.classificationRule,
      (ruleCounts.get(item.classificationRule) ?? 0) + 1,
    );
    if (item.classificationConfidence === "fallback") {
      if (item.pageRole === "supporting-type") {
        fallbackSupportingTypes.push(item.name);
      } else {
        fallbackExports.push(item.name);
      }
    }
  }

  console.log("API reference classification rules:");
  for (const [rule, count] of [...ruleCounts.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.log(`  ${rule}: ${count}`);
  }

  if (fallbackExports.length > 0) {
    console.log(
      `Fallback-classified exports: ${fallbackExports.sort().join(", ")}`,
    );
  }
  if (fallbackSupportingTypes.length > 0) {
    console.log(
      `Fallback-classified supporting types: ${fallbackSupportingTypes.length}`,
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

console.log("Discovering @assistant-ui/react exports...");
const exports = discoverExports();
printClassificationDiagnostics(exports);
const typeDocNames = writeTypeDocs(exports);
writeApiReferencePages(exports, typeDocNames);
writeIntegrationPages();

console.log(`Generated type docs for ${typeDocNames.size} exports`);
console.log(
  `Generated React API reference pages for ${exports.length} exports`,
);
