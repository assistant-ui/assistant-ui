import { useEffect, useMemo, useState } from "react";
import type {
  AssistantRuntime,
  ChatModelAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import type { LocalRuntimeOptionsBase } from "@assistant-ui/core/internal";
import { AssistantRuntimeImpl } from "@assistant-ui/core/internal";
import { InMemoryRuntimeCore } from "./InMemoryRuntimeCore";
import type { TitleGenerationAdapter } from "../adapters/TitleGenerationAdapter";

export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
};

export const useLocalRuntime = (
  chatModel: ChatModelAdapter,
  options: LocalRuntimeOptions = {},
): AssistantRuntime => {
  const { initialMessages, titleGenerator, ...restOptions } = options;

  const opt: LocalRuntimeOptionsBase = {
    ...restOptions,
    adapters: {
      ...restOptions.adapters,
      chatModel,
    },
  };

  const [core] = useState(
    () => new InMemoryRuntimeCore(opt, initialMessages, { titleGenerator }),
  );

  useEffect(() => {
    core.threads.getMainThreadRuntimeCore().__internal_setOptions(opt);
    core.threads.getMainThreadRuntimeCore().__internal_load();
  });

  return useMemo(() => new AssistantRuntimeImpl(core), [core]);
};
