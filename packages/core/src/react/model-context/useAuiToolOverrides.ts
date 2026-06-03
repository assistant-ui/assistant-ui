import { useEffect, useMemo } from "react";
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
 */
export function useAuiToolOverrides(overrides: AuiToolOverrides): void {
  const aui = useAui();
  const tools = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(overrides).map(([name, override]) => [
          name,
          {
            disabled: false,
            ...override,
          } as Tool<any, any>,
        ]),
      ),
    [overrides],
  );

  useEffect(() => {
    return aui.modelContext().register({
      getModelContext: () => ({
        priority: 1000,
        tools,
      }),
    });
  }, [aui, tools]);
}
