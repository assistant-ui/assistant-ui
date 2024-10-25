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
import { ThreadRuntime } from "../../api/ThreadRuntime";

export type LocalRuntime = AssistantRuntime & {
  reset: (options?: Parameters<LocalRuntimeCore["reset"]>[0]) => void;
};

class LocalRuntimeImpl extends AssistantRuntimeImpl implements LocalRuntime {
  private constructor(
    private core: LocalRuntimeCore,
    thread: ThreadRuntime,
  ) {
    super(core, thread);
  }

  public reset(options?: Parameters<LocalRuntimeCore["reset"]>[0]) {
    this.core.reset(options);
  }

  public static override create(_core: LocalRuntimeCore) {
    return new LocalRuntimeImpl(
      _core,
      AssistantRuntimeImpl.createMainThreadRuntime(_core, ThreadRuntimeImpl),
    ) as LocalRuntime;
  }
}

export const useLocalRuntime = (
  adapter: ChatModelAdapter,
  options: LocalRuntimeOptions = {},
) => {
  const opt = {
    ...options,
    adapters: {
      ...options.adapters,
      chatModel: adapter,
    },
  };

  const [runtime] = useState(() => new LocalRuntimeCore(opt));

  useEffect(() => {
    runtime.setOptions(opt);
  });

  return useMemo(() => LocalRuntimeImpl.create(runtime), [runtime]);
};
