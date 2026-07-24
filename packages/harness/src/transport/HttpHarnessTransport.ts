import { resource } from "@assistant-ui/tap";
import {
  AssistantMessageAccumulator,
  AssistantTransportDecoder,
  DataStreamDecoder,
  unstable_createInitialMessage as createInitialMessage,
} from "assistant-stream";
import {
  asAsyncIterableStream,
  type ReadonlyJSONValue,
} from "assistant-stream/utils";
import type { HarnessCommand, HarnessState } from "../types";
import type { HarnessRunInput, HarnessTransport } from "./HarnessTransport";

export type HttpHarnessTransportOptions = {
  api: string;
  resumeApi?: string;
  protocol?: "data-stream" | "assistant-transport";
  headers?: HeadersInit | (() => Promise<HeadersInit>);
  /** Extra JSON fields merged into every request body. */
  body?: Record<string, unknown>;
};

async function* stream(
  options: HttpHarnessTransportOptions,
  url: string,
  commands: readonly HarnessCommand[],
  input: Omit<HarnessRunInput, "commands">,
  { replay }: { replay: boolean },
): AsyncGenerator<HarnessState> {
  const { headers: headersOption, body, protocol } = options;
  const headers = new Headers(
    typeof headersOption === "function" ? await headersOption() : headersOption,
  );
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...body,
      commands,
      state: input.state,
      threadId: input.threadId,
    }),
    signal: input.signal,
  });

  if (!response.ok)
    throw new Error(`Status ${response.status}: ${await response.text()}`);
  if (!response.body) throw new Error("Response body is null");

  const decoder =
    protocol === "assistant-transport"
      ? new AssistantTransportDecoder()
      : new DataStreamDecoder();

  let error: string | undefined;
  const chunks = response.body.pipeThrough(decoder).pipeThrough(
    new AssistantMessageAccumulator({
      initialMessage: createInitialMessage({
        unstable_state: (input.state as ReadonlyJSONValue) ?? null,
      }),
      throttle: replay,
      onError: (e) => {
        error = e;
      },
    }),
  );

  let last: unknown = input.state;
  for await (const chunk of asAsyncIterableStream(chunks)) {
    const next = chunk.metadata.unstable_state;
    if (next === last) continue;
    last = next;
    yield next as HarnessState;
  }
  if (error) throw new Error(error);
}

/**
 * The assistant-transport wire: POST { commands, state, threadId } and decode
 * the response stream, yielding each server state snapshot.
 */
const useHttpHarnessTransport = (
  options: HttpHarnessTransportOptions,
): HarnessTransport => {
  const { api, resumeApi } = options;
  return {
    run: (input) =>
      stream(options, api, input.commands, input, { replay: false }),
    ...(resumeApi && {
      resume: (input) =>
        stream(options, resumeApi, [], input, { replay: true }),
    }),
  };
};

export const HttpHarnessTransport = resource(useHttpHarnessTransport);
