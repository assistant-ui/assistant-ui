import { ThreadAssistantContentPart, ThreadMessage } from "../../types";
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
  maxToolRoundtrips?: number;
};

export class EdgeChatAdapter implements ChatModelAdapter {
  constructor(private options: EdgeChatAdapterOptions) {}

  async roundtrip(
    initialContent: ThreadAssistantContentPart[],
    { messages, abortSignal, config, onUpdate }: ChatModelRunOptions,
  ) {
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

    const stream = result
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(chunkByLineStream())
      .pipeThrough(assistantDecoderStream())
      .pipeThrough(toolResultStream(config.tools))
      .pipeThrough(runResultStream(initialContent));

    let message: ThreadMessage | undefined;
    let update: ChatModelRunResult | undefined;
    for await (update of asAsyncIterable(stream)) {
      message = onUpdate(update);
    }
    if (update === undefined)
      throw new Error("No data received from Edge Runtime");

    return [message, update] as const;
  }

  async run({ messages, abortSignal, config, onUpdate }: ChatModelRunOptions) {
    let roundtripAllowance = this.options.maxToolRoundtrips ?? 1;
    let usage = {
      promptTokens: 0,
      completionTokens: 0,
    };
    let result;
    let assistantMessage;
    do {
      [assistantMessage, result] = await this.roundtrip(result?.content ?? [], {
        messages: assistantMessage ? [...messages, assistantMessage] : messages,
        abortSignal,
        config,
        onUpdate,
      });
      if (result.status?.type === "done") {
        usage.promptTokens += result.status.usage?.promptTokens ?? 0;
        usage.completionTokens += result.status.usage?.completionTokens ?? 0;
      }
    } while (
      result.status?.type === "done" &&
      result.status.finishReason === "tool-calls" &&
      result.content.every((c) => c.type !== "tool-call" || !!c.result) &&
      roundtripAllowance-- > 0
    );

    // add usage across all roundtrips
    if (result.status?.type === "done" && usage.promptTokens > 0) {
      result = {
        ...result,
        status: {
          ...result.status,
          usage,
        },
      };
    }

    return result;
  }
}
