import { assistantDecoderStream } from "./streams/assistantDecoderStream";
import { chunkByLineStream } from "./streams/chunkByLineStream";
import {
  ChatModelAdapter,
  ChatModelRunResult,
} from "../local/ChatModelAdapter";
import { runResultStream } from "./streams/runResultStream";
import { useLocalRuntime } from "..";
import { useMemo } from "react";
import { toolResultStream } from "./streams/toolResultStream";
import { Tool } from "../../types/ModelConfigTypes";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { CoreThreadMessage } from "../../types";
import { EdgeRuntimeRequestOptions } from "./EdgeRuntimeRequestOptions";
import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";
import { JSONSchema7 } from "json-schema";

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

const toSerializableTools = (
  tools: Record<string, Tool<any, any>> | undefined,
): LanguageModelV1FunctionTool[] => {
  if (!tools) return [];
  return Object.entries(tools).map(([name, tool]) => ({
    type: "function",
    name,
    ...(tool.description ? { description: tool.description } : undefined),
    parameters: (tool.parameters instanceof z.ZodType
      ? zodToJsonSchema(tool.parameters)
      : tool.parameters) as JSONSchema7,
  }));
};

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
        messages: messages as CoreThreadMessage[],
        tools: toSerializableTools(
          config.tools,
        ) as EdgeRuntimeRequestOptions["tools"],
      } satisfies EdgeRuntimeRequestOptions),
      signal: abortSignal,
    });

    const stream = result
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(chunkByLineStream())
      .pipeThrough(assistantDecoderStream())
      .pipeThrough(toolResultStream(config.tools))
      .pipeThrough(runResultStream());

    let update: ChatModelRunResult | undefined;
    for await (update of asAsyncIterable(stream)) {
      onUpdate(update);
    }
    if (update === undefined)
      throw new Error("No data received from Edge Runtime");
    return update;
  },
});

export const useEdgeRuntime = (options: EdgeRuntimeOptions) => {
  const adapter = useMemo(() => createEdgeChatAdapter(options), [options]);
  return useLocalRuntime(adapter);
};
