import {
  SSEEventDecoderStream,
  type PipelineSSEEvent,
} from "./SSEEventDecoderStream";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

type SSEJsonDoneOptions<T> = {
  marker: string;
  onDone?: (controller: TransformStreamDefaultController<T>) => void;
  onMissing?: () => void;
};

type SSEJsonDecoderOptions<T> = {
  parse: (
    data: string,
    controller: TransformStreamDefaultController<T>,
  ) => void;
  done?: SSEJsonDoneOptions<T>;
} & (
  | { strict?: true }
  | {
      strict: false;
      onUnknownEvent?: (event: string) => void;
    }
);

export const createSSEJsonEncoder =
  <T>(doneMarker?: string) =>
  (readable: ReadableStream<T>) =>
    readable
      .pipeThrough(
        new TransformStream<T, string>({
          transform(chunk, controller) {
            controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
          },
          flush(controller) {
            if (doneMarker !== undefined) {
              controller.enqueue(`data: ${doneMarker}\n\n`);
            }
          },
        }),
      )
      .pipeThrough(new TextEncoderStream());

export const createSSEJsonDecoder =
  <T>(options: SSEJsonDecoderOptions<T>) =>
  (readable: ReadableStream<Uint8Array<ArrayBuffer>>) => {
    let receivedDone = false;

    return readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new SSEEventDecoderStream())
      .pipeThrough(
        new TransformStream<PipelineSSEEvent, T>({
          transform(event, controller) {
            if (event.event !== "message") {
              if (options.strict !== false) {
                throw new Error(`Unknown SSE event type: ${event.event}`);
              }
              options.onUnknownEvent?.(event.event);
              return;
            }

            if (
              options.done !== undefined &&
              event.data === options.done.marker
            ) {
              options.done.onDone?.(controller);
              receivedDone = true;
              controller.terminate();
              return;
            }

            options.parse(event.data, controller);
          },
          flush() {
            if (options.done !== undefined && !receivedDone) {
              options.done.onMissing?.();
            }
          },
        }),
      );
  };
