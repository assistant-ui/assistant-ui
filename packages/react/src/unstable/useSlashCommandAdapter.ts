"use client";

import { useMemo, useRef } from "react";
import type {
  Unstable_TriggerAdapter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import type { Unstable_IconComponent } from "./useMentionAdapter";

export type Unstable_SlashCommand = {
  readonly id: string;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly icon?: string | undefined;
  readonly execute: () => void;
};

export type Unstable_UseSlashCommandAdapterOptions = {
  readonly commands: readonly Unstable_SlashCommand[];
  /** Strip the trigger text from the composer after executing. @default false */
  readonly removeOnExecute?: boolean | undefined;
  /** Maps `metadata.icon` / `category.id` string keys to React components. */
  readonly iconMap?: Record<string, Unstable_IconComponent>;
  /** Fallback icon when no entry in `iconMap` matches. */
  readonly fallbackIcon?: Unstable_IconComponent;
};

export type Unstable_SlashCommandAction = {
  readonly onExecute: (item: Unstable_TriggerItem) => void;
  readonly removeOnExecute?: boolean | undefined;
};

/**
 * @deprecated Under active development and may change without notice.
 *
 * Bundles slash command definitions (with inline `execute` callbacks) into
 * `{adapter, action}` that plug directly into `ComposerTriggerPopover`.
 * `execute` stays in the hook closure and is never attached to the returned
 * `TriggerItem`, keeping items serializable.
 *
 * @example
 * ```tsx
 * const slash = unstable_useSlashCommandAdapter({
 *   commands: [
 *     { id: "summarize", execute: () => runSummarize(), icon: "FileText" },
 *     { id: "translate", execute: () => runTranslate(), icon: "Languages" },
 *   ],
 * });
 *
 * <ComposerTriggerPopover char="/" {...slash} />
 * ```
 */
export function unstable_useSlashCommandAdapter(
  options: Unstable_UseSlashCommandAdapterOptions,
): {
  adapter: Unstable_TriggerAdapter;
  action: Unstable_SlashCommandAction;
  iconMap?: Record<string, Unstable_IconComponent>;
  fallbackIcon?: Unstable_IconComponent;
} {
  const { commands, removeOnExecute } = options;

  // biome-ignore lint/correctness/useHookAtTopLevel: `unstable_` prefix not recognized as hook
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  // biome-ignore lint/correctness/useHookAtTopLevel: `unstable_` prefix not recognized as hook
  return useMemo(() => {
    const adapter: Unstable_TriggerAdapter = {
      categories: () => [],
      categoryItems: () => [],
      search: (query: string) => {
        const lower = query.toLowerCase();
        return commandsRef.current
          .filter((c) => matchesQuery(c, lower))
          .map(toItem);
      },
    };

    const action: Unstable_SlashCommandAction = {
      onExecute: (item) => {
        commandsRef.current.find((c) => c.id === item.id)?.execute();
      },
      ...(removeOnExecute !== undefined ? { removeOnExecute } : {}),
    };

    return {
      adapter,
      action,
      ...(options.iconMap ? { iconMap: options.iconMap } : {}),
      ...(options.fallbackIcon ? { fallbackIcon: options.fallbackIcon } : {}),
    };
  }, [removeOnExecute, options.iconMap, options.fallbackIcon]);
}

function toItem(cmd: Unstable_SlashCommand): Unstable_TriggerItem {
  return {
    id: cmd.id,
    type: "command",
    label: cmd.label ?? `/${cmd.id}`,
    ...(cmd.description !== undefined ? { description: cmd.description } : {}),
    ...(cmd.icon !== undefined ? { metadata: { icon: cmd.icon } } : {}),
  };
}

function matchesQuery(cmd: Unstable_SlashCommand, lower: string): boolean {
  if (!lower) return true;
  if (cmd.id.toLowerCase().includes(lower)) return true;
  if (cmd.label?.toLowerCase().includes(lower)) return true;
  if (cmd.description?.toLowerCase().includes(lower)) return true;
  return false;
}
