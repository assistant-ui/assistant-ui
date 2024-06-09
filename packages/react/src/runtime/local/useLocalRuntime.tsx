"use client";

import { useInsertionEffect, useState } from "react";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { LocalRuntime } from "./LocalRuntime";

export const useLocalRuntime = (adapter: ChatModelAdapter) => {
  const [runtime] = useState(() => new LocalRuntime(adapter));

  useInsertionEffect(() => {
    runtime.adapter = adapter;
  });

  return runtime;
};
