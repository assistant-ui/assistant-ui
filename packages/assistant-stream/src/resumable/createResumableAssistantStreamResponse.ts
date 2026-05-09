import type { AssistantStreamEncoder } from "../core/AssistantStream";
import {
  createAssistantStream,
  type AssistantStreamController,
} from "../core/modules/assistant-stream";
import { DataStreamEncoder } from "../core/serialization/data-stream/DataStream";
import type { ResumableStreamContext } from "./ResumableStreamContext";

export const RESUMABLE_STREAM_ID_HEADER = "x-resumable-stream-id";

export type CreateResumableAssistantStreamResponseOptions = {
  readonly context: ResumableStreamContext;
  readonly streamId: string;
  readonly callback: (
    controller: AssistantStreamController,
  ) => PromiseLike<void> | void;
  /** Defaults to `DataStreamEncoder`. Also consulted for response headers. */
  readonly encoder?: () => AssistantStreamEncoder;
  readonly headers?: HeadersInit;
};

export async function createResumableAssistantStreamResponse(
  options: CreateResumableAssistantStreamResponseOptions,
): Promise<Response> {
  const encoder = (options.encoder ?? (() => new DataStreamEncoder()))();

  const stream = await options.context.run(options.streamId, () => {
    const aStream = createAssistantStream(options.callback);
    return aStream.pipeThrough(encoder);
  });

  return new Response(stream, {
    headers: mergeHeaders(encoder.headers, options.headers, options.streamId),
  });
}

export type CreateResumeAssistantStreamResponseOptions = {
  readonly context: ResumableStreamContext;
  readonly streamId: string;
  /** Read for `headers` only; the encoder transform is not invoked on resume. */
  readonly encoder?: () => AssistantStreamEncoder;
  readonly headers?: HeadersInit;
  /** Defaults to a 404 JSON response. */
  readonly missingResponse?: () => Response;
};

export async function createResumeAssistantStreamResponse(
  options: CreateResumeAssistantStreamResponseOptions,
): Promise<Response> {
  const stream = await options.context.resume(options.streamId);
  if (!stream) {
    return options.missingResponse?.() ?? defaultMissingResponse();
  }
  const encoder = (options.encoder ?? (() => new DataStreamEncoder()))();
  return new Response(stream, {
    headers: mergeHeaders(encoder.headers, options.headers, options.streamId),
  });
}

function defaultMissingResponse(): Response {
  return new Response(JSON.stringify({ error: "stream not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

function mergeHeaders(
  encoderHeaders: Headers | undefined,
  extra: HeadersInit | undefined,
  streamId: string,
): Headers {
  const merged = new Headers(encoderHeaders ?? {});
  if (extra) {
    for (const [key, value] of new Headers(extra)) {
      merged.set(key, value);
    }
  }
  merged.set(RESUMABLE_STREAM_ID_HEADER, streamId);
  return merged;
}
