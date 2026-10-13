import { useAui, useAuiState, useToolArgsStatus } from "@assistant-ui/react";
import { useCallback, useEffect, type ReactNode } from "react";
import type { ModelContextSource } from "../../assistant-ui/modelContext";
import type { WidgetToolkitExtension } from "../../assistant-ui/extension";
import type { Catalog } from "../catalog";
import { SpecRenderer } from "../react/SpecRenderer";
import { writeClipboard } from "./thread";
import { specToolkitFor, type SpecToolkitOptions } from "./toolkit";

function useMessages() {
  return useAuiState((s) => s.thread.messages);
}

function useArgsComplete() {
  return useToolArgsStatus().argsStatus === "complete";
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return <div data-gf-spec={title || undefined}>{children}</div>;
}

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
  copyText: writeClipboard,
});

/**
 * Spec mode for `createWidgetToolkit({ spec })`: adds `render_spec`, which
 * streams patches into a `<SpecRenderer>` with your components, and the
 * `spec` module of `read_me`.
 */
export function createSpecToolkit(
  catalog: Catalog,
  options: SpecToolkitOptions,
): WidgetToolkitExtension {
  return build(catalog, options);
}
