import {
  ChatModelAdapter,
  ChatModelRunOptions,
} from "../local/ChatModelAdapter";
import { toCoreMessages } from "../edge/converters/toCoreMessages";
import { toLanguageModelTools } from "../edge/converters/toLanguageModelTools";
import { EdgeRuntimeRequestOptions } from "../edge/EdgeRuntimeRequestOptions";
import { runResultStream } from "../edge/streams/runResultStream";
import { toolResultStream } from "../edge/streams/toolResultStream";
import { asAsyncIterable } from "../edge/EdgeChatAdapter";
import {
  CreateEdgeRuntimeAPIOptions,
  getEdgeRuntimeStream,
} from "../edge/createEdgeRuntimeAPI";

export type DangerousInBrowserAdapterOptions = CreateEdgeRuntimeAPIOptions;

export class DangerousInBrowserAdapter implements ChatModelAdapter {
  constructor(private options: DangerousInBrowserAdapterOptions) {}

  async *run({ messages, abortSignal, config }: ChatModelRunOptions) {
    const res = await getEdgeRuntimeStream({
      options: this.options,
      abortSignal,
      requestData: {
        system: config.system,
        messages: toCoreMessages(messages),
        tools: config.tools ? toLanguageModelTools(config.tools) : [],
        ...config.callSettings,
        ...config.config,
      } satisfies EdgeRuntimeRequestOptions,
    });

    const stream = res
      .pipeThrough(toolResultStream(config.tools, abortSignal))
      .pipeThrough(runResultStream());

    for await (const update of asAsyncIterable(stream)) {
      yield update;
    }
  }
}
