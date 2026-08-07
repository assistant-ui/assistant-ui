import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import type { ToolCallStreamController } from "../../modules/tool-call";
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

type DataStreamOptions = {
  strict?: boolean | undefined;
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
              finishOpenToolCallArgs(controller);
              controller.enqueue({
                type: DataStreamStreamChunkType.Error,
                value: chunk.error,
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
      const toolCallControllers = new Map<string, ToolCallStreamController>();
      const closedToolCallArgs = new Set<string>();
      const warnedDroppedArgs = new Set<string>();
      const loggedDrops = new Set<string>();
      const logDropped = (key: string, message: string) => {
        if (loggedDrops.has(key) || loggedDrops.size >= 20) return;
        loggedDrops.add(key);
        console.error(message);
      };
      const closeOpenToolCallArgs = () => {
        for (const [toolCallId, toolCallController] of toolCallControllers) {
          if (closedToolCallArgs.has(toolCallId)) continue;
          toolCallController.argsText.close();
          closedToolCallArgs.add(toolCallId);
        }
      };
      const transform = new AssistantTransformStream<DataStreamChunk>({
        strict,
        transform(chunk, controller) {
          const { type, value } = chunk;

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
              target.appendReasoning("", {
                ...(value.unstable_summary !== undefined
                  ? { unstable_summary: value.unstable_summary }
                  : {}),
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

              if (toolCallControllers.has(toolCallId)) {
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

              const toolCallController = ctrl.addToolCallPart({
                toolCallId,
                toolName,
              });
              toolCallControllers.set(toolCallId, toolCallController);
              break;
            }

            case DataStreamStreamChunkType.ToolCallArgsTextDelta: {
              const { toolCallId, argsTextDelta, isFinal } = value;
              if (closedToolCallArgs.has(toolCallId)) {
                if (!warnedDroppedArgs.has(toolCallId)) {
                  warnedDroppedArgs.add(toolCallId);
                  console.warn(
                    `Dropped tool-call args delta for closed args stream: ${toolCallId}`,
                  );
                }
                break;
              }
              const toolCallController = toolCallControllers.get(toolCallId);
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
              if (argsTextDelta.length > 0) {
                toolCallController.argsText.append(argsTextDelta);
              }
              if (isFinal === true) {
                toolCallController.argsText.close();
                closedToolCallArgs.add(toolCallId);
              }
              break;
            }

            case DataStreamStreamChunkType.ToolCallResult: {
              const { toolCallId, artifact, result, isError } = value;
              const toolCallController = toolCallControllers.get(toolCallId);
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
              toolCallController.setResponse({
                artifact,
                result,
                isError,
              });
              closedToolCallArgs.add(toolCallId);
              break;
            }

            case DataStreamStreamChunkType.ToolCall: {
              const { toolCallId, toolName, args } = value;

              let toolCallController = toolCallControllers.get(toolCallId);
              if (toolCallController) {
                toolCallController.argsText.close();
              } else {
                toolCallController = controller.addToolCallPart({
                  toolCallId,
                  toolName,
                  args,
                });
                toolCallControllers.set(toolCallId, toolCallController);
              }
              closedToolCallArgs.add(toolCallId);
              break;
            }

            case DataStreamStreamChunkType.FinishMessage:
              closeOpenToolCallArgs();
              controller.enqueue({
                type: "message-finish",
                path: [],
                ...value,
              });
              break;

            case DataStreamStreamChunkType.StartStep:
              controller.enqueue({
                type: "step-start",
                path: [],
                ...value,
              });
              break;

            case DataStreamStreamChunkType.FinishStep:
              closeOpenToolCallArgs();
              controller.enqueue({
                type: "step-finish",
                path: [],
                ...value,
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
                type: "source",
                ...sourceData,
              });
              break;
            }

            case DataStreamStreamChunkType.Error:
              closeOpenToolCallArgs();
              controller.enqueue({
                type: "error",
                path: [],
                error: value,
              });
              break;

            case DataStreamStreamChunkType.File:
              controller.appendFile({
                type: "file",
                ...value,
              });
              break;

            case DataStreamStreamChunkType.AuiDataPart:
              controller.appendData({
                type: "data",
                ...value,
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
          toolCallControllers.forEach((controller) => controller.close());
          toolCallControllers.clear();
        },
      });

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new LineDecoderStream())
        .pipeThrough(new DataStreamChunkDecoder())
        .pipeThrough(transform);
    });
  }
}
