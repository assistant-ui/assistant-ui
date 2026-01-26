"use client";

import { createContext, useContext } from "react";
import type {
  ToolUIRendererManager,
  ToolUIRuntime,
} from "@assistant-ui/tool-ui-runtime";

export type ToolUIContextValue = {
  readonly runtime: ToolUIRuntime;
  readonly renderer: ToolUIRendererManager;
};

export const ToolUIContext = createContext<ToolUIContextValue | null>(null);

export function useToolUIRuntime(): ToolUIRuntime {
  const ctx = useContext(ToolUIContext);

  if (!ctx) {
    throw new Error("useToolUIRuntime must be used inside a <ToolUIProvider>");
  }

  return ctx.runtime;
}

export function useToolUIRenderer(): ToolUIRendererManager {
  const ctx = useContext(ToolUIContext);

  if (!ctx) {
    throw new Error("useToolUIRenderer must be used inside a <ToolUIProvider>");
  }

  return ctx.renderer;
}
