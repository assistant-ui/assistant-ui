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
  tools?: readonly Unstable_MentionItem[];

  /**
   * Include tools from the model context (registered via useAssistantTool).
   * Defaults to true when `tools` is not provided, false otherwise.
   */
  includeModelContextTools?: boolean;
};

/**
 * @deprecated This API is still under active development and might change without notice.
 *
 * Creates a MentionAdapter for tools. When a user types `@`, they see
 * available tools and can mention them to hint the LLM to use a specific tool.
 *
 * By default, reads from registered tools in the model context.
 * You can also pass an explicit list of tools.
 *
 * @example
 * ```tsx
 * // Auto-detect from model context
 * const mentionAdapter = unstable_useToolMentionAdapter();
 *
 * // Explicit tools
 * const mentionAdapter = unstable_useToolMentionAdapter({
 *   tools: [
 *     { id: "get_weather", type: "tool", label: "get_weather", description: "Get the current weather" },
 *   ],
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
                label: name,
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
          {
            id: "tools",
            label: "Tools",
            icon: undefined,
          },
        ];
      },

      categoryItems(_categoryId: string): Unstable_MentionItem[] {
        return getTools();
      },

      search(query: string): Unstable_MentionItem[] {
        const lower = query.toLowerCase();
        return getTools().filter(
          (item) =>
            item.label.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower),
        );
      },
    };
  }, [aui, explicitTools, includeModelContext]);
}
