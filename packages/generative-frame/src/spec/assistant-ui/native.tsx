import { useAuiState, useToolArgsStatus } from "@assistant-ui/react-native";
import type { ReactNode } from "react";
import type { WidgetToolkitExtension } from "../../assistant-ui/extension";
import type { Catalog } from "../catalog";
import { SpecRenderer } from "../react/native";
import { specToolkitFor, type SpecToolkitOptions } from "./toolkit";

function useMessages() {
  return useAuiState((s) => s.thread.messages);
}

function useArgsComplete() {
  return useToolArgsStatus().argsStatus === "complete";
}

function Frame({ children }: { title: string; children: ReactNode }) {
  return children;
}

const build = specToolkitFor({
  useMessages,
  useArgsComplete,
  SpecRenderer,
  Frame,
});

/**
 * Spec mode for `@assistant-ui/react-native`: `render_spec`, which streams
 * patches into a React Native `SpecRenderer` with your components. Pass
 * `entries({ execution, display })` to your toolkit, and give the model
 * `catalog.prompt()`, or use the `spec` module in `modules` as guidance.
 */
export function createSpecToolkit(
  catalog: Catalog,
  options: SpecToolkitOptions,
): WidgetToolkitExtension {
  return build(catalog, options);
}
