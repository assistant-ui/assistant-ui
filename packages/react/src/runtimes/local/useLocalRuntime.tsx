"use client";

import { useInsertionEffect, useState } from "react";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { LocalRuntime, LocalRuntimeOptions } from "./LocalRuntime";


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
