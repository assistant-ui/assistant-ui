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

export function useToolUIRuntime(): ToolUIRuntime | null {
  const ctx = useContext(ToolUIContext);

  if (!ctx) {
    return null;
  }

  return ctx.runtime;
}

export function useToolUIRenderer(): ToolUIRendererManager | null {
  const ctx = useContext(ToolUIContext);

  if (!ctx) {
    return null;
  }

  return ctx.renderer;
}
