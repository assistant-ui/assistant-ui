import { AssistantStreamChunk } from "../AssistantStream";
import { PipeableTransformStream } from "../utils/PipeableTransformStream";

export class PlainTextEncoder
  implements ReadableWritablePair<Uint8Array, AssistantStreamChunk>
{
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
              controller.enqueue(chunk.textDelta);
              break;

            default:
              const unsupportedType:
                | "tool-call-begin"
                | "tool-call-delta"
                | "tool-result"
                | "error" = type;
              throw new Error(`unsupported chunk type: ${unsupportedType}`);
          }
        },
      });

      return readable
        .pipeThrough(transform)
        .pipeThrough(new TextEncoderStream());
    });
  }
}

export class PlainTextDecoder {
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
          controller.enqueue({
            type: "text-delta",
            textDelta: chunk,
          });
        },
      });

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(transform);
    });
  }
}
