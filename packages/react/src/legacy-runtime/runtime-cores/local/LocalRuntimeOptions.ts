export type { LocalRuntimeOptionsBase } from "@assistant-ui/core";

import type { LocalRuntimeOptionsBase } from "@assistant-ui/core";
import type { ThreadMessageLike } from "@assistant-ui/core";
import type { AssistantCloud } from "assistant-cloud";

// TODO align LocalRuntimeOptions with LocalRuntimeOptionsBase
export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  cloud?: AssistantCloud | undefined;
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

export const splitLocalRuntimeOptions = <T extends LocalRuntimeOptions>(
  options: T,
) => {
  const {
    cloud,
    initialMessages,
    maxSteps,
    adapters,
    unstable_humanToolNames,
    ...rest
  } = options;

  return {
    localRuntimeOptions: {
      cloud,
      initialMessages,
      maxSteps,
      adapters,
      unstable_humanToolNames,
    },
    otherOptions: rest,
  };
};
