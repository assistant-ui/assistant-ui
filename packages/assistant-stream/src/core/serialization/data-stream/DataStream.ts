import { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { ToolCallStreamController } from "../../modules/tool-call";
import { AssistantTransformStream } from "../../utils/stream/AssistantTransformStream";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import { DataStreamChunk, DataStreamStreamChunkType } from "./chunk-types";
import { LineDecoderStream } from "../../utils/stream/LineDecoderStream";
import {
  DataStreamChunkDecoder,
  DataStreamChunkEncoder,
} from "./serialization";
import {
  AssistantMetaStreamChunk,
  AssistantMetaTransformStream,
} from "../../utils/stream/AssistantMetaTransformStream";
import { AssistantStreamEncoder } from "../../AssistantStream";

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
              }
              if (part.type === "source") {
                const { type, ...value } = part;
                controller.enqueue({
                  type: DataStreamStreamChunkType.Source,
                  value,
                });
              }
              if (part.type === "component") {
                const { type, ...value } = part;
                controller.enqueue({
                  type: DataStreamStreamChunkType.AuiComponent,
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
              const { type, ...value } = chunk;
              controller.enqueue({
                type: DataStreamStreamChunkType.FinishStep,
                value,
              });
              break;
            }
            case "message-finish": {
              const { type, ...value } = chunk;
              controller.enqueue({
                type: DataStreamStreamChunkType.FinishMessage,
                value,
              });
              break;
            }
            case "error": {
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

            case "tool-call-args-text-finish":
              controller.enqueue({
                type: DataStreamStreamChunkType.FinishToolCallArgs,
                value: {
                  toolCallId: chunk.meta.toolCallId,
                },
              });
              break;

            case "part-finish":
              break;

            default: {
              const exhaustiveCheck: never = type;
              throw new Error(`Unsupported chunk type: ${exhaustiveCheck}`);
            }
          }
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
  constructor() {
    super((readable) => {
      const toolCallControllers = new Map<string, ToolCallStreamController>();
      const transform = new AssistantTransformStream<DataStreamChunk>({
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

              if (toolCallControllers.has(toolCallId))
                throw new Error(
                  `Encountered duplicate tool call id: ${toolCallId}`,
                );

              const toolCallController = ctrl.addToolCallPart({
                toolCallId,
                toolName,
              });
              toolCallControllers.set(toolCallId, toolCallController);
              break;
            }

            case DataStreamStreamChunkType.ToolCallArgsTextDelta: {
              const { toolCallId, argsTextDelta } = value;
              const toolCallController = toolCallControllers.get(toolCallId);
              if (!toolCallController)
                throw new Error(
                  `Encountered tool call with unknown id: ${toolCallId}`,
                );
              toolCallController.argsText.append(argsTextDelta);
              break;
            }

            case DataStreamStreamChunkType.FinishToolCallArgs: {
              const { toolCallId } = value;
              const toolCallController = toolCallControllers.get(toolCallId);
              if (!toolCallController)
                throw new Error(
                  `Encountered tool call args finish with unknown id: ${toolCallId}`,
                );
              toolCallController.argsText.close();
              break;
            }

            case DataStreamStreamChunkType.ToolCallResult: {
              const { toolCallId, artifact, result, isError } = value;
              const toolCallController = toolCallControllers.get(toolCallId);
              if (!toolCallController)
                throw new Error(
                  `Encountered tool call result with unknown id: ${toolCallId}`,
                );
              toolCallController.setResponse({
                artifact,
                result,
                isError,
              });
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
              break;
            }

            case DataStreamStreamChunkType.AuiComponent: {
              const ctrl = value.parentId
                ? controller.withParentId(value.parentId)
                : controller;
              ctrl.appendComponent({
                name: value.name,
                ...(value.instanceId !== undefined
                  ? { instanceId: value.instanceId }
                  : {}),
                ...(value.props !== undefined ? { props: value.props } : {}),
              });
              break;
            }

            case DataStreamStreamChunkType.FinishMessage:
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
              throw new Error(`unsupported chunk type: ${exhaustiveCheck}`);
            }
          }
        },
        flush() {
          toolCallControllers.forEach((controller) => controller.close());
          toolCallControllers.clear();
        },
      });

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(
          new LineDecoderStream({ allowIncompleteLineOnFlush: true }),
        )
        .pipeThrough(new DataStreamChunkDecoder())
        .pipeThrough(transform);
    });
  }
}
