import { AssistantStreamChunk } from "../AssistantStream";
import { PipeableTransformStream } from "../utils/PipeableTransformStream";
import { StreamPart } from "./streamPart/StreamPart";

export class DataStreamEncoder {
  private _transformStream;

  public get writable() {
    return this._transformStream.writable;
  }

  public get readable() {
    return this._transformStream.readable;
  }

  constructor() {
    this._transformStream = new PipeableTransformStream<
      AssistantStreamChunk,
      Uint8Array
    >((readable) => {
      const transform = new TransformStream<AssistantStreamChunk, string>({
        transform(chunk, controller) {
          const type = chunk.type;
          switch (type) {
            case "text-delta":
              controller.enqueue("0:" + JSON.stringify(chunk.textDelta) + "\n");
              break;

            case "tool-call-begin":
              controller.enqueue(
                "b:" +
                  JSON.stringify({
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                  }) +
                  "\n",
              );
              break;

            case "tool-call-delta":
              controller.enqueue(
                "c:" +
                  JSON.stringify({
                    toolCallId: chunk.toolCallId,
                    argsTextDelta: chunk.argsTextDelta,
                  }) +
                  "\n",
              );
              break;

            case "tool-result":
              controller.enqueue(
                "a:" +
                  JSON.stringify({
                    toolCallId: chunk.toolCallId,
                    result: chunk.result,
                  }) +
                  "\n",
              );
              break;

            default:
              const exhaustiveCheck: never = type;
              throw new Error(`unsupported chunk type: ${exhaustiveCheck}`);
          }
        },
      });

      return readable
        .pipeThrough(transform)
        .pipeThrough(new TextEncoderStream());
    });
  }
}

const decodeStreamPart = <T extends Record<string, unknown>>(
  part: string,
): StreamPart<T> => {
  const index = part.indexOf(":");
  if (index === -1) throw new Error("Invalid stream part");
  return {
    type: part.slice(0, index),
    value: JSON.parse(part.slice(index + 1)),
  };
};

export class DataStreamDecoder {
  private _transformStream;

  public get writable() {
    return this._transformStream.writable;
  }

  public get readable() {
    return this._transformStream.readable;
  }

  constructor() {
    this._transformStream = new PipeableTransformStream<
      Uint8Array,
      AssistantStreamChunk
    >((readable) => {
      const transform = new TransformStream<string, AssistantStreamChunk>({
        transform(chunk, controller) {
          const { type, value } = decodeStreamPart(chunk);
          switch (type) {
            case "0":
              controller.enqueue({
                type: "text-delta",
                textDelta: value as string,
              });
              break;

            case "b": {
              const { toolCallId, toolName } = value as {
                toolCallId: string;
                toolName: string;
              };
              controller.enqueue({
                type: "tool-call-begin",
                toolCallId,
                toolName,
              });
              break;
            }

            case "c": {
              const { toolCallId, argsTextDelta } = value as {
                toolCallId: string;
                argsTextDelta: string;
              };
              controller.enqueue({
                type: "tool-call-delta",
                toolCallId,
                argsTextDelta,
              });
              break;
            }

            case "a": {
              const { toolCallId, result } = value as {
                toolCallId: string;
                result: any;
              };

              controller.enqueue({
                type: "tool-result",
                toolCallId,
                result,
              });
              break;
            }

            case "9": {
              const { toolCallId, args } = value as {
                toolCallId: string;
                toolName: string;
                args: object;
              };
              controller.enqueue({
                type: "tool-call-begin",
                toolCallId,
                toolName: toolCallId,
              });
              controller.enqueue({
                type: "tool-call-delta",
                toolCallId,
                argsTextDelta: JSON.stringify(args),
              });
              break;
            }

            case "2":
            case "3":
            case "8":
            case "d":
            case "e": {
              break; // ignore
            }

            default:
              const exhaustiveCheck: string = type;
              throw new Error(`unsupported chunk type: ${exhaustiveCheck}`);
          }
        },
      });

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new ChunkByLineStream())
        .pipeThrough(transform);
    });
  }
}

export class ChunkByLineStream extends TransformStream<string, string> {
  private buffer = "";

  constructor() {
    super({
      transform: (chunk, controller) => {
        this.buffer += chunk;
        const lines = this.buffer.split("\n");

        // Process all complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          controller.enqueue(lines[i]);
        }

        // Keep the last incomplete line in the buffer
        this.buffer = lines[lines.length - 1]!;
      },
      flush: (controller) => {
        // flush any remaining content in the buffer
        if (this.buffer) {
          controller.enqueue(this.buffer);
        }
      },
    });
  }
}
