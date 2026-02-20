import { isToolUIPart, getToolName, type UIMessage } from "ai";
import {
  unstable_createMessageConverter,
  type ComponentMessagePart,
  type ReasoningMessagePart,
  type ToolCallMessagePart,
  type TextMessagePart,
  type DataMessagePart,
  type SourceMessagePart,
  type useExternalMessageConverter,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { useMemo } from "react";

type MessageMetadata = ThreadMessageLike["metadata"];
export const unstable_AISDK_JSON_RENDER_COMPONENT_NAME = "json-render";
const INTERNAL_DATA_SPEC_PART_NAME = "__assistant_ui_internal_data_spec";

const isJSONObject = (value: unknown): value is ReadonlyJSONObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isMutableObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const shouldLogWarnings = () => {
  const nodeEnv = (
    globalThis as {
      process?: { env?: { NODE_ENV?: string } };
    }
  ).process?.env?.NODE_ENV;
  return nodeEnv !== "production";
};

const warn = (message: string) => {
  if (shouldLogWarnings()) {
    console.warn(message);
  }
};

const getDataPartPayload = (part: unknown): unknown => {
  if (!isMutableObject(part)) return undefined;
  return part.data;
};

const toComponentPart = (part: unknown): ComponentMessagePart | null => {
  if (!part || typeof part !== "object") return null;

  const source = part as {
    type?: string;
    name?: unknown;
    instanceId?: unknown;
    props?: unknown;
    parentId?: unknown;
    data?: unknown;
  };

  if (source.type === "component") {
    if (typeof source.name !== "string" || source.name.length === 0)
      return null;
    if (
      source.instanceId !== undefined &&
      typeof source.instanceId !== "string"
    )
      return null;
    if (source.props !== undefined && !isJSONObject(source.props)) return null;
    if (source.parentId !== undefined && typeof source.parentId !== "string")
      return null;

    return {
      type: "component",
      name: source.name,
      ...(source.instanceId !== undefined
        ? { instanceId: source.instanceId }
        : {}),
      ...(source.props !== undefined ? { props: source.props } : {}),
      ...(source.parentId !== undefined ? { parentId: source.parentId } : {}),
    } satisfies ComponentMessagePart;
  }

  if (source.type === "data-component") {
    if (!isJSONObject(source.data)) return null;
    const name = source.data.name;
    const instanceId = source.data.instanceId;
    const props = source.data.props;
    const parentId = source.data.parentId;

    if (typeof name !== "string" || name.length === 0) return null;
    if (instanceId !== undefined && typeof instanceId !== "string") return null;
    if (props !== undefined && !isJSONObject(props)) return null;
    if (parentId !== undefined && typeof parentId !== "string") return null;

    return {
      type: "component",
      name,
      ...(instanceId !== undefined ? { instanceId } : {}),
      ...(props !== undefined ? { props } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
    } satisfies ComponentMessagePart;
  }

  return null;
};

type JsonPatchOperation = {
  op: "add" | "replace" | "remove";
  path: string;
  value?: unknown;
};

type DataSpecChunk = {
  readonly type: "data-spec";
  readonly data?: unknown;
};

type DataSpecUpdate = {
  instanceId: string;
  name?: string;
  parentId?: string;
  sequence: number;
  props?: ReadonlyJSONObject;
  spec?: ReadonlyJSONObject;
  patch?: readonly JsonPatchOperation[];
};

type DataSpecState = {
  instanceId: string;
  name: string;
  parentId?: string;
  sequence?: number;
  props?: ReadonlyJSONObject;
  spec?: ReadonlyJSONObject;
};

type InternalDataSpecPayload = {
  __assistantUiDataSpec: true;
  update: DataSpecUpdate;
};

export type unstable_AISDKDataSpecValidationContext = {
  instanceId: string;
  name: string;
  parentId?: string;
  sequence?: number;
  props?: ReadonlyJSONObject;
  spec: ReadonlyJSONObject;
};

export type unstable_AISDKDataSpecTelemetryEvent =
  | {
      type: "missing-sequence-dropped";
      instanceId: string;
    }
  | {
      type: "invalid-sequence-dropped";
      instanceId: string;
    }
  | {
      type: "malformed-patch-dropped";
      instanceId: string;
      sequence?: number;
    }
  | {
      type: "stale-sequence-ignored";
      instanceId: string;
      sequence: number;
      latestSequence: number;
    };

export type unstable_AISDKDataSpecOptions = {
  validateSpec?:
    | ((context: unstable_AISDKDataSpecValidationContext) => boolean)
    | undefined;
  repairSpec?:
    | ((
        context: unstable_AISDKDataSpecValidationContext,
      ) => ReadonlyJSONObject | null | undefined)
    | undefined;
  onTelemetry?:
    | ((event: unstable_AISDKDataSpecTelemetryEvent) => void)
    | undefined;
};

type AISDKMessageConverterMetadata = useExternalMessageConverter.Metadata & {
  readonly unstable_dataSpec?: unstable_AISDKDataSpecOptions;
};

const isDataSpecChunk = (part: unknown): part is DataSpecChunk => {
  if (!part || typeof part !== "object") return false;
  return (part as { type?: unknown }).type === "data-spec";
};

const isJsonPatchOperation = (value: unknown): value is JsonPatchOperation => {
  if (!value || typeof value !== "object") return false;
  const op = (value as { op?: unknown }).op;
  const path = (value as { path?: unknown }).path;
  return (
    (op === "add" || op === "replace" || op === "remove") &&
    typeof path === "string"
  );
};

const decodeJsonPointerToken = (token: string) =>
  token.replace(/~1/g, "/").replace(/~0/g, "~");

const parseJsonPointer = (path: string): string[] | null => {
  if (path === "") return [];
  if (!path.startsWith("/")) return null;
  return path
    .slice(1)
    .split("/")
    .map((segment) => decodeJsonPointerToken(segment));
};

const deepClone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const readArrayIndex = (
  key: string,
  length: number,
  {
    allowEnd = false,
  }: {
    allowEnd?: boolean;
  } = {},
) => {
  if (allowEnd && key === "-") return length;
  const index = Number(key);
  if (!Number.isInteger(index)) return null;
  if (index < 0) return null;
  return index;
};

const FORBIDDEN_JSON_POINTER_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

const hasOwnKey = (container: Record<string, unknown>, key: string) => {
  return Object.prototype.hasOwnProperty.call(container, key);
};

const isForbiddenJsonPointerKey = (key: string) => {
  return FORBIDDEN_JSON_POINTER_KEYS.has(key);
};

const applyJsonPatchOperation = (
  current: ReadonlyJSONObject,
  operation: JsonPatchOperation,
): ReadonlyJSONObject | null => {
  const segments = parseJsonPointer(operation.path);
  if (!segments) return null;

  if (segments.length === 0) {
    if (operation.op === "remove") return null;
    if (!isJSONObject(operation.value)) return null;
    return deepClone(operation.value);
  }

  const cloned: unknown = deepClone(current);
  let container: unknown = cloned;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!;
    if (isForbiddenJsonPointerKey(key)) return null;

    if (Array.isArray(container)) {
      const index = readArrayIndex(key, container.length);
      if (index == null || index >= container.length) return null;
      container = container[index];
      continue;
    }

    if (!isMutableObject(container) || !hasOwnKey(container, key)) return null;
    container = container[key];
  }

  const finalKey = segments[segments.length - 1]!;
  if (isForbiddenJsonPointerKey(finalKey)) return null;

  const value = operation.value;
  if (operation.op !== "remove" && value === undefined) return null;

  if (Array.isArray(container)) {
    const addIndex = readArrayIndex(finalKey, container.length, {
      allowEnd: true,
    });
    const index = readArrayIndex(finalKey, container.length);

    if (operation.op === "add") {
      if (addIndex == null || addIndex > container.length) return null;
      container.splice(addIndex, 0, value);
    } else if (operation.op === "replace") {
      if (index == null || index >= container.length) return null;
      container[index] = value;
    } else {
      if (index == null || index >= container.length) return null;
      container.splice(index, 1);
    }
  } else {
    if (!isMutableObject(container)) return null;
    const hasOwnFinalKey = hasOwnKey(container, finalKey);
    if (operation.op === "replace" && !hasOwnFinalKey) return null;
    if (operation.op === "remove" && !hasOwnFinalKey) return null;

    if (operation.op === "remove") {
      if (!Reflect.deleteProperty(container, finalKey)) return null;
    } else {
      try {
        Object.defineProperty(container, finalKey, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } catch {
        return null;
      }
    }
  }

  if (!isJSONObject(cloned)) return null;
  return cloned;
};

const applyJsonPatchOperations = (
  current: ReadonlyJSONObject,
  operations: readonly JsonPatchOperation[],
): ReadonlyJSONObject | null => {
  let next = current;
  for (const operation of operations) {
    const patched = applyJsonPatchOperation(next, operation);
    if (!patched) return null;
    next = patched;
  }
  return next;
};

type DataSpecChunkDecodeResult =
  | { type: "valid"; update: DataSpecUpdate }
  | { type: "invalid" }
  | { type: "missing-sequence"; instanceId: string }
  | { type: "invalid-sequence"; instanceId: string };

const isValidSequence = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value >= 0;

const toDataSpecUpdateFromData = (source: unknown): DataSpecUpdate | null => {
  if (!isJSONObject(source)) return null;

  const data = source as {
    instanceId?: unknown;
    name?: unknown;
    parentId?: unknown;
    sequence?: unknown;
    props?: unknown;
    spec?: unknown;
    patch?: unknown;
  };

  if (typeof data.instanceId !== "string" || data.instanceId.length === 0)
    return null;

  if (
    data.name !== undefined &&
    (typeof data.name !== "string" || data.name.length === 0)
  ) {
    return null;
  }

  if (data.parentId !== undefined && typeof data.parentId !== "string")
    return null;

  if (!isValidSequence(data.sequence)) return null;

  if (data.props !== undefined && !isJSONObject(data.props)) return null;
  if (data.spec !== undefined && !isJSONObject(data.spec)) return null;
  if (data.patch !== undefined) {
    if (!Array.isArray(data.patch)) return null;
    if (!data.patch.every(isJsonPatchOperation)) return null;
  }

  return {
    instanceId: data.instanceId,
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
    sequence: data.sequence,
    ...(data.props !== undefined ? { props: data.props } : {}),
    ...(data.spec !== undefined ? { spec: data.spec } : {}),
    ...(data.patch !== undefined ? { patch: data.patch } : {}),
  } satisfies DataSpecUpdate;
};

const decodeDataSpecChunk = (
  part: unknown,
): DataSpecChunkDecodeResult | null => {
  if (!isDataSpecChunk(part)) return null;

  const source = part.data;
  if (!isJSONObject(source)) return { type: "invalid" };

  const instanceId = source.instanceId;
  if (typeof instanceId !== "string" || instanceId.length === 0) {
    return { type: "invalid" };
  }

  if (source.sequence === undefined) {
    return { type: "missing-sequence", instanceId };
  }

  if (!isValidSequence(source.sequence)) {
    return { type: "invalid-sequence", instanceId };
  }

  const update = toDataSpecUpdateFromData(source);
  if (!update) return { type: "invalid" };
  return { type: "valid", update };
};

const toInternalDataSpecPayload = (
  update: DataSpecUpdate,
): InternalDataSpecPayload => ({
  __assistantUiDataSpec: true,
  update,
});

const toInternalDataSpecPart = (
  update: DataSpecUpdate,
): DataMessagePart<InternalDataSpecPayload> => ({
  type: "data",
  name: INTERNAL_DATA_SPEC_PART_NAME,
  data: toInternalDataSpecPayload(update),
});

const getInternalDataSpecUpdate = (
  part: MessageContent[number],
): DataSpecUpdate | null => {
  if (part.type !== "data") return null;
  if (part.name !== INTERNAL_DATA_SPEC_PART_NAME) return null;
  if (!isMutableObject(part.data)) return null;
  if (part.data.__assistantUiDataSpec !== true) return null;
  return toDataSpecUpdateFromData(part.data.update);
};

type DataSpecApplyResult =
  | { type: "applied" }
  | {
      type: "ignored-stale-sequence";
      sequence: number;
      latestSequence: number;
    }
  | { type: "invalid"; reason: "malformed-patch" | "invalid-spec" };

const mergeDataSpecFields = (
  current: DataSpecState,
  update: DataSpecUpdate,
) => {
  return {
    name: update.name ?? current.name,
    ...(update.parentId !== undefined
      ? { parentId: update.parentId }
      : current.parentId !== undefined
        ? { parentId: current.parentId }
        : {}),
    sequence: update.sequence,
    ...(update.props !== undefined
      ? { props: update.props }
      : current.props !== undefined
        ? { props: current.props }
        : {}),
  };
};

const resolveDataSpecValidationContext = (
  current: DataSpecState,
  update: DataSpecUpdate,
  spec: ReadonlyJSONObject,
): unstable_AISDKDataSpecValidationContext => {
  const mergedFields = mergeDataSpecFields(current, update);
  return {
    instanceId: update.instanceId,
    ...mergedFields,
    spec,
  };
};

const validateAndRepairSpec = (
  options: unstable_AISDKDataSpecOptions | undefined,
  current: DataSpecState,
  update: DataSpecUpdate,
  spec: ReadonlyJSONObject,
): ReadonlyJSONObject | null => {
  if (!options?.validateSpec) {
    return spec;
  }

  const initialContext = resolveDataSpecValidationContext(
    current,
    update,
    spec,
  );
  if (options.validateSpec(initialContext)) {
    return spec;
  }

  if (!options.repairSpec) {
    return null;
  }

  const repaired = options.repairSpec(initialContext);
  if (!isJSONObject(repaired)) {
    return null;
  }

  const repairedSpec = deepClone(repaired);
  const repairedContext = resolveDataSpecValidationContext(
    current,
    update,
    repairedSpec,
  );
  if (!options.validateSpec(repairedContext)) {
    return null;
  }

  return repairedSpec;
};

const applyDataSpecUpdate = (
  stateByInstanceId: Map<string, DataSpecState>,
  update: DataSpecUpdate,
  options?: unstable_AISDKDataSpecOptions,
): DataSpecApplyResult => {
  const current = stateByInstanceId.get(update.instanceId) ?? {
    instanceId: update.instanceId,
    name: update.name ?? unstable_AISDK_JSON_RENDER_COMPONENT_NAME,
  };

  if (current.sequence !== undefined && update.sequence <= current.sequence) {
    return {
      type: "ignored-stale-sequence",
      sequence: update.sequence,
      latestSequence: current.sequence,
    };
  }

  let nextSpec = current.spec;
  if (update.spec !== undefined) {
    nextSpec = deepClone(update.spec);
  }

  if (update.patch !== undefined) {
    if (!nextSpec) return { type: "invalid", reason: "malformed-patch" };
    const patched = applyJsonPatchOperations(nextSpec, update.patch);
    if (!patched) return { type: "invalid", reason: "malformed-patch" };
    nextSpec = patched;
  }

  if (nextSpec !== undefined) {
    const validatedSpec = validateAndRepairSpec(
      options,
      current,
      update,
      nextSpec,
    );
    if (!validatedSpec) return { type: "invalid", reason: "invalid-spec" };
    nextSpec = validatedSpec;
  }

  stateByInstanceId.set(update.instanceId, {
    instanceId: update.instanceId,
    ...mergeDataSpecFields(current, update),
    ...(nextSpec !== undefined ? { spec: nextSpec } : {}),
  });

  return { type: "applied" };
};

function stripClosingDelimiters(json: string): string {
  return json.replace(/[}\]"]+$/, "");
}

/**
 * Resolves the interrupt fields for a tool call part.
 *
 * Two interrupt paths for tool approvals:
 * 1. AI SDK server-side approval: approval-requested state with part.approval payload
 * 2. Frontend tools: toolStatuses interrupt from context.human()
 */
function getToolInterrupt(
  part: { state: string; approval?: unknown },
  toolStatus: { type: string; payload?: unknown } | undefined,
): Record<string, unknown> {
  if (part.state === "approval-requested" && "approval" in part) {
    return {
      interrupt: {
        type: "human" as const,
        payload: (part as { approval: unknown }).approval,
      },
      status: {
        type: "requires-action" as const,
        reason: "interrupt" as const,
      },
    };
  }

  if (toolStatus?.type === "interrupt") {
    return {
      interrupt: toolStatus.payload,
      status: {
        type: "requires-action" as const,
        reason: "interrupt" as const,
      },
    };
  }

  return {};
}

type MessageContent = Exclude<ThreadMessageLike["content"], string>;

function convertParts(
  message: UIMessage,
  metadata: AISDKMessageConverterMetadata,
): MessageContent {
  if (!message.parts || message.parts.length === 0) {
    return [];
  }

  const converted: MessageContent = [];
  const dataSpecTelemetry = metadata.unstable_dataSpec?.onTelemetry;

  for (const part of message.parts) {
    if (part.type === "step-start" || part.type === "file") continue;

    const dataSpecResult = decodeDataSpecChunk(part);
    if (dataSpecResult?.type === "valid") {
      if (message.role !== "assistant") {
        warn("data-spec chunks are only supported in assistant messages");
        continue;
      }
      converted.push(toInternalDataSpecPart(dataSpecResult.update));
      continue;
    }

    if (dataSpecResult?.type === "missing-sequence") {
      dataSpecTelemetry?.({
        type: "missing-sequence-dropped",
        instanceId: dataSpecResult.instanceId,
      });
      warn(
        `Dropped data-spec chunk with missing sequence for instanceId: ${dataSpecResult.instanceId}`,
      );
      continue;
    }

    if (dataSpecResult?.type === "invalid-sequence") {
      dataSpecTelemetry?.({
        type: "invalid-sequence-dropped",
        instanceId: dataSpecResult.instanceId,
      });
      warn(
        `Dropped data-spec chunk with invalid sequence for instanceId: ${dataSpecResult.instanceId}`,
      );
      continue;
    }

    if (dataSpecResult?.type === "invalid") {
      warn("Malformed data-spec chunk dropped");
      continue;
    }

    if (part.type === "text") {
      converted.push({
        type: "text",
        text: part.text,
      } satisfies TextMessagePart);
      continue;
    }

    if (part.type === "reasoning") {
      converted.push({
        type: "reasoning",
        text: part.text,
      } satisfies ReasoningMessagePart);
      continue;
    }

    if (isToolUIPart(part)) {
      const toolName = getToolName(part);
      const toolCallId = part.toolCallId;
      const args: ReadonlyJSONObject = (part.input as ReadonlyJSONObject) || {};

      let result: unknown;
      let isError = false;

      if (part.state === "output-available") {
        result = part.output;
      } else if (part.state === "output-error") {
        isError = true;
        result = { error: part.errorText };
      } else if (part.state === "output-denied") {
        isError = true;
        result = {
          error:
            (part as { approval: { reason?: string } }).approval.reason ||
            "Tool approval denied",
        };
      }

      let argsText = JSON.stringify(args);
      if (part.state === "input-streaming") {
        // strip closing delimiters added by the AI SDK's fix-json
        argsText = stripClosingDelimiters(argsText);
      }

      const toolStatus = metadata.toolStatuses?.[toolCallId];
      converted.push({
        type: "tool-call",
        toolName,
        toolCallId,
        argsText,
        args,
        result,
        isError,
        ...getToolInterrupt(part, toolStatus),
      } satisfies ToolCallMessagePart);
      continue;
    }

    if (part.type === "source-url") {
      converted.push({
        type: "source",
        sourceType: "url",
        id: part.sourceId,
        url: part.url,
        title: part.title || "",
      } satisfies SourceMessagePart);
      continue;
    }

    if (part.type === "source-document") {
      warn("Source document parts are not yet supported in conversion");
      continue;
    }

    const component = toComponentPart(part);
    if (component) {
      converted.push(component);
      continue;
    }

    if (part.type.startsWith("data-")) {
      converted.push({
        type: "data",
        name: part.type.substring(5),
        data: getDataPartPayload(part),
      } satisfies DataMessagePart);
      continue;
    }

    warn(`Unsupported message part type: ${part.type}`);
  }

  const lastToolCallIndexById = new Map<string, number>();
  for (let i = 0; i < converted.length; i++) {
    const part = converted[i];
    if (part?.type !== "tool-call" || part.toolCallId == null) continue;
    lastToolCallIndexById.set(part.toolCallId, i);
  }

  return converted.filter((part, index) => {
    if (part.type !== "tool-call" || part.toolCallId == null) return true;
    return lastToolCallIndexById.get(part.toolCallId) === index;
  });
}

const emitDataSpecApplyDiagnostics = (
  result: DataSpecApplyResult,
  update: DataSpecUpdate,
  options: unstable_AISDKDataSpecOptions | undefined,
) => {
  if (result.type === "invalid") {
    if (result.reason === "malformed-patch") {
      options?.onTelemetry?.({
        type: "malformed-patch-dropped",
        instanceId: update.instanceId,
        ...(update.sequence !== undefined ? { sequence: update.sequence } : {}),
      });
      warn(
        `Malformed data-spec patch dropped for instanceId: ${update.instanceId}`,
      );
    } else {
      warn(`Invalid data-spec dropped for instanceId: ${update.instanceId}`);
    }
    return;
  }

  if (result.type === "ignored-stale-sequence") {
    options?.onTelemetry?.({
      type: "stale-sequence-ignored",
      instanceId: update.instanceId,
      sequence: result.sequence,
      latestSequence: result.latestSequence,
    });
  }
};

const materializeDataSpecParts = (
  content: MessageContent,
  options: unstable_AISDKDataSpecOptions | undefined,
): MessageContent => {
  const stateByDataSpecInstanceId = new Map<string, DataSpecState>();
  const seenDataSpecInstanceIds = new Set<string>();
  const converted: (
    | MessageContent[number]
    | { __dataSpecInstanceId: string }
  )[] = [];

  for (const part of content) {
    const update = getInternalDataSpecUpdate(part);
    if (!update) {
      converted.push(part);
      continue;
    }

    const result = applyDataSpecUpdate(
      stateByDataSpecInstanceId,
      update,
      options,
    );
    emitDataSpecApplyDiagnostics(result, update, options);

    if (
      result.type === "applied" &&
      !seenDataSpecInstanceIds.has(update.instanceId) &&
      stateByDataSpecInstanceId.get(update.instanceId)?.spec
    ) {
      seenDataSpecInstanceIds.add(update.instanceId);
      converted.push({ __dataSpecInstanceId: update.instanceId });
    }
  }

  return converted
    .map((part) => {
      if (!("__dataSpecInstanceId" in part)) return part;
      const dataSpecState = stateByDataSpecInstanceId.get(
        part.__dataSpecInstanceId,
      );
      if (!dataSpecState?.spec) return null;

      return {
        type: "component",
        name: dataSpecState.name,
        instanceId: dataSpecState.instanceId,
        ...(dataSpecState.parentId !== undefined
          ? { parentId: dataSpecState.parentId }
          : {}),
        props: {
          ...(dataSpecState.props ?? {}),
          spec: dataSpecState.spec,
        },
      } satisfies ComponentMessagePart;
    })
    .filter(Boolean) as MessageContent;
};

const materializeDataSpecsInMessages = (
  messages: readonly ThreadMessage[],
  dataSpecOptions: AISDKMessageConverterMetadata["unstable_dataSpec"],
) => {
  return messages.map((message) => {
    if (message.role !== "assistant") return message;
    const content = materializeDataSpecParts(
      message.content as MessageContent,
      dataSpecOptions,
    );
    return {
      ...message,
      content,
    };
  });
};

const AISDKMessageConverterBase = unstable_createMessageConverter(
  (message: UIMessage, metadata: useExternalMessageConverter.Metadata) => {
    const createdAt = new Date();
    const content = convertParts(
      message,
      metadata as AISDKMessageConverterMetadata,
    );

    switch (message.role) {
      case "user":
        return {
          role: "user",
          id: message.id,
          createdAt,
          content,
          attachments: message.parts
            ?.filter((p) => p.type === "file")
            .map((part, idx) => ({
              id: idx.toString(),
              type: part.mediaType.startsWith("image/") ? "image" : "file",
              name: part.filename ?? "file",
              content: [
                part.mediaType.startsWith("image/")
                  ? {
                      type: "image",
                      image: part.url,
                      filename: part.filename!,
                    }
                  : {
                      type: "file",
                      filename: part.filename!,
                      data: part.url,
                      mimeType: part.mediaType,
                    },
              ],
              contentType: part.mediaType ?? "unknown/unknown",
              status: { type: "complete" as const },
            })),
          metadata: message.metadata as MessageMetadata,
        };

      case "system":
      case "assistant": {
        const timing = metadata.messageTiming?.[message.id];
        return {
          role: message.role,
          id: message.id,
          createdAt,
          content,
          metadata: {
            ...(message.metadata as MessageMetadata),
            ...(timing && { timing }),
          },
        };
      }

      default:
        warn(`Unsupported message role: ${message.role}`);
        return [];
    }
  },
);

export const AISDKMessageConverter = {
  ...AISDKMessageConverterBase,
  useThreadMessages: (
    args: Parameters<typeof AISDKMessageConverterBase.useThreadMessages>[0],
  ) => {
    const converted = AISDKMessageConverterBase.useThreadMessages(args);
    const dataSpecOptions = (
      args.metadata as AISDKMessageConverterMetadata | undefined
    )?.unstable_dataSpec;
    return useMemo(
      () => materializeDataSpecsInMessages(converted, dataSpecOptions),
      [converted, dataSpecOptions],
    );
  },
  toThreadMessages: (
    messages: Parameters<typeof AISDKMessageConverterBase.toThreadMessages>[0],
    isRunning?: Parameters<
      typeof AISDKMessageConverterBase.toThreadMessages
    >[1],
    metadata?: Parameters<typeof AISDKMessageConverterBase.toThreadMessages>[2],
  ) => {
    const converted = AISDKMessageConverterBase.toThreadMessages(
      messages,
      isRunning,
      metadata,
    );
    const dataSpecOptions = (
      metadata as AISDKMessageConverterMetadata | undefined
    )?.unstable_dataSpec;
    return materializeDataSpecsInMessages(converted, dataSpecOptions);
  },
};
