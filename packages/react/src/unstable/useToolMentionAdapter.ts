"use client";

import { useMemo } from "react";
import { useAui } from "@assistant-ui/store";
import type {
  Unstable_MentionAdapter,
  Unstable_MentionCategory,
  Unstable_MentionItem,
} from "@assistant-ui/core";

export type Unstable_ToolMentionAdapterOptions = {
  /**
   * Explicit list of tools to show in the mention picker.
   * If provided, model context tools are NOT included unless
   * `includeModelContextTools` is true.
   */
  tools?: readonly Unstable_MentionItem[] | undefined;

  /**
   * Include tools from the model context (registered via useAssistantTool).
   * Defaults to true when `tools` is not provided, false otherwise.
   */
  includeModelContextTools?: boolean | undefined;

  /**
   * Custom function to format the display label for a tool.
   * Receives the tool name (id) and returns the display label.
   *
   * @example
   * ```ts
   * formatLabel: (name) => name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
   * // "get_current_weather" → "Get Current Weather"
   * ```
   */
  formatLabel?: ((toolName: string) => string) | undefined;

  /** Custom label for the tools category. @default "Tools" */
  categoryLabel?: string | undefined;
};

/**
 * @deprecated This API is still under active development and might change without notice.
 *
 * Creates a MentionAdapter for tools. When a user types `@`, they see
 * available tools and can mention them to hint the LLM to use a specific tool.
 *
 * @example
 * ```tsx
 * const mentionAdapter = unstable_useToolMentionAdapter({
 *   formatLabel: (name) => name.replaceAll("_", " "),
 * });
 * ```
 */
export function unstable_useToolMentionAdapter(
  options?: Unstable_ToolMentionAdapterOptions,
): Unstable_MentionAdapter {
  const aui = useAui();
  const explicitTools = options?.tools;
  const includeModelContext =
    options?.includeModelContextTools ?? !explicitTools;
  const formatLabel = options?.formatLabel;
  const categoryLabel = options?.categoryLabel;

  return useMemo<Unstable_MentionAdapter>(() => {
    const getTools = (): Unstable_MentionItem[] => {
      const items: Unstable_MentionItem[] = [];

      if (explicitTools) {
        items.push(...explicitTools);
      }

      if (includeModelContext) {
        const context = aui.thread().getModelContext();
        const tools = context.tools;
        if (tools) {
          for (const [name, tool] of Object.entries(tools)) {
            if (!items.some((i) => i.id === name)) {
              items.push({
                id: name,
                type: "tool",
                label: formatLabel ? formatLabel(name) : name,
                description: tool.description ?? undefined,
              });
            }
          }
        }
      }

      return items;
    };

    return {
      categories(): Unstable_MentionCategory[] {
        return [
          { id: "tools", label: categoryLabel ?? "Tools", icon: undefined },
        ];
      },

      categoryItems(_categoryId: string): Unstable_MentionItem[] {
        return getTools();
      },

      search(query: string): Unstable_MentionItem[] {
        const lower = query.toLowerCase();
        return getTools().filter(
          (item) =>
            item.id.toLowerCase().includes(lower) ||
            item.label.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower),
        );
      },
    };
  }, [aui, explicitTools, includeModelContext, formatLabel, categoryLabel]);
}
