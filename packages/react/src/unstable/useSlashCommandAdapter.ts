"use client";

import { useMemo } from "react";
import type {
  Unstable_SlashCommandAdapter,
  Unstable_SlashCommandItem,
  Unstable_TriggerCategory,
} from "@assistant-ui/core";

export type Unstable_SlashCommandDefinition = {
  /** Unique command name (e.g. "summarize"). */
  readonly name: string;
  /** Display label (e.g. "/summarize"). */
  readonly label?: string | undefined;
  /** Short description shown in the popover. */
  readonly description?: string | undefined;
  /** Icon identifier. */
  readonly icon?: string | undefined;
  /** Action to execute when the command is selected. */
  readonly execute?: (() => void) | undefined;
};

export type Unstable_UseSlashCommandAdapterOptions = {
  /** List of available slash commands. */
  commands: readonly Unstable_SlashCommandDefinition[];
};

/**
 * @deprecated This API is still under active development and might change without notice.
 *
 * Creates a SlashCommandAdapter from a list of command definitions.
 *
 * @example
 * ```tsx
 * const slashAdapter = unstable_useSlashCommandAdapter({
 *   commands: [
 *     { name: "summarize", description: "Summarize the conversation", execute: () => {} },
 *     { name: "translate", description: "Translate text", execute: () => {} },
 *   ],
 * });
 * ```
 */
export function unstable_useSlashCommandAdapter(
  options: Unstable_UseSlashCommandAdapterOptions,
): Unstable_SlashCommandAdapter {
  const { commands } = options;

  return useMemo<Unstable_SlashCommandAdapter>(() => {
    // Build items lazily at call time so execute callbacks are always fresh
    const getItems = (): Unstable_SlashCommandItem[] =>
      commands.map((cmd) => ({
        id: cmd.name,
        type: "command",
        label: cmd.label ?? `/${cmd.name}`,
        description: cmd.description,
        icon: cmd.icon,
        execute: cmd.execute,
      }));

    return {
      // No categories — slash commands show items directly via search mode
      categories(): Unstable_TriggerCategory[] {
        return [];
      },

      categoryItems(): Unstable_SlashCommandItem[] {
        return [];
      },

      search(query: string): Unstable_SlashCommandItem[] {
        const items = getItems();
        if (!query) return items;
        const lower = query.toLowerCase();
        return items.filter(
          (item) =>
            item.id.toLowerCase().includes(lower) ||
            item.label.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower),
        );
      },
    };
  }, [commands]);
}
