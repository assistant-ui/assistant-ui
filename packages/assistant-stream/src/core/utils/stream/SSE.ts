import { PipeableTransformStream } from "./PipeableTransformStream";
import {
  SSEEventDecoderStream,
  type PipelineSSEEvent,
} from "./SSEEventDecoderStream";

export class SSEEncoder<T> extends PipeableTransformStream<
  T,
  Uint8Array<ArrayBuffer>
> {
  static readonly headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  headers = SSEEncoder.headers;

  constructor() {
    super((readable) =>
      readable
        .pipeThrough(
          new TransformStream<T, string>({
            transform(chunk, controller) {
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
            },
          }),
        )
        .pipeThrough(new TextEncoderStream()),
    );
  }
}

export class SSEDecoder<T> extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  T
> {
  constructor() {
    super((readable) =>
      readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new SSEEventDecoderStream())
        .pipeThrough(
          new TransformStream<PipelineSSEEvent, T>({
            transform(event, controller) {
              switch (event.event) {
                case "message":
                  controller.enqueue(JSON.parse(event.data));
                  break;
                default:
                  throw new Error(`Unknown SSE event type: ${event.event}`);
              }
            },
          }),
        ),
    );
  }
}
