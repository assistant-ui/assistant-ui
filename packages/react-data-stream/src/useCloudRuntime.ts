import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  splitLocalRuntimeOptions,
  useLocalRuntime,
} from "@assistant-ui/core/react";
import type { UseDataStreamRuntimeOptions } from "./useDataStreamRuntime";
import { DataStreamRuntimeAdapter } from "./dataStreamRuntimeAdapter";

type UseCloudRuntimeOptions = Omit<
  UseDataStreamRuntimeOptions,
  "api" | "protocol" | "headers" | "body"
> & {
  cloud: AssistantCloud;
  assistantId: string;
};

export const useCloudRuntime = (
  options: UseCloudRuntimeOptions,
): AssistantRuntime => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);
  const opts = options.cloud.runs.__internal_getAssistantOptions(
    options.assistantId,
  );

  return useLocalRuntime(
    new DataStreamRuntimeAdapter(
      {
        ...otherOptions,
        ...opts,
      },
      (messages) => [...messages],
    ),
    localRuntimeOptions,
  );
};
