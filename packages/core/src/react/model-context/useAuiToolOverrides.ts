import { useEffect, useRef } from "react";
import { useAui } from "@assistant-ui/store";
import type { Tool } from "assistant-stream";

type AuiToolOverride<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = Partial<Tool<TArgs, TResult>>;

type AuiToolOverrides = Record<string, AuiToolOverride<any, any>>;

/**
 * Overrides toolkit entries for the current assistant scope.
 *
 * This is intended for dynamic local-state tools whose model-facing contract is
 * declared in a `"use generative"` toolkit file with `execute: stubTool()`, but
 * whose actual executor must close over React state in the mounted component.
 * Keep the override keys stable after mount; dynamic key addition/removal is not
 * currently observed.
 *
 * @deprecated Experimental, API may change.
 */
export function useAuiToolOverrides(overrides: AuiToolOverrides): void {
  const aui = useAui();
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;

  useEffect(() => {
    return aui.modelContext().register({
      getModelContext: () => ({
        priority: 1000,
        tools: overridesRef.current as Record<string, Tool<any, any>>,
      }),
    });
  }, [aui]);
}
