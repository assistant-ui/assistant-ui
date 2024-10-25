import {
  ChatModelAdapter,
  ChatModelRunOptions,
} from "../local/ChatModelAdapter";
import { ChatModelRunResult } from "../local/ChatModelAdapter";
import { toCoreMessages } from "./converters/toCoreMessages";
import { toLanguageModelTools } from "./converters/toLanguageModelTools";
import { EdgeRuntimeRequestOptions } from "./EdgeRuntimeRequestOptions";
import { assistantDecoderStream } from "./streams/assistantDecoderStream";
import { streamPartDecoderStream } from "./streams/utils/streamPartDecoderStream";
import { runResultStream } from "./streams/runResultStream";
import { toolResultStream } from "./streams/toolResultStream";

export function asAsyncIterable<T>(
  source: ReadableStream<T>,
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: () => {
      const reader = source.getReader();
      return {
        async next(): Promise<IteratorResult<T, undefined>> {
          const { done, value } = await reader.read();
          return done
            ? { done: true, value: undefined }
            : { done: false, value };
        },
      };
    },
  };
}
export type EdgeChatAdapterOptions = {
  api: string;

  credentials?: RequestCredentials;
  headers?: Record<string, string> | Headers;
  body?: object;

  /**
   * When enabled, the adapter will not strip `id` from messages in the messages array.
   */
  unstable_sendMessageIds?: boolean;
};

export class EdgeChatAdapter implements ChatModelAdapter {
  constructor(private options: EdgeChatAdapterOptions) {}

  async *run({
    messages,
    abortSignal,
    config,
    unstable_assistantMessageId,
  }: ChatModelRunOptions) {
    const headers = new Headers(this.options.headers);
    headers.set("Content-Type", "application/json");

    const result = await fetch(this.options.api, {
      method: "POST",
      headers,
      credentials: this.options.credentials ?? "same-origin",
      body: JSON.stringify({
        system: config.system,
        messages: toCoreMessages(messages, {
          unstable_includeId: this.options.unstable_sendMessageIds,
        }),
        tools: config.tools ? toLanguageModelTools(config.tools) : [],
        unstable_assistantMessageId,
        ...config.callSettings,
        ...config.config,

        ...this.options.body,
      } satisfies EdgeRuntimeRequestOptions),
      signal: abortSignal,
    });

    if (!result.ok) {
      throw new Error(`Status ${result.status}: ${await result.text()}`);
    }

    const stream = result
      .body!.pipeThrough(streamPartDecoderStream())
      .pipeThrough(assistantDecoderStream())
      .pipeThrough(toolResultStream(config.tools, abortSignal))
      .pipeThrough(runResultStream());

    let update: ChatModelRunResult | undefined;
    for await (update of asAsyncIterable(stream)) {
      yield update;
    }

    if (update === undefined)
      throw new Error("No data received from Edge Runtime");
  }
}
