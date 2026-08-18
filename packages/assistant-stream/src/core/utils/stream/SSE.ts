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

  /**
   * `doneSentinel` is written verbatim after the last chunk, so a protocol that
   * terminates on a marker emits it without passing it through JSON.
   */
  constructor(options: { doneSentinel?: string | undefined } = {}) {
    const { doneSentinel } = options;
    super((readable) =>
      readable
        .pipeThrough(
          new TransformStream<T, string>({
            transform(chunk, controller) {
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
            },
            flush(controller) {
              if (doneSentinel === undefined) return;
              controller.enqueue(`data: ${doneSentinel}\n\n`);
            },
          }),
        )
        .pipeThrough(new TextEncoderStream()),
    );
  }
}

export type SSEMessageDecoderOptions<T> = {
  strict?: boolean | undefined;
  doneSentinel?: string | undefined;
  onMessage: (
    data: string,
    controller: TransformStreamDefaultController<T>,
  ) => void;
  onDone?:
    | ((controller: TransformStreamDefaultController<T>) => void)
    | undefined;
};

/**
 * The SSE half of a decode pipeline: byte decoding, event framing, unknown-event
 * policy and the terminating sentinel. What a `message` payload means is the
 * protocol's business and stays with the caller in `onMessage`; `onDone` runs
 * before the sentinel terminates the stream, so a protocol can flush buffered
 * state into the output first.
 */
export class SSEMessageDecoder<T> extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  T
> {
  constructor(options: SSEMessageDecoderOptions<T>) {
    const { strict = true, doneSentinel, onMessage, onDone } = options;
    super((readable) => {
      const ignoredEvents = new Set<string>();

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new SSEEventDecoderStream())
        .pipeThrough(
          new TransformStream<PipelineSSEEvent, T>({
            transform(event, controller) {
              switch (event.event) {
                case "message":
                  if (
                    doneSentinel !== undefined &&
                    event.data === doneSentinel
                  ) {
                    onDone?.(controller);
                    controller.terminate();
                    break;
                  }
                  onMessage(event.data, controller);
                  break;
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
            flush() {
              if (doneSentinel === undefined) return;
              const message = `Stream ended abruptly without receiving ${doneSentinel} marker`;
              if (strict) throw new Error(message);
              console.warn(message);
            },
          }),
        );
    });
  }
}

export class SSEDecoder<T> extends SSEMessageDecoder<T> {
  constructor(options: { strict?: boolean | undefined } = {}) {
    super({
      strict: options.strict ?? true,
      onMessage(data, controller) {
        let value;
        try {
          value = sjson.parse(data);
        } catch {
          console.warn(`Dropped invalid SSE message: ${data.slice(0, 200)}`);
          return;
        }
        controller.enqueue(value);
      },
    });
  }
}
