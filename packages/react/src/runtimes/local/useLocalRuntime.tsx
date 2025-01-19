"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { LocalRuntimeCore } from "./LocalRuntimeCore";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";
import {
  AssistantRuntime,
  AssistantRuntimeImpl,
} from "../../api/AssistantRuntime";
import { ThreadRuntimeImpl } from "../../internal";

export type LocalRuntime = AssistantRuntime & {
  reset: (options?: Parameters<LocalRuntimeCore["reset"]>[0]) => void;
};

class LocalRuntimeImpl extends AssistantRuntimeImpl implements LocalRuntime {
  private constructor(private core: LocalRuntimeCore) {
    super(core, ThreadRuntimeImpl);
  }

  public reset(options?: Parameters<LocalRuntimeCore["reset"]>[0]) {
    this.core.reset(options);
  }

  public static override create(_core: LocalRuntimeCore): LocalRuntime {
    return new LocalRuntimeImpl(_core);
  }
}

export const useLocalRuntime = (
  adapter: ChatModelAdapter,
  { initialMessages, ...options }: LocalRuntimeOptions = {},
) => {
  const opt = {
    ...options,
    adapters: {
      ...options.adapters,
      chatModel: adapter,
    },
  };

  const [runtime] = useState(() => new LocalRuntimeCore(opt, initialMessages));

  useEffect(() => {
    runtime.threads.getMainThreadRuntimeCore().__internal_setOptions(opt);
  }, [runtime, opt]);

  return useMemo(() => LocalRuntimeImpl.create(runtime), [runtime]);
};
