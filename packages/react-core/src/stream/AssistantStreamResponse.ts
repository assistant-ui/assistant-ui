import { PipeableTransformStream } from "../utils/stream/PipeableTransformStream";
import { AssistantStreamAccumulator } from "./AssistantStreamAccumulator";
import { SSEDecoder, SSEEncoder } from "../utils/stream/SSE";
import { AssistantStreamChunk, AssistantStreamOperation } from "./types";
import {
  ASSISTANT_STREAM_FORMAT,
  CONTENT_TYPE_EVENT_STREAM,
} from "./constants";

export class AssistantStreamEncoder extends PipeableTransformStream<
  AssistantStreamChunk,
  Uint8Array
> {
  constructor() {
    super((readable) =>
      readable
        .pipeThrough(
          (() => {
            class AssistantStreamTransformer
              implements
                Transformer<
                  AssistantStreamChunk,
                  readonly AssistantStreamOperation[]
                >
            {
              #isFirstChunk = true;

              start() {
                // Nothing needed here since we initialize in the field declaration
              }

              transform(
                chunk: AssistantStreamChunk,
                controller: TransformStreamDefaultController<
                  readonly AssistantStreamOperation[]
                >
              ) {
                if (
                  this.#isFirstChunk &&
                  chunk.snapshot &&
                  Object.keys(chunk.snapshot).length > 0
                ) {
                  // For the first chunk, if there's an initial state that's not empty,
                  // prepend a set operation for the initial state
                  controller.enqueue([
                    { type: "set", path: [], value: chunk.snapshot },
                    ...chunk.operations,
                  ]);
                } else {
                  controller.enqueue(chunk.operations);
                }
                this.#isFirstChunk = false;
              }
            }
            return new TransformStream(new AssistantStreamTransformer());
          })()
        )
        .pipeThrough(new SSEEncoder())
    );
  }
}

export class AssistantStreamDecoder extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  AssistantStreamChunk
> {
  constructor() {
    const accumulator = new AssistantStreamAccumulator();
    super((readable) =>
      readable
        .pipeThrough(new SSEDecoder<readonly AssistantStreamOperation[]>())
        .pipeThrough(
          new TransformStream<
            readonly AssistantStreamOperation[],
            AssistantStreamChunk
          >({
            transform(operations, controller) {
              accumulator.append(operations);
              controller.enqueue({
                snapshot: accumulator.state,
                operations,
              });
            },
          })
        )
    );
  }
}

export class AssistantStreamResponse extends Response {
  constructor(body: ReadableStream<AssistantStreamChunk>) {
    super(body.pipeThrough(new AssistantStreamEncoder()), {
      headers: new Headers({
        "Content-Type": CONTENT_TYPE_EVENT_STREAM,
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Assistant-Stream-Format": ASSISTANT_STREAM_FORMAT,
      }),
    });
  }
}

export const fromAssistantStreamResponse = (
  response: Response
): ReadableStream<AssistantStreamChunk> => {
  if (!response.ok)
    throw new Error(
      `Response failed with status ${response.status}: ${response.statusText}`
    );
  if (!response.body) throw new Error("Response body is null");

  const contentType = response.headers.get("Content-Type");
  if (contentType !== CONTENT_TYPE_EVENT_STREAM) {
    throw new Error(
      `Expected Content-Type "${CONTENT_TYPE_EVENT_STREAM}", got "${contentType}"`
    );
  }

  const streamFormat = response.headers.get("Assistant-Stream-Format");
  if (streamFormat !== ASSISTANT_STREAM_FORMAT) {
    throw new Error(
      `Unsupported Assistant-Stream-Format: "${streamFormat}", expected "${ASSISTANT_STREAM_FORMAT}"`
    );
  }
  return response.body.pipeThrough(new AssistantStreamDecoder());
};
