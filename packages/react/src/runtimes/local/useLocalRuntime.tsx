"use client";

import { useInsertionEffect, useState } from "react";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { LocalRuntime } from "./LocalRuntime";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";

export const useLocalRuntime = (
  adapter: ChatModelAdapter,
  options?: LocalRuntimeOptions,
) => {
  const [runtime] = useState(() => new LocalRuntime(adapter, options));

  useInsertionEffect(() => {
    runtime.adapter = adapter;
  });

  return runtime;
};
