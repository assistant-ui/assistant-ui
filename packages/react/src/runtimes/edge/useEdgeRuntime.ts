import { assistantDecoderStream } from "./streams/assistantDecoderStream";
import { chunkByLineStream } from "./streams/chunkByLineStream";
import {
  ChatModelAdapter,
  ChatModelRunResult,
} from "../local/ChatModelAdapter";
import { runResultStream } from "./streams/runResultStream";
import { useLocalRuntime } from "..";
import { useMemo } from "react";

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

type EdgeRuntimeOptions = { api: string };

const createEdgeChatAdapter = ({
  api,
}: EdgeRuntimeOptions): ChatModelAdapter => ({
  run: async ({ messages, abortSignal, config, onUpdate }) => {
    const result = await fetch(api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system: config.system,
        messages,
        tools: config.tools,
      }),
      signal: abortSignal,
    });

    const stream = result
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(chunkByLineStream())
      .pipeThrough(assistantDecoderStream())
      .pipeThrough(runResultStream());

    let update: ChatModelRunResult | undefined;
    for await (update of asAsyncIterable(stream)) {
      onUpdate(update);
    }
    if (update === undefined) throw new Error("No data received from Edge Runtime");
    return update;
  },
});

export const useEdgeRuntime = (options: EdgeRuntimeOptions) => {
  const adapter = useMemo(() => createEdgeChatAdapter(options), [options]);
  return useLocalRuntime(adapter);
};
