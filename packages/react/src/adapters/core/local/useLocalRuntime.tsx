"use client";

import { useState } from "react";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { LocalRuntime } from "./LocalRuntime";

export const useLocalRuntime = (adapter: ChatModelAdapter) => {
  const [runtime] = useState(() => new LocalRuntime(adapter));
  runtime.adapter = adapter;
  return runtime;
};
