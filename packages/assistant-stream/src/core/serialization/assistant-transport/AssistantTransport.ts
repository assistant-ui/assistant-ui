import { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import { LineDecoderStream } from "../../utils/stream/LineDecoderStream";
import { AssistantStreamEncoder } from "../../AssistantStream";

/**
 * AssistantTransportEncoder encodes AssistantStreamChunks into SSE format
 * and emits [DONE] when the stream completes.
 */
export class AssistantTransportEncoder
  extends PipeableTransformStream<AssistantStreamChunk, Uint8Array<ArrayBuffer>>
  implements AssistantStreamEncoder
{
  headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  constructor() {
    super((readable) => {
      return readable
        .pipeThrough(
          new TransformStream<AssistantStreamChunk, string>({
            transform(chunk, controller) {
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
            },
            flush(controller) {
              controller.enqueue("data: [DONE]\n\n");
            },
          }),
        )
        .pipeThrough(new TextEncoderStream());
    });
  }
}

type SSEEvent = {
  event: string;
  data: string;
  id?: string | undefined;
  retry?: number | undefined;
};

class SSEEventStream extends TransformStream<string, SSEEvent> {
  constructor() {
    let eventBuffer: Partial<SSEEvent> = {};
    let dataLines: string[] = [];

    super({
      start() {
        eventBuffer = {};
        dataLines = [];
      },
      transform(line, controller) {
        if (line.startsWith(":")) return; // Ignore comments

        if (line === "") {
          if (dataLines.length > 0) {
            controller.enqueue({
              event: eventBuffer.event || "message",
              data: dataLines.join("\n"),
              id: eventBuffer.id,
              retry: eventBuffer.retry,
            });
          }
          eventBuffer = {};
          dataLines = [];
          return;
        }

        const [field, ...rest] = line.split(":");
        const value = rest.join(":").trimStart();

        switch (field) {
          case "event":
            eventBuffer.event = value;
            break;
          case "data":
            dataLines.push(value);
            break;
          case "id":
            eventBuffer.id = value;
            break;
          case "retry":
            eventBuffer.retry = Number(value);
            break;
        }
      },
      flush(controller) {
        if (dataLines.length > 0) {
          controller.enqueue({
            event: eventBuffer.event || "message",
            data: dataLines.join("\n"),
            id: eventBuffer.id,
            retry: eventBuffer.retry,
          });
        }
      },
    });
  }
}

/**
 * AssistantTransportDecoder decodes SSE format into AssistantStreamChunks.
 * It stops decoding when it encounters [DONE].
 */
export class AssistantTransportDecoder extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  AssistantStreamChunk
> {
  constructor() {
    super((readable) => {
      let receivedDone = false;

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new LineDecoderStream())
        .pipeThrough(new SSEEventStream())
        .pipeThrough(
          new TransformStream<SSEEvent, AssistantStreamChunk>({
            transform(event, controller) {
              switch (event.event) {
                case "message":
                  if (event.data === "[DONE]") {
                    // Mark that we received [DONE]
                    receivedDone = true;
                    // Stop processing when we encounter [DONE]
                    controller.terminate();
                  } else {
                    controller.enqueue(JSON.parse(event.data));
                  }
                  break;
                default:
                  throw new Error(`Unknown SSE event type: ${event.event}`);
              }
            },
            flush() {
              if (!receivedDone) {
                throw new Error(
                  "Stream ended abruptly without receiving [DONE] marker",
                );
              }
            },
          }),
        );
    });
  }
}
