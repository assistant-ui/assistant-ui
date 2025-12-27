// Shared schemas
export {
  ToolUIIdSchema,
  type ToolUIId,
  ActionSchema,
  type Action,
  ActionButtonsPropsSchema,
  SerializableActionSchema,
  SerializableActionsSchema,
  type ActionsConfig,
  SerializableActionsConfigSchema,
  type SerializableActionsConfig,
  type SerializableAction,
} from "./shared";

// CodeBlock schemas
export {
  CodeBlockPropsSchema,
  type CodeBlockProps,
  SerializableCodeBlockSchema,
  type SerializableCodeBlock,
  parseSerializableCodeBlock,
} from "./code-block";

// Terminal schemas
export {
  TerminalPropsSchema,
  type TerminalProps,
  SerializableTerminalSchema,
  type SerializableTerminal,
  parseSerializableTerminal,
} from "./terminal";

// DataTable schemas
export {
  serializableColumnSchema,
  serializableDataSchema,
  serializableDataTableSchema,
  type SerializableDataTable,
  parseSerializableDataTable,
} from "./data-table";

// MediaCard schemas
export {
  mediaKind,
  type MediaCardKind,
  aspect,
  type Aspect,
  fit,
  type Fit,
  serializableMediaCardSchema,
  type SerializableMediaCard,
  parseSerializableMediaCard,
} from "./media-card";

// Manifest schemas
export {
  ComponentDefinitionSchema,
  type ComponentDefinition,
  UIManifestSchema,
  type UIManifest,
  MCPUICapabilitySchema,
  type MCPUICapability,
} from "./manifest";
