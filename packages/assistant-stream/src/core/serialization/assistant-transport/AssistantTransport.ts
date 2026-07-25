import sjson from "secure-json-parse";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import {
  SSEEventDecoderStream,
  type PipelineSSEEvent,
} from "../../utils/stream/SSEEventDecoderStream";
import type { AssistantStreamEncoder } from "../../AssistantStream";

const KNOWN_CHUNK_TYPES: Record<
  AssistantStreamChunk["type"],
  "message" | "part-addressed"
> = {
  "part-start": "message",
  "part-finish": "part-addressed",
  "tool-call-args-text-finish": "part-addressed",
  "text-delta": "part-addressed",
  annotations: "message",
  data: "message",
  "step-start": "message",
  "step-finish": "message",
  "message-finish": "message",
  result: "part-addressed",
  error: "message",
  "update-state": "message",
};

const parseChunk = (data: string): AssistantStreamChunk | null => {
  let value: unknown;
  try {
    value = sjson.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const { type, path } = value as { type?: unknown; path?: unknown };
  if (
    typeof type !== "string" ||
    !Object.prototype.hasOwnProperty.call(KNOWN_CHUNK_TYPES, type)
  )
    return null;
  if (path === undefined) {
    if (KNOWN_CHUNK_TYPES[type as AssistantStreamChunk["type"]] !== "message")
      return null;
    return { ...value, path: [] } as unknown as AssistantStreamChunk;
  }
  if (
    !Array.isArray(path) ||
    !path.every((entry) => Number.isInteger(entry) && entry >= 0)
  )
    return null;
  return value as AssistantStreamChunk;
};

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
        .pipeThrough(new SSEEventDecoderStream())
        .pipeThrough(
          new TransformStream<PipelineSSEEvent, AssistantStreamChunk>({
            transform(event, controller) {
              switch (event.event) {
                case "message":
                  if (event.data === "[DONE]") {
                    // Mark that we received [DONE]
                    receivedDone = true;
                    // Stop processing when we encounter [DONE]
                    controller.terminate();
                  } else {
                    const chunk = parseChunk(event.data);
                    if (chunk) {
                      controller.enqueue(chunk);
                    } else {
                      console.warn(
                        `Dropped invalid assistant-transport chunk: ${event.data.slice(0, 200)}`,
                      );
                    }
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
