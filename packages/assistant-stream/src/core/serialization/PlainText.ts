import type { AssistantStreamEncoder } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import {
  AssistantMetaTransformStream,
  type AssistantMetaStreamChunk,
} from "../utils/stream/AssistantMetaTransformStream";
import { AssistantTransformStream } from "../utils/stream/AssistantTransformStream";
import { PipeableTransformStream } from "../utils/stream/PipeableTransformStream";

export class PlainTextEncoder
  extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>>
  implements AssistantStreamEncoder
{
  headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
  });

  constructor() {
    super((readable) => {
      const transform = new TransformStream<AssistantMetaStreamChunk, string>({
        transform(chunk, controller) {
          if (chunk.type === "text-delta" && chunk.meta.type === "text") {
            controller.enqueue(chunk.textDelta);
          }
        },
      });

      return readable
        .pipeThrough(new AssistantMetaTransformStream())
        .pipeThrough(transform)
        .pipeThrough(new TextEncoderStream());
    });
  }
}

export class PlainTextDecoder extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  AssistantStreamChunk
> {
  constructor() {
    super((readable) => {
      const transform = new AssistantTransformStream<string>({
        transform(chunk, controller) {
          controller.appendText(chunk);
        },
      });

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(transform);
    });
  }
}
