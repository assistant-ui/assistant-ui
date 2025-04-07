import {
  ChatModelAdapter,
  ChatModelRunOptions,
} from "../local/ChatModelAdapter";
import { toCoreMessages } from "../edge/converters/toCoreMessages";
import { toLanguageModelTools } from "../edge/converters/toLanguageModelTools";
import { EdgeRuntimeRequestOptions } from "../edge/EdgeRuntimeRequestOptions";
import { toolResultStream } from "../edge/streams/toolResultStream";
import { asAsyncIterable } from "../edge/EdgeModelAdapter";
import {
  CreateEdgeRuntimeAPIOptions,
  getEdgeRuntimeStream,
} from "../edge/createEdgeRuntimeAPI";
import { AssistantMessageAccumulator } from "assistant-stream";

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
      .pipeThrough(toolResultStream(context.tools, abortSignal))
      .pipeThrough(new AssistantMessageAccumulator());

    for await (const update of asAsyncIterable(stream)) {
      yield update;
    }
  }
}
