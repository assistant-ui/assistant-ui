import type { ApiSection, ExportInfo, ExportKind } from "./discover.mts";

export type Classification = {
  section: ApiSection;
  page: string;
  role: ExportInfo["pageRole"];
  rule: string;
  confidence: ExportInfo["classificationConfidence"];
  reason: string;
};

export type ClassificationInput = {
  name: string;
  kind: ExportKind;
  sourcePath?: string | undefined;
};

type ClassificationRule = (
  input: ClassificationInput,
) => Classification | undefined;

type DocPlacement = { page: string; role: ExportInfo["pageRole"] };

const PRIMARY_FEATURE_TYPES = new Set([
  "RealtimeVoiceAdapter",
  "VoiceSessionState",
  "VoiceSessionControls",
  "VoiceSessionHelpers",
  "SpeechSynthesisAdapter",
  "DictationAdapter",
  "DictationState",
  "ExternalStoreAdapter",
  "ExternalThreadQueueAdapter",
  "ExternalThreadProps",
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
  "unstable_useLiveCompletionAdapter",
  "unstable_useTriggerPopoverRootContext",
  "unstable_useTriggerPopoverRootContextOptional",
  "unstable_useTriggerPopoverScopeContext",
  "unstable_useTriggerPopoverScopeContextOptional",
  "unstable_useTriggerPopoverTriggers",
  "unstable_useTriggerPopoverTriggersOptional",
]);

function kebabCase(value: string): string {
  return value
    .replace(/^unstable_/, "unstable-")
    .replace(/Primitive$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

export function supportingTypeRole(kind: ExportKind): ExportInfo["pageRole"] {
  return kind === "interface" || kind === "type"
    ? "supporting-type"
    : "primary";
}

// Like supportingTypeRole, but values render as "related" rather than "primary"
// so a confidently-classified page's core APIs sort above them. Used for
// loosely-placed exports (suffix fallback, co-location) that earned a spot on a
// page but should not lead it.
export function relatedOrSupportingRole(
  kind: ExportKind,
): ExportInfo["pageRole"] {
  return kind === "interface" || kind === "type"
    ? "supporting-type"
    : "related";
}

export function pageForToolExport(name: string): string {
  if (
    name === "makeAssistantTool" ||
    name === "useAssistantTool" ||
    name === "AssistantTool" ||
    name === "AssistantToolProps"
  ) {
    return "component-tools";
  }
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
  return "toolkits";
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
    name === "ToolsConfig" ||
    name === "McpAppResourceOutput" ||
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
      "tool definition, toolkit, component registration, rendering, or status export",
    );
  }
  return undefined;
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
    // Transport frame/protocol helpers intentionally render as primary entries:
    // the page split already groups them, and demoting them hides important protocol docs.
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
  return undefined;
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
  return undefined;
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
  return undefined;
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
  return undefined;
}

const GENERATIVE_UI_SPEC_TYPES = new Set([
  "GenerativeUISpec",
  "GenerativeUINode",
  "GenerativeUIMessagePart",
]);

export const GENERATIVE_UI_PACKAGE_EXPORTS = new Map<
  string,
  { page: string; role: ExportInfo["pageRole"] }
>([
  ["JSONGenerativeUI", { page: "json-generative-ui", role: "primary" }],
  ["JSONGenerativeUIOptions", { page: "json-generative-ui", role: "primary" }],
  ["PresentToolOptions", { page: "json-generative-ui", role: "primary" }],
  ["PresentTool", { page: "json-generative-ui", role: "supporting-type" }],
  ["PromptUserTool", { page: "json-generative-ui", role: "supporting-type" }],

  ["defineGenerativeComponents", { page: "components", role: "primary" }],
  ["defaultGenerativeUILibrary", { page: "components", role: "primary" }],
  ["GenerativeUILibrary", { page: "components", role: "primary" }],
  ["GenerativeUIComponent", { page: "components", role: "primary" }],

  ["createActionRegistry", { page: "actions", role: "primary" }],
  ["emptyActionRegistry", { page: "actions", role: "primary" }],
  ["ActionRegistry", { page: "actions", role: "primary" }],
  ["ActionHandler", { page: "actions", role: "primary" }],
  ["ActionDispatchContext", { page: "actions", role: "primary" }],

  ["renderGenerativeUI", { page: "rendering", role: "primary" }],
  ["generativeUIToJSX", { page: "rendering", role: "primary" }],
  ["buildPresentParameters", { page: "rendering", role: "primary" }],
  ["GenerativeUIRenderContext", { page: "rendering", role: "primary" }],

  ["TEXT_SIZES", { page: "tokens", role: "primary" }],
  ["IMAGE_SIZE_TOKENS", { page: "tokens", role: "primary" }],
  ["WEIGHTS", { page: "tokens", role: "primary" }],
  ["COLORS", { page: "tokens", role: "primary" }],
  ["ALIGNS", { page: "tokens", role: "primary" }],
  ["JUSTIFIES", { page: "tokens", role: "primary" }],
  ["BUTTON_STYLES", { page: "tokens", role: "primary" }],
  ["ALERT_TONES", { page: "tokens", role: "primary" }],
  ["TextSize", { page: "tokens", role: "supporting-type" }],
  ["ImageSize", { page: "tokens", role: "supporting-type" }],
  ["Weight", { page: "tokens", role: "supporting-type" }],
  ["Color", { page: "tokens", role: "supporting-type" }],
  ["Align", { page: "tokens", role: "supporting-type" }],
  ["Justify", { page: "tokens", role: "supporting-type" }],
  ["ButtonStyle", { page: "tokens", role: "supporting-type" }],
  ["AlertTone", { page: "tokens", role: "supporting-type" }],

  ["toSlackBlocks", { page: "slack", role: "primary" }],
  ["decodeBlockAction", { page: "slack", role: "primary" }],
  ["ToSlackBlocksOptions", { page: "slack", role: "primary" }],
  ["SlackBlocksResult", { page: "slack", role: "primary" }],
  ["SlackConversionWarning", { page: "slack", role: "primary" }],
  ["SlackBlock", { page: "slack", role: "supporting-type" }],
  ["SlackActionElement", { page: "slack", role: "supporting-type" }],
  ["SlackActionsBlock", { page: "slack", role: "supporting-type" }],
  ["SlackAlertBlock", { page: "slack", role: "supporting-type" }],
  ["SlackAlertLevel", { page: "slack", role: "supporting-type" }],
  ["SlackButtonElement", { page: "slack", role: "supporting-type" }],
  ["SlackCardBlock", { page: "slack", role: "supporting-type" }],
  ["SlackCarouselBlock", { page: "slack", role: "supporting-type" }],
  ["SlackCheckboxesElement", { page: "slack", role: "supporting-type" }],
  ["SlackContextBlock", { page: "slack", role: "supporting-type" }],
  ["SlackDataTableBlock", { page: "slack", role: "supporting-type" }],
  ["SlackDataTableCell", { page: "slack", role: "supporting-type" }],
  ["SlackDataTableRawNumberCell", { page: "slack", role: "supporting-type" }],
  ["SlackDataTableRawTextCell", { page: "slack", role: "supporting-type" }],
  ["SlackDatePickerElement", { page: "slack", role: "supporting-type" }],
  ["SlackDividerBlock", { page: "slack", role: "supporting-type" }],
  ["SlackHeaderBlock", { page: "slack", role: "supporting-type" }],
  ["SlackImageBlock", { page: "slack", role: "supporting-type" }],
  ["SlackInputBlock", { page: "slack", role: "supporting-type" }],
  ["SlackMarkdownBlock", { page: "slack", role: "supporting-type" }],
  ["SlackMrkdwnText", { page: "slack", role: "supporting-type" }],
  ["SlackOption", { page: "slack", role: "supporting-type" }],
  ["SlackPlainText", { page: "slack", role: "supporting-type" }],
  ["SlackPlainTextInputElement", { page: "slack", role: "supporting-type" }],
  ["SlackRadioButtonsElement", { page: "slack", role: "supporting-type" }],
  ["SlackSectionBlock", { page: "slack", role: "supporting-type" }],
  ["SlackStaticSelectElement", { page: "slack", role: "supporting-type" }],
  ["SlackTextObject", { page: "slack", role: "supporting-type" }],
]);

function generativeUIPackageRule(
  input: ClassificationInput,
): Classification | undefined {
  const placement = GENERATIVE_UI_PACKAGE_EXPORTS.get(input.name);
  if (!placement) return undefined;
  return classification(
    "generative-ui",
    placement.page,
    placement.role,
    "feature:react-generative-ui",
    "strong",
    "@assistant-ui/react-generative-ui package export",
  );
}

function generativeUIRule(
  input: ClassificationInput,
): Classification | undefined {
  const { name, kind } = input;
  if (!name.startsWith("GenerativeUI")) return undefined;
  // The spec format types are the cross-reference targets
  // ({@link GenerativeUISpec}, {@link GenerativeUIMessagePart}); they must be
  // primary to earn an anchor. The renderer, error, and registry/prop helpers
  // live on the rendering page.
  const isSpecType = GENERATIVE_UI_SPEC_TYPES.has(name);
  return classification(
    "generative-ui",
    isSpecType ? "spec" : "rendering",
    isSpecType ? "primary" : supportingTypeRole(kind),
    "feature:generative-ui",
    "strong",
    "generative UI spec, renderer, or component registry export",
  );
}

const LEGACY_INTERACTABLE_EXPORTS = new Set([
  "useAssistantInteractable",
  "AssistantInteractableProps",
  "useInteractableState",
  "Interactables",
  "InteractableStateSchema",
  "InteractablesState",
  "InteractableDefinition",
  "InteractableRegistration",
  "InteractablesMethods",
  "InteractablePersistedState",
  "InteractablePersistenceAdapter",
  "InteractablePersistenceStatus",
  "InteractablesClientSchema",
]);

function interactablesRule(
  input: ClassificationInput,
): Classification | undefined {
  const { name, kind } = input;
  const isUnstableInteractable =
    name.startsWith("unstable_") && name.toLowerCase().includes("interactable");
  const isUnstableInteractableType =
    name.startsWith("Unstable_") && name.includes("Interactable");

  if (isUnstableInteractable || isUnstableInteractableType) {
    return classification(
      "tools",
      "interactables",
      supportingTypeRole(kind),
      "feature:interactables",
      "strong",
      "unstable interactables API export",
    );
  }

  if (LEGACY_INTERACTABLE_EXPORTS.has(name)) {
    return classification(
      "tools",
      "interactables-legacy",
      supportingTypeRole(kind),
      "feature:interactables-legacy",
      "strong",
      "legacy interactables API export",
    );
  }
  return undefined;
}

function kindRule(input: ClassificationInput): Classification | undefined {
  const { name, sourcePath } = input;
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
  // Suffix match routes *Tool/*Toolkit helpers the exact-name list misses.
  // Value helpers render as "related" so the page's core tool APIs (tool,
  // Toolkit, ToolDefinition) sort above them; types stay supporting.
  if (/Tool(kit)?$/.test(input.name)) {
    return classification(
      "tools",
      pageForToolExport(input.name),
      relatedOrSupportingRole(input.kind),
      "fallback:name",
      "medium",
      "name ends in Tool/Toolkit",
    );
  }
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
  generativeUIPackageRule,
  generativeUIRule,
  interactablesRule,
  kindRule,
];

/** Exact-name overrides consulted before any heuristic. The escape hatch for
 *  exports the rules can't place from name/source shape alone (mirrors
 *  MANUAL_API_REFERENCE_LINKS in discover.mts): pinning one is a single entry
 *  here instead of contorting a regex rule. */
const MANUAL_CLASSIFICATIONS = new Map<
  string,
  { section: ApiSection; page: string; role: ExportInfo["pageRole"] }
>([
  // Constructor for the `groupBy` prop of <MessagePrimitive.GroupedParts>; its
  // home is the message primitive page, beside the part it configures.
  [
    "groupPartByType",
    { section: "primitives", page: "message", role: "related" },
  ],
  // MCP app embedding/rendering surface.
  ["McpAppRenderer", { section: "tools", page: "rendering", role: "primary" }],
  [
    "McpAppsRemoteHost",
    { section: "tools", page: "rendering", role: "primary" },
  ],
  [
    "getMcpAppFromToolPart",
    { section: "tools", page: "rendering", role: "primary" },
  ],
  // Marks a component subtree visible to the assistant's model context.
  [
    "makeAssistantVisible",
    { section: "model-context", page: "context", role: "primary" },
  ],
  // Serializable thread/message snapshot used for persistence.
  [
    "ExportedMessageRepository",
    { section: "adapters", page: "persistence", role: "primary" },
  ],
]);

export function classifyExport(input: ClassificationInput): Classification {
  const manual = MANUAL_CLASSIFICATIONS.get(input.name);
  if (manual) {
    return classification(
      manual.section,
      manual.page,
      manual.role,
      "manual",
      "strong",
      "manually pinned classification",
    );
  }
  for (const rule of CLASSIFICATION_RULES) {
    const result = rule(input);
    if (result) return result;
  }
  return fallbackRule(input);
}

export function inferKindDocPlacement(
  name: string,
  section: ApiSection,
  sourcePath?: string,
): DocPlacement | undefined {
  const source = (sourcePath ?? "").replaceAll("\\", "/");
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
      return { page: "feedback", role: "primary" };
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
    // Order matters: ThreadListItem includes ThreadList, and ThreadList includes Thread.
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
    // Order matters: MessagePart includes Message.
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
