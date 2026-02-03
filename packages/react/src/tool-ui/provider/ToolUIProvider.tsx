"use client";

import { PropsWithChildren, useMemo, memo, useEffect } from "react";
import {
  ToolUIRendererManager,
  ToolUIRuntimeImpl,
  ToolUISandbox,
  type ToolUIRuntime,
} from "@assistant-ui/tool-ui-runtime";
import { ToolUIContext } from "../context/ToolUIContext";
import { ToolUIRegistry } from "@assistant-ui/tool-ui-runtime";

export namespace ToolUIProvider {
  export type Props = PropsWithChildren<{
    runtime?: ToolUIRuntime;
    registry?: ToolUIRegistry;
    createSandbox?: () => ToolUISandbox;
  }>;
}

type ProviderState = {
  runtime: ToolUIRuntime;
  renderer: ToolUIRendererManager;
};

function hasInternalRenderer(
  runtime: ToolUIRuntime,
): runtime is ToolUIRuntime & {
  __internal_getRenderer(): ToolUIRendererManager;
} {
  return (
    typeof runtime === "object" &&
    runtime !== null &&
    "__internal_getRenderer" in runtime &&
    typeof (runtime as any).__internal_getRenderer === "function"
  );
}

export const ToolUIProvider = memo(
  ({
    children,
    runtime: externalRuntime,
    registry,
    createSandbox,
  }: ToolUIProvider.Props) => {
    const { runtime, renderer } = useMemo<ProviderState>(() => {
      if (externalRuntime !== undefined) {
        if (!hasInternalRenderer(externalRuntime)) {
          throw new Error(
            "ToolUIProvider: external runtime must expose __internal_getRenderer() method",
          );
        }
        const runtime: ToolUIRuntime = externalRuntime;
        const renderer = (runtime as any).__internal_getRenderer();
        return { runtime, renderer };
      }

      if (!registry) {
        throw new Error(
          "ToolUIProvider: either `runtime` or `registry` must be provided",
        );
      }

      if (!createSandbox) {
        throw new Error(
          "ToolUIProvider: `createSandbox` must be provided when constructing runtime",
        );
      }

      const runtime = new ToolUIRuntimeImpl({ registry, createSandbox });
      const renderer = runtime.__internal_getRenderer();

      return { runtime, renderer };
    }, [externalRuntime, registry, createSandbox]);

    useEffect(() => {
      return () => {
        if (externalRuntime === undefined && "dispose" in runtime) {
          try {
            (runtime as any).dispose();
          } catch (error) {
            console.error("[ToolUIProvider] Failed to dispose runtime:", error);
          }
        }
      };
    }, [runtime, externalRuntime]);

    return (
      <ToolUIContext.Provider value={{ runtime, renderer }}>
        {children}
      </ToolUIContext.Provider>
    );
  },
);

ToolUIProvider.displayName = "ToolUIProvider";
