import {
  useAui,
  useAuiState,
  useToolArgsStatus,
  type Toolkit,
} from "@assistant-ui/react-native";
import { useCallback, useEffect, type ReactNode } from "react";
import type { ModelContextSource } from "../../assistant-ui/modelContext";
import type {
  ToolkitDisplay,
  ToolkitExecution,
  WidgetToolkitExtension,
} from "../../assistant-ui/extension";
import type { Catalog } from "../catalog";
import { SpecRenderer } from "../react/native";
import { specToolkitFor, type SpecToolkitOptions } from "./toolkit";

function useMessages() {
  return useAuiState((s) => s.thread.messages);
}

function useArgsComplete() {
  return useToolArgsStatus().argsStatus === "complete";
}

function Frame({
  children,
}: {
  title: string;
  streaming: boolean;
  children: ReactNode;
}) {
  return children;
}

/** The React Native spec toolkit, whose entries go into `Tools({ toolkit })` from `@assistant-ui/react-native`. */
export type NativeSpecToolkit = Omit<WidgetToolkitExtension, "entries"> & {
  entries(context: {
    execution: ToolkitExecution;
    display: ToolkitDisplay;
  }): Toolkit;
};

function useSendMessage() {
  const aui = useAui();
  return useCallback((text: string) => aui.thread.append(text), [aui]);
}

function useModelContext(source: ModelContextSource) {
  const aui = useAui();
  useEffect(
    () =>
      aui.modelContext.register({
        getModelContext: () => {
          const system = source.read();
          return system ? { system } : {};
        },
        subscribe: source.subscribe,
      }),
    [aui, source],
  );
}

const build = specToolkitFor({
  useMessages,
  useArgsComplete,
  SpecRenderer,
  Frame,
  useSendMessage,
  useModelContext,
});

/**
 * Spec mode for `@assistant-ui/react-native`: `render_spec`, which streams
 * patches into a React Native `SpecRenderer` with your components. Pass
 * `entries({ execution, display })` to `Tools({ toolkit })`, and give the
 * model the guidance of the `spec` module in `modules`.
 */
export function createSpecToolkit(
  catalog: Catalog,
  options: SpecToolkitOptions,
): NativeSpecToolkit {
  const extension = build(catalog, options);
  return {
    ...extension,
    entries: (context) => extension.entries(context) as Toolkit,
  };
}
