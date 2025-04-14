import { toCoreMessages } from "../converters/toCoreMessages";
import { toLanguageModelTools } from "../converters/toLanguageModelTools";
import { EdgeRuntimeRequestOptions } from "../edge/EdgeRuntimeRequestOptions";
import { asAsyncIterableStream } from "assistant-stream/utils";
import {
  CreateEdgeRuntimeAPIOptions,
  getEdgeRuntimeStream,
} from "../edge/createEdgeRuntimeAPI";
import { AssistantMessageAccumulator } from "assistant-stream";
import {
  ChatModelAdapter,
  ChatModelRunOptions,
  unstable_toolResultStream,
} from "@assistant-ui/react";

export type DangerousInBrowserAdapterOptions = CreateEdgeRuntimeAPIOptions;

export class DangerousInBrowserAdapter implements ChatModelAdapter {
  constructor(private options: DangerousInBrowserAdapterOptions) {}

  async *run({ messages, abortSignal, context }: ChatModelRunOptions) {
    const res = await getEdgeRuntimeStream({
      options: this.options,
      abortSignal,
      requestData: {
        system: context.system,
        messages: toCoreMessages(messages),
        tools: context.tools ? toLanguageModelTools(context.tools) : [],
        ...context.callSettings,
        ...context.config,
      } satisfies EdgeRuntimeRequestOptions,
    });

    const stream = res
      .pipeThrough(unstable_toolResultStream(context.tools, abortSignal))
      .pipeThrough(new AssistantMessageAccumulator());

    yield* asAsyncIterableStream(stream);
  }
}
