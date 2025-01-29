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
import { useRuntimeAdapters } from "../adapters/RuntimeAdapterProvider";

export type LocalRuntime = AssistantRuntime & {
  reset: (options?: Parameters<LocalRuntimeCore["reset"]>[0]) => void;
};

class LocalRuntimeImpl extends AssistantRuntimeImpl implements LocalRuntime {
  private constructor(private core: LocalRuntimeCore) {
    super(core, ThreadRuntimeImpl);
  }

  public override __internal_bindMethods() {
    super.__internal_bindMethods();
    this.reset = this.reset.bind(this);
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
  const threadListAdapters = useRuntimeAdapters();
  const opt = useMemo(
    () => ({
      ...options,
      adapters: {
        ...threadListAdapters,
        ...options.adapters,
        chatModel: adapter,
      },
    }),
    [adapter, options, threadListAdapters],
  );

  const [runtime] = useState(() => new LocalRuntimeCore(opt, initialMessages));

  useEffect(() => {
    runtime.threads.getMainThreadRuntimeCore().__internal_setOptions(opt);
    runtime.threads.getMainThreadRuntimeCore().__internal_load();
  }, [runtime, opt]);

  return useMemo(() => LocalRuntimeImpl.create(runtime), [runtime]);
};
