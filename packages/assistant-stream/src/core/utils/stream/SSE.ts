import sjson from "secure-json-parse";
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
  constructor(options: { strict?: boolean | undefined } = {}) {
    const strict = options.strict ?? true;
    const ignoredEvents = new Set<string>();
    super((readable) =>
      readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new SSEEventDecoderStream())
        .pipeThrough(
          new TransformStream<PipelineSSEEvent, T>({
            transform(event, controller) {
              switch (event.event) {
                case "message": {
                  let value;
                  try {
                    value = sjson.parse(event.data);
                  } catch {
                    console.warn(
                      `Dropped invalid SSE message: ${event.data.slice(0, 200)}`,
                    );
                    break;
                  }
                  controller.enqueue(value);
                  break;
                }
                default:
                  if (strict)
                    throw new Error(`Unknown SSE event type: ${event.event}`);
                  if (!ignoredEvents.has(event.event)) {
                    ignoredEvents.add(event.event);
                    console.error(
                      `Ignored unknown SSE event type: ${event.event}`,
                    );
                  }
              }
            },
          }),
        ),
    );
  }
}
