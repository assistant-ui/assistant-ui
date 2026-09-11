import sjson from "secure-json-parse";
import { PipeableTransformStream } from "./PipeableTransformStream";
import {
  createSSEJsonDecoder,
  createSSEJsonEncoder,
  SSE_HEADERS,
} from "./SSEJson";

export class SSEEncoder<T> extends PipeableTransformStream<
  T,
  Uint8Array<ArrayBuffer>
> {
  static readonly headers = new Headers(SSE_HEADERS);

  headers = SSEEncoder.headers;

  constructor() {
    super(createSSEJsonEncoder<T>());
  }
}

export class SSEDecoder<T> extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  T
> {
  constructor(options: { strict?: boolean | undefined } = {}) {
    const strict = options.strict ?? true;
    const ignoredEvents = new Set<string>();
    super(
      createSSEJsonDecoder<T>({
        parse(data, controller) {
          let value;
          try {
            value = sjson.parse(data);
          } catch {
            console.warn(`Dropped invalid SSE message: ${data.slice(0, 200)}`);
            return;
          }
          controller.enqueue(value);
        },
        ...(strict
          ? { strict: true }
          : {
              strict: false,
              onUnknownEvent(event) {
                if (!ignoredEvents.has(event)) {
                  ignoredEvents.add(event);
                  console.error(`Ignored unknown SSE event type: ${event}`);
                }
              },
            }),
      }),
    );
  }
}
