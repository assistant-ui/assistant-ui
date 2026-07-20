import { PipeableTransformStream } from "../utils/stream/PipeableTransformStream";
import { GorpStreamAccumulator } from "./GorpStreamAccumulator";
import { SSEDecoder, SSEEncoder } from "../utils/stream/SSE";
import type { GorpStreamChunk, GorpStreamOperation } from "./types";

export class GorpStreamEncoder extends PipeableTransformStream<
  GorpStreamChunk,
  Uint8Array
> {
  constructor() {
    super((readable) =>
      readable
        .pipeThrough(
          (() => {
            class GorpStreamTransformer implements Transformer<
              GorpStreamChunk,
              readonly GorpStreamOperation[]
            > {
              #isFirstChunk = true;

              start() {
                // Nothing needed here since we initialize in the field declaration
              }

              transform(
                chunk: GorpStreamChunk,
                controller: TransformStreamDefaultController<
                  readonly GorpStreamOperation[]
                >,
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
            return new TransformStream(new GorpStreamTransformer());
          })(),
        )
        .pipeThrough(new SSEEncoder()),
    );
  }
}

export class GorpStreamDecoder extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  GorpStreamChunk
> {
  constructor() {
    const accumulator = new GorpStreamAccumulator();
    super((readable) =>
      readable
        .pipeThrough(new SSEDecoder<readonly GorpStreamOperation[]>())
        .pipeThrough(
          new TransformStream<readonly GorpStreamOperation[], GorpStreamChunk>({
            transform(operations, controller) {
              accumulator.append(operations);
              controller.enqueue({
                snapshot: accumulator.state,
                operations,
              });
            },
          }),
        ),
    );
  }
}

export class GorpStreamResponse extends Response {
  constructor(body: ReadableStream<GorpStreamChunk>) {
    super(body.pipeThrough(new GorpStreamEncoder()), {
      headers: new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Assistant-Stream-Format": "object-stream/v0",
      }),
    });
  }
}

export const fromGorpStreamResponse = (
  response: Response,
): ReadableStream<GorpStreamChunk> => {
  if (!response.ok)
    throw new Error(`Response failed, status ${response.status}`);
  if (!response.body) throw new Error("Response body is null");
  const mediaType = response.headers
    .get("Content-Type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "text/event-stream") {
    throw new Error("Response is not an event stream");
  }
  if (response.headers.get("Assistant-Stream-Format") !== "object-stream/v0") {
    throw new Error("Unsupported Assistant-Stream-Format header");
  }
  return response.body.pipeThrough(new GorpStreamDecoder());
};
