"use client";

import { PropsWithChildren, useMemo, memo } from "react";
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
    /**
     * Optional externally created runtime.
     * If ommited, a default runtime is created
     */
    runtime?: ToolUIRuntime;
    /**
     * Required when runtime is not provided
     */
    registry?: ToolUIRegistry;
    /**
     * Required when runtime is not provided
     */
    createSandbox?: () => ToolUISandbox;
  }>;
}

type ProviderState = {
  runtime: ToolUIRuntime;
  renderer: ToolUIRendererManager;
};

export const ToolUIProvider = memo(
  ({
    children,
    runtime: externalRuntime,
    registry,
    createSandbox,
  }: ToolUIProvider.Props) => {
    const { runtime, renderer } = useMemo<ProviderState>(() => {
      if (externalRuntime !== undefined) {
        const runtime: ToolUIRuntime = externalRuntime;
        const renderer = (runtime as any).__internal_getRenderer();
        return {
          runtime,
          renderer,
        };
      }

      if (!registry) {
        throw new Error(
          "ToolUIProvider: either `runtime` or `registry` must be provided",
        );
      }

      if (!createSandbox) {
        throw new Error(
          "ToolUIProvider: `createSanbox` must be provided when constructing runtime",
        );
      }

      const runtime = new ToolUIRuntimeImpl({
        registry,
        createSandbox,
      });

      const renderer = runtime.__internal_getRenderer();

      return { runtime, renderer };
    }, [externalRuntime, registry, createSandbox]);

    return (
      <ToolUIContext.Provider value={{ runtime, renderer }}>
        {children}
      </ToolUIContext.Provider>
    );
  },
);
ToolUIProvider.displayName = "ToolUIProvider";
