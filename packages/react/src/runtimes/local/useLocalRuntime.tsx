"use client";

import { useInsertionEffect, useMemo, useState } from "react";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { LocalRuntimeCore } from "./LocalRuntimeCore";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { ThreadRuntime } from "../../api/ThreadRuntime";

export class LocalRuntime extends AssistantRuntime {
  constructor(private core: LocalRuntimeCore) {
    super(core, ThreadRuntime);
  }

  public reset(options?: Parameters<LocalRuntimeCore["reset"]>[0]) {
    this.core.reset(options);
  }
}

export const useLocalRuntime = (
  adapter: ChatModelAdapter,
  options: LocalRuntimeOptions = {},
) => {
  const [runtime] = useState(() => new LocalRuntimeCore(adapter, options));

  useInsertionEffect(() => {
    runtime.thread.adapter = adapter;
    runtime.thread.options = options;
  });

  return useMemo(() => new LocalRuntime(runtime), [runtime]);
};
