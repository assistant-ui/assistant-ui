import { ChatModelAdapter, ChatModelRunOptions } from "../local";
import { ChatModelRunResult } from "../local/ChatModelAdapter";
import { toCoreMessages } from "./converters/toCoreMessages";
import { toLanguageModelTools } from "./converters/toLanguageModelTools";
import { EdgeRuntimeRequestOptions } from "./EdgeRuntimeRequestOptions";
import { assistantDecoderStream } from "./streams/assistantDecoderStream";
import { chunkByLineStream } from "./streams/chunkByLineStream";
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
};

export class EdgeChatAdapter implements ChatModelAdapter {
  constructor(private options: EdgeChatAdapterOptions) {}

  async *run({ messages, abortSignal, config }: ChatModelRunOptions) {
    const result = await fetch(this.options.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system: config.system,
        messages: toCoreMessages(messages),
        tools: config.tools ? toLanguageModelTools(config.tools) : [],
        ...config.callSettings,
        ...config.config,
      } satisfies EdgeRuntimeRequestOptions),
      signal: abortSignal,
    });

    if (result.status !== 200) {
      throw new Error(`Status ${result.status}: ${await result.text()}`);
    }

    const stream = result
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(chunkByLineStream())
      .pipeThrough(assistantDecoderStream())
      .pipeThrough(toolResultStream(config.tools))
      .pipeThrough(runResultStream());

    let update: ChatModelRunResult | undefined;
    for await (update of asAsyncIterable(stream)) {
      yield update;
    }

    if (update === undefined)
      throw new Error("No data received from Edge Runtime");
  }
}
