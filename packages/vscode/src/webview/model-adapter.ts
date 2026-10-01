import type { ChatModelAdapter } from "@assistant-ui/core";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
  toGenericMessages,
  toToolsJSONSchema,
  UIMessageStreamDecoder,
  unstable_toolResultStream,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";
import type { VSCodeModelRequest } from "../model-request";
import { vscodeFetch, type VSCodeFetch } from "./fetch";

type MaybePromise<T> = T | Promise<T>;

export type VSCodeModelAdapterOptions = {
  /** Route served by `serveWebviewRoutes`. Defaults to `/api/model`. */
  api?: string;
  fetch?: VSCodeFetch;
  headers?: HeadersInit | (() => MaybePromise<HeadersInit>);
  body?:
    | Record<string, unknown>
    | (() => MaybePromise<Record<string, unknown>>);
};

const isDataStream = (headers: Headers) =>
  headers.get("x-vercel-ai-data-stream")?.trim() === "v1";

/**
 * A `ChatModelAdapter` for `useLocalRuntime` that posts the thread to a route
 * in the extension host. The route answers with an assistant-stream data
 * stream (`createAssistantStreamResponse`) or an AI SDK UI message stream.
 */
export function createVSCodeModelAdapter({
  api = "/api/model",
  fetch = vscodeFetch,
  headers,
  body,
}: VSCodeModelAdapterOptions = {}): ChatModelAdapter {
  return {
    async *run({
      messages,
      runConfig,
      abortSignal,
      context,
      unstable_threadId,
      unstable_getMessage,
    }) {
      const requestHeaders = new Headers(
        typeof headers === "function" ? await headers() : headers,
      );
      requestHeaders.set("Content-Type", "application/json");
      const extraBody = typeof body === "function" ? await body() : body;

      const response = await fetch(api, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          system: context.system,
          messages: toGenericMessages([
            ...messages,
            unstable_getMessage(),
          ] as Parameters<typeof toGenericMessages>[0]),
          tools: toToolsJSONSchema(context.tools),
          runConfig,
          ...(unstable_threadId ? { threadId: unstable_threadId } : {}),
          ...context.callSettings,
          ...context.config,
          ...extraBody,
        } satisfies VSCodeModelRequest),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${await response.text()}`);
      }
      if (!response.body) throw new Error("Response body is null");

      const stream = response.body
        .pipeThrough(
          isDataStream(response.headers)
            ? new DataStreamDecoder()
            : new UIMessageStreamDecoder(),
        )
        .pipeThrough(
          unstable_toolResultStream(context.tools, abortSignal, () => {
            throw new Error(
              "Tool interrupt is not supported by the VS Code model adapter",
            );
          }),
        )
        .pipeThrough(new AssistantMessageAccumulator());

      yield* asAsyncIterableStream(stream);
    },
  };
}
