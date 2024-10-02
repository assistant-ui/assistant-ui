"use client";

import { useInsertionEffect, useMemo, useState } from "react";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { LocalRuntimeCore } from "./LocalRuntimeCore";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";
import { AssistantRuntimeImpl } from "../../api/AssistantRuntime";
import { ThreadRuntimeImpl } from "../../api/ThreadRuntime";

export class LocalRuntime extends AssistantRuntimeImpl {
  constructor(private core: LocalRuntimeCore) {
    super(core, ThreadRuntimeImpl);
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
