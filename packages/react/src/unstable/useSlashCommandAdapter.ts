"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
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

  const commandsRef = useRef(commands);
  const committedItemsRef = useRef<readonly Unstable_TriggerItem[]>(undefined);
  const nextItems = commands.map(toItem);
  // A referential cache, never state: `items` is always structurally equal to
  // `nextItems`, so the render-time read cannot change what the adapter shows.
  const items = areTriggerItemsEqual(committedItemsRef.current, nextItems)
    ? committedItemsRef.current
    : nextItems;

  // The adapter's callbacks must only observe commands from committed renders.
  useLayoutEffect(() => {
    commandsRef.current = commands;
    committedItemsRef.current = items;
  }, [commands, items]);

  const adapter = useMemo<Unstable_TriggerAdapter>(
    () => ({
      categories: () => [],
      categoryItems: () => [],
      search: (query: string) => {
        const lower = query.toLowerCase();
        return items.filter((item) => matchesQuery(item, lower));
      },
    }),
    [items],
  );

  const action = useMemo<Unstable_SlashCommandAction>(
    () => ({
      onExecute: (item) => {
        commandsRef.current.find((c) => c.id === item.id)?.execute();
      },
      ...(removeOnExecute !== undefined ? { removeOnExecute } : {}),
    }),
    [removeOnExecute],
  );

  return useMemo(
    () => ({
      adapter,
      action,
      ...(options.iconMap ? { iconMap: options.iconMap } : {}),
      ...(options.fallbackIcon ? { fallbackIcon: options.fallbackIcon } : {}),
    }),
    [adapter, action, options.iconMap, options.fallbackIcon],
  );
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

function matchesQuery(item: Unstable_TriggerItem, lower: string): boolean {
  if (!lower) return true;
  if (item.id.toLowerCase().includes(lower)) return true;
  if (item.label.toLowerCase().includes(lower)) return true;
  if (item.description?.toLowerCase().includes(lower)) return true;
  return false;
}

function areTriggerItemsEqual(
  previous: readonly Unstable_TriggerItem[] | undefined,
  next: readonly Unstable_TriggerItem[],
): previous is readonly Unstable_TriggerItem[] {
  if (!previous || previous.length !== next.length) return false;

  return previous.every((item, index) => {
    const nextItem = next[index];
    return (
      nextItem !== undefined &&
      item.id === nextItem.id &&
      item.label === nextItem.label &&
      item.description === nextItem.description &&
      item.metadata?.icon === nextItem.metadata?.icon
    );
  });
}
