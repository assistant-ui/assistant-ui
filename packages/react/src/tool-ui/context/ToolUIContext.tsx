"use client";

import { createContext, useContext } from "react";
import type { ToolUIRuntime } from "@assistant-ui/tool-ui-runtime";

export const ToolUIContext = createContext<ToolUIRuntime | null>(null);

export function useToolUIRuntime(): ToolUIRuntime {
  const runtime = useContext(ToolUIContext);

  if (!runtime) {
    throw new Error("useToolUIRuntime must be used inside a <ToolUIProvider>");
  }

  return runtime;
}
