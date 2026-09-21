import type { AssistantCloud } from "assistant-cloud";
import type { ChatModelRunOptions } from "@assistant-ui/core";
import {
  splitLocalRuntimeOptions,
  useLocalRuntime,
} from "@assistant-ui/core/react";
import { toToolsJSONSchema } from "assistant-stream";
import type { UseDataStreamRuntimeOptions } from "./useDataStreamRuntime";
import { DataStreamRuntimeAdapter } from "./DataStreamRuntimeAdapter";

type UseCloudRuntimeOptions = Omit<UseDataStreamRuntimeOptions, "api"> & {
  cloud: AssistantCloud;
  assistantId: string;
};

export const useCloudRuntime = (options: UseCloudRuntimeOptions) => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);
  const { assistantId, ...streamOptions } = otherOptions;
  const cloudOptions =
    options.cloud.runs.__internal_getAssistantOptions(assistantId);
  const { api, headers, body: buildCloudBody, protocol } = cloudOptions;

  const adapter = new DataStreamRuntimeAdapter(
    {
      ...streamOptions,
      api,
      headers,
      protocol,
    },
    async ({
      messages,
      runConfig,
      context,
      unstable_assistantMessageId,
      unstable_threadId,
      unstable_parentId,
      unstable_getMessage,
    }: ChatModelRunOptions) => {
      const bodyValue =
        typeof streamOptions.body === "function"
          ? await streamOptions.body()
          : streamOptions.body;
      const cloudBodyValue = await buildCloudBody(
        unstable_threadId !== undefined ? { threadId: unstable_threadId } : {},
      );

      return {
        system: context.system,
        messages: [...messages, unstable_getMessage()],
        tools: toToolsJSONSchema(context.tools ?? {}),
        ...(unstable_assistantMessageId ? { unstable_assistantMessageId } : {}),
        ...(unstable_parentId !== undefined
          ? { parentId: unstable_parentId }
          : {}),
        runConfig,
        state: unstable_getMessage().metadata.unstable_state ?? undefined,
        ...context.callSettings,
        ...context.config,
        ...(bodyValue ?? {}),
        ...cloudBodyValue,
      };
    },
  );

  return useLocalRuntime(adapter, localRuntimeOptions);
};
