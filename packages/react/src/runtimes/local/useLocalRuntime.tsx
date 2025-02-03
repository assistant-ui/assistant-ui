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
import { useRemoteThreadListRuntime } from "../remote-thread-list/useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "../remote-thread-list/adapter/cloud";

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

const useLocalThreadRuntime = (
  adapter: ChatModelAdapter,
  { initialMessages, ...options }: LocalRuntimeOptions,
) => {
  const { modelContext, ...threadListAdapters } = useRuntimeAdapters() ?? {};
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

  useEffect(() => {
    if (!modelContext) return undefined;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);

  return useMemo(() => LocalRuntimeImpl.create(runtime), [runtime]);
};

export const useLocalRuntime = (
  adapter: ChatModelAdapter,
  { cloud, ...options }: LocalRuntimeOptions = {},
) => {
  const cloudAdapter = useCloudThreadListAdapter({ cloud });
  return useRemoteThreadListRuntime({
    runtimeHook: () => useLocalThreadRuntime(adapter, options),
    adapter: cloudAdapter,
  });
};
