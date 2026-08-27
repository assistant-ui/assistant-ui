import { PipeableTransformStream } from "./PipeableTransformStream";
import {
  SSEEventDecoderStream,
  type PipelineSSEEvent,
} from "./SSEEventDecoderStream";

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
  strict?: boolean | undefined;
  onUnknownEvent?: (event: string) => void;
};

export const createSSEJsonEncoder = <T>(doneMarker?: string) =>
  new PipeableTransformStream<T, Uint8Array<ArrayBuffer>>((readable) =>
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
      .pipeThrough(new TextEncoderStream()),
  );

export const createSSEJsonDecoder = <T>({
  parse,
  done,
  strict = true,
  onUnknownEvent,
}: SSEJsonDecoderOptions<T>) => {
  let receivedDone = false;

  return new PipeableTransformStream<Uint8Array<ArrayBuffer>, T>((readable) =>
    readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new SSEEventDecoderStream())
      .pipeThrough(
        new TransformStream<PipelineSSEEvent, T>({
          transform(event, controller) {
            if (event.event !== "message") {
              if (strict) {
                throw new Error(`Unknown SSE event type: ${event.event}`);
              }
              onUnknownEvent?.(event.event);
              return;
            }

            if (done !== undefined && event.data === done.marker) {
              done.onDone?.(controller);
              receivedDone = true;
              controller.terminate();
              return;
            }

            parse(event.data, controller);
          },
          flush() {
            if (done !== undefined && !receivedDone) {
              done.onMissing?.();
            }
          },
        }),
      ),
  );
};
