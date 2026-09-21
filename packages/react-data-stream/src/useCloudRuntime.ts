import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  useDataStreamRuntime,
  type UseDataStreamRuntimeOptions,
} from "./useDataStreamRuntime";

type UseCloudRuntimeOptions = Omit<
  UseDataStreamRuntimeOptions,
  "api" | "protocol" | "headers" | "body"
> & {
  cloud: AssistantCloud;
  assistantId: string;
};

/**
 * @deprecated This is under active development and not yet ready for prod use.
 */
export const useCloudRuntime = (
  options: UseCloudRuntimeOptions,
): AssistantRuntime => {
  const opts = options.cloud.runs.__internal_getAssistantOptions(
    options.assistantId,
  );

  return useDataStreamRuntime({
    ...options,
    ...opts,
  });
};
