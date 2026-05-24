import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { ToolCatalog } from "../../model-context/tool-catalog";

/**
 * Registers a dynamic tool catalog. Catalog tools are NOT placed into
 * `ModelContext.tools` — they're discovered at request time via the active
 * wire-format adapter (Anthropic custom search via `tool_reference`,
 * OpenAI client-executed `tool_search`, or generic discovery wrappers).
 *
 * Pass a referentially stable `catalog` object (e.g. memoized).
 */
export function useToolCatalog(catalog: ToolCatalog): void {
  const aui = useAui();
  useEffect(() => aui.toolCatalogs().register(catalog), [aui, catalog]);
}
