import { asAsyncIterableStream } from "assistant-stream/utils";
import {
  AssistantMessageAccumulator,
  unstable_toolResultStream,
} from "assistant-stream";
import { ChatModelAdapter, ChatModelRunOptions } from "@assistant-ui/react";
import {
  CreateEdgeRuntimeAPIOptions,
  getEdgeRuntimeStream,
} from "./createEdgeRuntimeAPI";

export type DangerousInBrowserAdapterOptions = CreateEdgeRuntimeAPIOptions;

export class DangerousInBrowserAdapter implements ChatModelAdapter {
  constructor(private options: DangerousInBrowserAdapterOptions) {}

  async *run({ messages, abortSignal, context }: ChatModelRunOptions) {
    const res = await getEdgeRuntimeStream({
      options: {
        ...this.options,
        ...(context.tools && { tools: context.tools }),
      },
      abortSignal,
      requestData: {
        system: context.system,
        messages: messages,
        ...Object.fromEntries(
          Object.entries({ ...context.callSettings, ...context.config }).filter(
            ([_, v]) => v !== undefined,
          ),
        ),
      },
    });

    const stream = res
      .pipeThrough(unstable_toolResultStream(context.tools, abortSignal))
      .pipeThrough(new AssistantMessageAccumulator());

    yield* asAsyncIterableStream(stream);
  }
}
