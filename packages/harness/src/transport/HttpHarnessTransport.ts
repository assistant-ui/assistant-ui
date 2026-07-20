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

/**
 * The assistant-transport wire: POST { commands, state, threadId } and decode
 * the response stream, yielding each server state snapshot.
 */
export class HttpHarnessTransport implements HarnessTransport {
  readonly #options: HttpHarnessTransportOptions;

  constructor(options: HttpHarnessTransportOptions) {
    this.#options = options;
  }

  run(input: HarnessRunInput): AsyncIterable<HarnessState> {
    return this.#stream(this.#options.api, input.commands, input, {
      replay: false,
    });
  }

  resume(
    input: Omit<HarnessRunInput, "commands">,
  ): AsyncIterable<HarnessState> {
    const { resumeApi } = this.#options;
    if (!resumeApi)
      throw new Error("HttpHarnessTransport: resume requires resumeApi");
    return this.#stream(resumeApi, [], input, { replay: true });
  }

  async *#stream(
    url: string,
    commands: readonly HarnessCommand[],
    input: Omit<HarnessRunInput, "commands">,
    { replay }: { replay: boolean },
  ): AsyncGenerator<HarnessState> {
    const { headers: headersOption, body, protocol } = this.#options;
    const headers = new Headers(
      typeof headersOption === "function"
        ? await headersOption()
        : headersOption,
    );
    headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        commands,
        state: input.state,
        threadId: input.threadId,
        ...body,
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
    const stream = response.body.pipeThrough(decoder).pipeThrough(
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
    for await (const chunk of asAsyncIterableStream(stream)) {
      const next = chunk.metadata.unstable_state;
      if (next === last) continue;
      last = next;
      yield next as HarnessState;
    }
    if (error) throw new Error(error);
  }
}
