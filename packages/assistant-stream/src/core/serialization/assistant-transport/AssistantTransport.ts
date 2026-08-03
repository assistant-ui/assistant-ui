import sjson from "secure-json-parse";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import {
  SSEEventDecoderStream,
  type PipelineSSEEvent,
} from "../../utils/stream/SSEEventDecoderStream";
import type { AssistantStreamEncoder } from "../../AssistantStream";

type ChunkFields = Record<string, unknown>;

type ChunkRule = {
  kind: "message" | "part-addressed";
  valid: (chunk: ChunkFields) => boolean;
};

const noFields = () => true;
const requiredObject = (key: string) => (c: ChunkFields) => {
  const value = c[key];
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
const requiredString = (key: string) => (c: ChunkFields) =>
  typeof c[key] === "string";
const requiredArray = (key: string) => (c: ChunkFields) =>
  Array.isArray(c[key]);
const optionalBoolean = (key: string) => (c: ChunkFields) =>
  c[key] === undefined || typeof c[key] === "boolean";

const KNOWN_CHUNK_TYPES: Record<AssistantStreamChunk["type"], ChunkRule> = {
  "part-start": { kind: "message", valid: requiredObject("part") },
  "part-finish": { kind: "part-addressed", valid: noFields },
  "tool-call-args-text-finish": { kind: "part-addressed", valid: noFields },
  "text-delta": { kind: "part-addressed", valid: requiredString("textDelta") },
  annotations: { kind: "message", valid: requiredArray("annotations") },
  data: { kind: "message", valid: requiredArray("data") },
  "step-start": { kind: "message", valid: noFields },
  "step-finish": { kind: "message", valid: requiredString("finishReason") },
  "message-finish": { kind: "message", valid: requiredString("finishReason") },
  result: { kind: "part-addressed", valid: optionalBoolean("isError") },
  error: { kind: "message", valid: noFields },
  "update-state": { kind: "message", valid: requiredArray("operations") },
};

const parseChunk = (data: string): AssistantStreamChunk | string => {
  let value: unknown;
  try {
    value = sjson.parse(data);
  } catch {
    return "unparseable";
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return "not-an-object";
  const { type, path } = value as { type?: unknown; path?: unknown };
  if (
    typeof type !== "string" ||
    !Object.prototype.hasOwnProperty.call(KNOWN_CHUNK_TYPES, type)
  )
    return "unknown-type";
  const rule = KNOWN_CHUNK_TYPES[type as AssistantStreamChunk["type"]];
  if (!rule.valid(value as Record<string, unknown>))
    return `invalid-fields:${type}`;
  if (path === undefined) {
    if (rule.kind !== "message") return `missing-path:${type}`;
    return { ...value, path: [] } as unknown as AssistantStreamChunk;
  }
  if (
    !Array.isArray(path) ||
    !path.every((entry) => Number.isInteger(entry) && entry >= 0)
  )
    return "invalid-path";
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
  constructor(options: { strict?: boolean | undefined } = {}) {
    const strict = options.strict ?? true;
    super((readable) => {
      let receivedDone = false;
      const warnedReasons = new Set<string>();

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
                    if (typeof chunk === "string") {
                      if (!warnedReasons.has(chunk)) {
                        warnedReasons.add(chunk);
                        console.warn(
                          `Dropped invalid assistant-transport chunk (${chunk}): ${event.data.slice(0, 200)}`,
                        );
                      }
                    } else {
                      controller.enqueue(chunk);
                    }
                  }
                  break;
                default:
                  if (strict)
                    throw new Error(`Unknown SSE event type: ${event.event}`);
                  if (!warnedReasons.has(`event:${event.event}`)) {
                    warnedReasons.add(`event:${event.event}`);
                    console.error(
                      `Ignored unknown SSE event type: ${event.event}`,
                    );
                  }
              }
            },
            flush() {
              if (!receivedDone) {
                if (strict)
                  throw new Error(
                    "Stream ended abruptly without receiving [DONE] marker",
                  );
                console.warn(
                  "Stream ended abruptly without receiving [DONE] marker",
                );
              }
            },
          }),
        );
    });
  }
}
