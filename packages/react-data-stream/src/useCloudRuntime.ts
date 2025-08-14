import { AssistantCloud } from "@assistant-ui/react";
import {
  useDataStreamRuntime,
  UseDataStreamRuntimeOptions,
} from "./useDataStreamRuntime";

type UseCloudRuntimeOptions = Omit<UseDataStreamRuntimeOptions, "api"> & {
  cloud: AssistantCloud;
  assistantId: string;
};

/**
 * @deprecated This is under active development and not yet ready for prod use.
 */
export const useCloudRuntime = (options: UseCloudRuntimeOptions) => {
  const opts = options.cloud.runs.__internal_getAssistantOptions(
    options.assistantId,
  );

  return useDataStreamRuntime({
    ...options,
    ...opts,
  });
};
