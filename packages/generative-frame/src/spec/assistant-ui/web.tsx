import {
  useAssistantInstructions,
  useAui,
  useAuiState,
  useToolArgsStatus,
} from "@assistant-ui/react";
import { useCallback, type ReactNode } from "react";
import type { WidgetToolkitExtension } from "../../assistant-ui/extension";
import type { Catalog } from "../catalog";
import { SpecRenderer } from "../react/SpecRenderer";
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

function useInstruction(instruction: string | undefined) {
  useAssistantInstructions({
    instruction: instruction ?? "",
    disabled: instruction === undefined,
  });
}

const build = specToolkitFor({
  useMessages,
  useArgsComplete,
  SpecRenderer,
  Frame,
  useSendMessage,
  useInstruction,
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
