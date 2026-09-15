import { DataStreamStreamChunkType } from "./chunk-types";

const isString = (value: unknown): value is string => typeof value === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const shape =
  (required: readonly string[], optional: readonly string[] = []) =>
  (value: unknown): boolean =>
    isRecord(value) &&
    required.every((key) => isString(value[key])) &&
    optional.every((key) => value[key] === undefined || isString(value[key]));

const anyValue = () => true;

// A frame value is checked for the shape the decoder dereferences: the
// container its type declares, and the fields it reads without a guard.
// Optional fields stay optional so a producer that omits one is still
// accepted.
const validators: Record<
  DataStreamStreamChunkType,
  (value: unknown) => boolean
> = {
  [DataStreamStreamChunkType.TextDelta]: isString,
  [DataStreamStreamChunkType.ReasoningDelta]: isString,
  [DataStreamStreamChunkType.Error]: isString,

  [DataStreamStreamChunkType.Data]: Array.isArray,
  [DataStreamStreamChunkType.Annotation]: Array.isArray,
  [DataStreamStreamChunkType.AuiUpdateStateOperations]: Array.isArray,

  [DataStreamStreamChunkType.StartToolCall]: shape(
    ["toolCallId", "toolName"],
    ["parentId"],
  ),
  [DataStreamStreamChunkType.ToolCall]: shape(["toolCallId", "toolName"]),
  [DataStreamStreamChunkType.ToolCallArgsTextDelta]: shape([
    "toolCallId",
    "argsTextDelta",
  ]),
  [DataStreamStreamChunkType.ToolCallResult]: shape(["toolCallId"]),

  [DataStreamStreamChunkType.AuiTextDelta]: shape(["textDelta", "parentId"]),
  [DataStreamStreamChunkType.AuiReasoningDelta]: shape([
    "reasoningDelta",
    "parentId",
  ]),
  [DataStreamStreamChunkType.AuiReasoningPartStart]: shape(
    [],
    ["unstable_summary", "parentId"],
  ),

  // parentId is forwarded to withParentId, which contracts for a string, so a
  // non-string here would associate the part with the wrong parent.
  [DataStreamStreamChunkType.Source]: shape(
    ["sourceType", "id", "url"],
    ["title", "parentId"],
  ),
  [DataStreamStreamChunkType.File]: shape(["data", "mimeType"], ["parentId"]),
  [DataStreamStreamChunkType.AuiDataPart]: shape(["name"], ["parentId"]),

  [DataStreamStreamChunkType.FinishMessage]: isRecord,
  [DataStreamStreamChunkType.FinishStep]: isRecord,
  [DataStreamStreamChunkType.StartStep]: isRecord,

  // The decoder ignores these two, so any value is inert.
  [DataStreamStreamChunkType.RedactedReasoning]: anyValue,
  [DataStreamStreamChunkType.ReasoningSignature]: anyValue,
};

/**
 * An unknown frame type has no declared shape to check; it reaches the
 * decoder's own unsupported-type handling instead. The type comes off the
 * wire, so the lookup is guarded against inherited keys: `__proto__` would
 * otherwise resolve to a non-callable value and throw.
 */
export const isValidChunkValue = (type: string, value: unknown): boolean =>
  Object.prototype.hasOwnProperty.call(validators, type)
    ? validators[type as DataStreamStreamChunkType]!(value)
    : true;
