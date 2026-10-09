import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { AssistantTransformStream } from "../../utils/stream/AssistantTransformStream";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import { type DataStreamChunk, DataStreamStreamChunkType } from "./chunk-types";
import { LineDecoderStream } from "../../utils/stream/LineDecoderStream";
import {
  DataStreamChunkDecoder,
  DataStreamChunkEncoder,
} from "./serialization";
import {
  type AssistantMetaStreamChunk,
  AssistantMetaTransformStream,
} from "../../utils/stream/AssistantMetaTransformStream";
import type { AssistantStreamEncoder } from "../../AssistantStream";
import { createToolCallPartRegistry } from "../tool-call-part-registry";

export type DataStreamOptions = {
  strict?: boolean | undefined;
  /** Maximum UTF-16 code units accepted in one protocol line. */
  maxLineLength?: number | undefined;
};

type ValueRule = (value: unknown) => boolean;
type ValueFields = Record<string, unknown>;

const isString = (value: unknown) => typeof value === "string";
const isArray = (value: unknown) => Array.isArray(value);
const isObject = (value: unknown): value is ValueFields =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const optional = (check: (value: unknown) => boolean) => (value: unknown) =>
  value === undefined || value === null || check(value);
const isBoolean = (value: unknown) => typeof value === "boolean";
const present = (value: unknown) => value !== undefined;
const objectWith = (
  fields: Record<string, (value: unknown) => boolean>,
): ValueRule => {
  const entries = Object.entries(fields);
  return (value) =>
    isObject(value) && entries.every(([key, check]) => check(value[key]));
};
const unchecked = () => true;
const isPath = (value: unknown) =>
  Array.isArray(value) && value.every(isString);
const isStateOperation = (value: unknown) =>
  isObject(value) &&
  isPath(value["path"]) &&
  (value["type"] === "set"
    ? present(value["value"])
    : value["type"] === "append-text" && isString(value["value"]));

const FINISH_REASONS: ReadonlySet<unknown> = new Set([
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
  "unknown",
]);

const readFinishFields = (value: {
  finishReason: unknown;
  usage?: unknown;
}) => ({
  finishReason: (FINISH_REASONS.has(value.finishReason)
    ? value.finishReason
    : "other") as Extract<
    AssistantStreamChunk,
    { type: "message-finish" }
  >["finishReason"],
  usage: isObject(value.usage)
    ? (value.usage as Extract<
        AssistantStreamChunk,
        { type: "message-finish" }
      >["usage"])
    : { inputTokens: 0, outputTokens: 0 },
});

const VALUE_RULES: Record<DataStreamStreamChunkType, ValueRule> = {
  [DataStreamStreamChunkType.TextDelta]: isString,
  [DataStreamStreamChunkType.Data]: isArray,
  // readErrorValue turns any payload into an error chunk, so a malformed
  // error frame still surfaces as an error instead of being dropped.
  [DataStreamStreamChunkType.Error]: unchecked,
  [DataStreamStreamChunkType.Annotation]: isArray,
  [DataStreamStreamChunkType.ToolCall]: objectWith({
    toolCallId: isString,
    toolName: isString,
    args: optional((value) => typeof value === "object"),
  }),
  [DataStreamStreamChunkType.ToolCallResult]: objectWith({
    toolCallId: isString,
    isError: optional(isBoolean),
    isPreliminary: optional(isBoolean),
    modelContent: optional(isArray),
  }),
  [DataStreamStreamChunkType.StartToolCall]: objectWith({
    toolCallId: isString,
    toolName: isString,
    parentId: optional(isString),
  }),
  [DataStreamStreamChunkType.ToolCallArgsTextDelta]: objectWith({
    toolCallId: isString,
    argsTextDelta: isString,
    isFinal: optional(isBoolean),
  }),
  [DataStreamStreamChunkType.FinishMessage]: objectWith({
    finishReason: isString,
    usage: optional(isObject),
  }),
  [DataStreamStreamChunkType.FinishStep]: objectWith({
    finishReason: isString,
    usage: optional(isObject),
    isContinued: optional(isBoolean),
  }),
  [DataStreamStreamChunkType.StartStep]: objectWith({
    messageId: isString,
  }),
  [DataStreamStreamChunkType.ReasoningDelta]: isString,
  [DataStreamStreamChunkType.Source]: objectWith({
    parentId: optional(isString),
  }),
  [DataStreamStreamChunkType.RedactedReasoning]: unchecked,
  [DataStreamStreamChunkType.ReasoningSignature]: unchecked,
  [DataStreamStreamChunkType.File]: objectWith({
    data: isString,
    mimeType: isString,
    parentId: optional(isString),
  }),
  [DataStreamStreamChunkType.AuiUpdateStateOperations]: (value) =>
    Array.isArray(value) && value.every(isStateOperation),
  [DataStreamStreamChunkType.AuiTextDelta]: objectWith({
    textDelta: isString,
    parentId: isString,
  }),
  [DataStreamStreamChunkType.AuiReasoningDelta]: objectWith({
    reasoningDelta: isString,
    parentId: isString,
  }),
  [DataStreamStreamChunkType.AuiDataPart]: objectWith({
    name: isString,
    data: present,
    parentId: optional(isString),
  }),
  [DataStreamStreamChunkType.AuiReasoningPartStart]: objectWith({
    unstable_summary: optional(isString),
    parentId: optional(isString),
  }),
};

const ERROR_SEVERITIES: ReadonlySet<unknown> = new Set([
  "critical",
  "warning",
  "info",
]);

const readErrorValue = (
  value: unknown,
): Extract<AssistantStreamChunk, { type: "error" }> => {
  if (typeof value === "string")
    return { type: "error", path: [], error: value };
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    const code = "code" in value ? value.code : undefined;
    const severity = "severity" in value ? value.severity : undefined;
    return {
      type: "error",
      path: [],
      error: value.error,
      ...(typeof code === "string" ? { code } : {}),
      ...(ERROR_SEVERITIES.has(severity)
        ? { severity: severity as "critical" | "warning" | "info" }
        : {}),
    };
  }
  return { type: "error", path: [], error: JSON.stringify(value) ?? "" };
};

export class DataStreamEncoder
  extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>>
  implements AssistantStreamEncoder
{
  headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "x-vercel-ai-data-stream": "v1",
  });

  constructor() {
    super((readable) => {
      const openToolCallArgs = new Map<string, boolean>();
      const finishToolCallArgs = (
        controller: TransformStreamDefaultController<DataStreamChunk>,
        toolCallId: string,
      ) => {
        const hasArgsText = openToolCallArgs.get(toolCallId);
        if (hasArgsText === undefined) return;
        openToolCallArgs.delete(toolCallId);
        controller.enqueue({
          type: DataStreamStreamChunkType.ToolCallArgsTextDelta,
          value: {
            toolCallId,
            // A decoder that predates `isFinal` appends this delta and settles
            // on what it has, and it skips its own empty-object default once
            // any delta has arrived. The frame therefore has to carry the
            // default itself rather than leave it to the decoder.
            argsTextDelta: hasArgsText ? "" : "{}",
            isFinal: true,
          },
        });
      };
      const finishOpenToolCallArgs = (
        controller: TransformStreamDefaultController<DataStreamChunk>,
      ) => {
        for (const toolCallId of openToolCallArgs.keys()) {
          finishToolCallArgs(controller, toolCallId);
        }
      };
      const transform = new TransformStream<
        AssistantMetaStreamChunk,
        DataStreamChunk
      >({
        transform(chunk, controller) {
          const type = chunk.type;
          switch (type) {
            case "part-start": {
              const part = chunk.part;
              if (part.type === "tool-call") {
                const { type, ...value } = part;
                controller.enqueue({
                  type: DataStreamStreamChunkType.StartToolCall,
                  value,
                });
                openToolCallArgs.set(part.toolCallId, false);
              }
              if (part.type === "source") {
                const { type, ...value } = part;
                controller.enqueue({
                  type: DataStreamStreamChunkType.Source,
                  value,
                });
              }
              if (part.type === "file") {
                const { type, ...value } = part;
                controller.enqueue({
                  type: DataStreamStreamChunkType.File,
                  value,
                });
              }
              if (part.type === "data") {
                const { type, ...value } = part;
                controller.enqueue({
                  type: DataStreamStreamChunkType.AuiDataPart,
                  value,
                });
              }
              // Reasoning otherwise reaches the wire only through its text
              // deltas, which cannot carry a summary and emit nothing at all
              // for a part that never appends text. The frame is emitted only
              // when there is a summary to carry, so a stream that does not
              // use the field is unchanged.
              if (
                part.type === "reasoning" &&
                part.unstable_summary !== undefined
              ) {
                controller.enqueue({
                  type: DataStreamStreamChunkType.AuiReasoningPartStart,
                  value: {
                    unstable_summary: part.unstable_summary,
                    ...(part.parentId !== undefined
                      ? { parentId: part.parentId }
                      : {}),
                  },
                });
              }
              break;
            }
            case "text-delta": {
              const part = chunk.meta;
              switch (part.type) {
                case "text": {
                  if (part.parentId) {
                    controller.enqueue({
                      type: DataStreamStreamChunkType.AuiTextDelta,
                      value: {
                        textDelta: chunk.textDelta,
                        parentId: part.parentId,
                      },
                    });
                  } else {
                    controller.enqueue({
                      type: DataStreamStreamChunkType.TextDelta,
                      value: chunk.textDelta,
                    });
                  }
                  break;
                }
                case "reasoning": {
                  if (part.parentId) {
                    controller.enqueue({
                      type: DataStreamStreamChunkType.AuiReasoningDelta,
                      value: {
                        reasoningDelta: chunk.textDelta,
                        parentId: part.parentId,
                      },
                    });
                  } else {
                    controller.enqueue({
                      type: DataStreamStreamChunkType.ReasoningDelta,
                      value: chunk.textDelta,
                    });
                  }
                  break;
                }
                case "tool-call": {
                  if (!openToolCallArgs.has(part.toolCallId)) break;
                  openToolCallArgs.set(part.toolCallId, true);
                  controller.enqueue({
                    type: DataStreamStreamChunkType.ToolCallArgsTextDelta,
                    value: {
                      toolCallId: part.toolCallId,
                      argsTextDelta: chunk.textDelta,
                    },
                  });
                  break;
                }
                default:
                  throw new Error(
                    `Unsupported part type for text-delta: ${part.type}`,
                  );
              }
              break;
            }
            case "result": {
              // Only tool-call parts can have results.
              const part = chunk.meta;
              if (part.type !== "tool-call") {
                throw new Error(
                  `Result chunk on non-tool-call part not supported: ${part.type}`,
                );
              }
              openToolCallArgs.delete(part.toolCallId);
              controller.enqueue({
                type: DataStreamStreamChunkType.ToolCallResult,
                value: {
                  toolCallId: part.toolCallId,
                  result: chunk.result,
                  artifact: chunk.artifact,
                  ...(chunk.isError ? { isError: chunk.isError } : {}),
                  ...(chunk.isPreliminary ? { isPreliminary: true } : {}),
                  ...(chunk.modelContent !== undefined
                    ? { modelContent: chunk.modelContent }
                    : {}),
                  ...(chunk.messages !== undefined
                    ? { messages: chunk.messages }
                    : {}),
                },
              });
              break;
            }
            case "step-start": {
              const { type, ...value } = chunk;
              controller.enqueue({
                type: DataStreamStreamChunkType.StartStep,
                value,
              });
              break;
            }
            case "step-finish": {
              finishOpenToolCallArgs(controller);
              const { type, ...value } = chunk;
              controller.enqueue({
                type: DataStreamStreamChunkType.FinishStep,
                value,
              });
              break;
            }
            case "message-finish": {
              finishOpenToolCallArgs(controller);
              const { type, ...value } = chunk;
              controller.enqueue({
                type: DataStreamStreamChunkType.FinishMessage,
                value,
              });
              break;
            }
            case "error": {
              // A warning or info error does not end the message, so tool-call
              // arguments still streaming stay open across it. Only the encoder
              // can make this call: older encoders never send severity, so a
              // decoder cannot rely on it, and a closed args stream is reported
              // as an explicit final args frame rather than inferred from the
              // error. An error without metadata stays a bare string, the shape
              // older decoders and other data stream parsers read.
              if (chunk.severity !== "warning" && chunk.severity !== "info")
                finishOpenToolCallArgs(controller);
              controller.enqueue({
                type: DataStreamStreamChunkType.Error,
                value:
                  chunk.code === undefined && chunk.severity === undefined
                    ? chunk.error
                    : {
                        error: chunk.error,
                        ...(chunk.code !== undefined
                          ? { code: chunk.code }
                          : {}),
                        ...(chunk.severity !== undefined
                          ? { severity: chunk.severity }
                          : {}),
                      },
              });
              break;
            }
            case "annotations": {
              controller.enqueue({
                type: DataStreamStreamChunkType.Annotation,
                value: chunk.annotations,
              });
              break;
            }
            case "data": {
              controller.enqueue({
                type: DataStreamStreamChunkType.Data,
                value: chunk.data,
              });
              break;
            }

            case "update-state": {
              controller.enqueue({
                type: DataStreamStreamChunkType.AuiUpdateStateOperations,
                value: chunk.operations,
              });
              break;
            }

            case "tool-call-args-text-finish": {
              finishToolCallArgs(controller, chunk.meta.toolCallId);
              break;
            }
            case "part-finish": {
              if (chunk.meta.type === "tool-call") {
                finishToolCallArgs(controller, chunk.meta.toolCallId);
              }
              break;
            }

            default: {
              const exhaustiveCheck: never = type;
              throw new Error(`Unsupported chunk type: ${exhaustiveCheck}`);
            }
          }
        },
        flush(controller) {
          finishOpenToolCallArgs(controller);
        },
      });

      return readable
        .pipeThrough(new AssistantMetaTransformStream())
        .pipeThrough(transform)
        .pipeThrough(new DataStreamChunkEncoder())
        .pipeThrough(new TextEncoderStream());
    });
  }
}

export class DataStreamDecoder extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  AssistantStreamChunk
> {
  constructor(options: DataStreamOptions = {}) {
    const strict = options.strict ?? true;
    super((readable) => {
      const toolCallPartRegistry = createToolCallPartRegistry();
      const warnedDroppedArgs = new Set<string>();
      const loggedDrops = new Set<string>();
      const logDropped = (key: string, message: string) => {
        if (loggedDrops.has(key) || loggedDrops.size >= 20) return;
        loggedDrops.add(key);
        console.error(message);
      };
      const closeOpenToolCallArgs = () => {
        toolCallPartRegistry.closeOpenArgsText();
      };
      const transform = new AssistantTransformStream<DataStreamChunk>({
        strict,
        transform(chunk, controller) {
          const { type, value } = chunk;

          const rule = Object.prototype.hasOwnProperty.call(VALUE_RULES, type)
            ? VALUE_RULES[type]
            : undefined;
          if (rule && !rule(value)) {
            const preview = JSON.stringify(value)?.slice(0, 200);
            if (strict)
              throw new Error(
                `Invalid value for data-stream chunk type "${type}": ${preview}`,
              );
            logDropped(
              `value:${type}`,
              `Dropped data-stream chunk with invalid value for type "${type}": ${preview}`,
            );
            return;
          }

          switch (type) {
            case DataStreamStreamChunkType.ReasoningDelta:
              controller.appendReasoning(value);
              break;

            case DataStreamStreamChunkType.TextDelta:
              controller.appendText(value);
              break;

            case DataStreamStreamChunkType.AuiTextDelta:
              controller
                .withParentId(value.parentId)
                .appendText(value.textDelta);
              break;

            case DataStreamStreamChunkType.AuiReasoningPartStart: {
              const target = value.parentId
                ? controller.withParentId(value.parentId)
                : controller;
              // Opening through appendReasoning registers the part as the
              // current reasoning append target, so the deltas that follow
              // extend it instead of opening a second part.
              /** @deprecated Experimental since 2026-08-07. Not scheduled for removal; the API may change in any release. */
              const unstable_summary = value.unstable_summary ?? undefined;
              target.appendReasoning("", {
                ...(unstable_summary !== undefined ? { unstable_summary } : {}),
              });
              break;
            }

            case DataStreamStreamChunkType.AuiReasoningDelta:
              controller
                .withParentId(value.parentId)
                .appendReasoning(value.reasoningDelta);
              break;

            case DataStreamStreamChunkType.StartToolCall: {
              const { toolCallId, toolName, parentId } = value;
              const ctrl = parentId
                ? controller.withParentId(parentId)
                : controller;

              if (toolCallPartRegistry.tryGet(toolCallId)) {
                if (strict)
                  throw new Error(
                    `Encountered duplicate tool call id: ${toolCallId}`,
                  );
                logDropped(
                  `duplicate:${toolCallId}`,
                  `Dropped duplicate tool call start: ${toolCallId}`,
                );
                break;
              }

              toolCallPartRegistry.start(toolCallId, () =>
                ctrl.addToolCallPart({
                  toolCallId,
                  toolName,
                }),
              );
              break;
            }

            case DataStreamStreamChunkType.ToolCallArgsTextDelta: {
              const { toolCallId, argsTextDelta, isFinal } = value;
              const toolCallController =
                toolCallPartRegistry.tryGet(toolCallId);
              if (!toolCallController) {
                if (strict)
                  throw new Error(
                    `Encountered tool call with unknown id: ${toolCallId}`,
                  );
                logDropped(
                  `args:${toolCallId}`,
                  `Dropped args delta for unknown tool call: ${toolCallId}`,
                );
                break;
              }
              if (toolCallPartRegistry.isArgsTextClosed(toolCallController)) {
                if (!warnedDroppedArgs.has(toolCallId)) {
                  warnedDroppedArgs.add(toolCallId);
                  console.warn(
                    `Dropped tool-call args delta for closed args stream: ${toolCallId}`,
                  );
                }
                break;
              }
              if (argsTextDelta.length > 0) {
                toolCallPartRegistry.appendArgsText(
                  toolCallController,
                  argsTextDelta,
                );
              }
              if (isFinal === true) {
                toolCallPartRegistry.closeArgsText(toolCallController);
              }
              break;
            }

            case DataStreamStreamChunkType.ToolCallResult: {
              const {
                toolCallId,
                artifact,
                result,
                isError,
                isPreliminary,
                modelContent,
                messages,
              } = value;
              const toolCallController =
                toolCallPartRegistry.tryGet(toolCallId);
              if (!toolCallController) {
                if (strict)
                  throw new Error(
                    `Encountered tool call result with unknown id: ${toolCallId}`,
                  );
                logDropped(
                  `result:${toolCallId}`,
                  `Dropped result for unknown tool call: ${toolCallId}`,
                );
                break;
              }
              toolCallPartRegistry.setResponse(toolCallController, {
                artifact,
                result,
                isError,
                ...(isPreliminary ? { isPreliminary: true } : {}),
                ...(modelContent != null ? { modelContent } : {}),
                ...(messages !== undefined ? { messages } : {}),
              });
              break;
            }

            case DataStreamStreamChunkType.ToolCall: {
              const { toolCallId, toolName } = value;
              const args = value.args ?? undefined;
              const toolCallController =
                toolCallPartRegistry.tryGet(toolCallId) ??
                toolCallPartRegistry.start(toolCallId, () =>
                  controller.addToolCallPart({
                    toolCallId,
                    toolName,
                  }),
                );

              if (
                args !== undefined &&
                !toolCallPartRegistry.hasArgsText(toolCallController) &&
                !toolCallPartRegistry.isArgsTextClosed(toolCallController)
              ) {
                toolCallPartRegistry.appendArgsText(
                  toolCallController,
                  JSON.stringify(args),
                );
              }
              toolCallPartRegistry.closeArgsText(toolCallController);
              break;
            }

            case DataStreamStreamChunkType.FinishMessage:
              closeOpenToolCallArgs();
              controller.enqueue({
                ...value,
                ...readFinishFields(value),
                type: "message-finish",
                path: [],
              });
              break;

            case DataStreamStreamChunkType.StartStep:
              controller.enqueue({
                ...value,
                type: "step-start",
                path: [],
              });
              break;

            case DataStreamStreamChunkType.FinishStep:
              closeOpenToolCallArgs();
              controller.enqueue({
                ...value,
                ...readFinishFields(value),
                isContinued: value.isContinued ?? false,
                type: "step-finish",
                path: [],
              });
              break;
            case DataStreamStreamChunkType.Data:
              controller.enqueue({
                type: "data",
                path: [],
                data: value,
              });
              break;

            case DataStreamStreamChunkType.Annotation:
              controller.enqueue({
                type: "annotations",
                path: [],
                annotations: value,
              });
              break;

            case DataStreamStreamChunkType.Source: {
              const { parentId, ...sourceData } = value;
              const ctrl = parentId
                ? controller.withParentId(parentId)
                : controller;
              ctrl.appendSource({
                ...sourceData,
                type: "source",
              });
              break;
            }

            case DataStreamStreamChunkType.Error: {
              // An error frame cannot say whether it ends the message, since
              // older encoders send no severity. A producer that ends one
              // closes its open args streams with a final args frame ahead of
              // the error, and the step, message and stream ends close
              // whatever is left.
              controller.enqueue(readErrorValue(value));
              break;
            }

            case DataStreamStreamChunkType.File: {
              const { parentId, ...fileData } = value;
              const ctrl = parentId
                ? controller.withParentId(parentId)
                : controller;
              ctrl.appendFile({
                ...fileData,
                type: "file",
              });
              break;
            }

            case DataStreamStreamChunkType.AuiDataPart:
              controller.appendData({
                ...value,
                type: "data",
              });
              break;

            case DataStreamStreamChunkType.AuiUpdateStateOperations:
              controller.enqueue({
                type: "update-state",
                path: [],
                operations: value,
              });
              break;

            case DataStreamStreamChunkType.ReasoningSignature:
            case DataStreamStreamChunkType.RedactedReasoning:
              // ignore these for now
              break;

            default: {
              const exhaustiveCheck: never = type;
              if (strict)
                throw new Error(`unsupported chunk type: ${exhaustiveCheck}`);
              logDropped(
                `type:${exhaustiveCheck as string}`,
                `Dropped unsupported chunk type: ${exhaustiveCheck as string}`,
              );
            }
          }
        },
        flush() {
          closeOpenToolCallArgs();
          toolCallPartRegistry.closeAll();
        },
      });

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(
          new LineDecoderStream({ maxLineLength: options.maxLineLength }),
        )
        .pipeThrough(new DataStreamChunkDecoder())
        .pipeThrough(transform);
    });
  }
}
